"""
database.py
PostgreSQL storage for the MMM pipeline. Schema is OWNED by Drizzle
(shared/schema.ts) and created via `npm run db:push`; this module only reads and
writes rows through psycopg2 using the DATABASE_URL environment variable.

Keyed on (date, compound_key) across all three attribution sources. The join +
stockoffer fallback logic is preserved verbatim from the original SQLite
implementation; only the SQL dialect and driver changed.
"""

import os
import re

import psycopg2
import psycopg2.extras


def get_connection():
    # The report reads the Neon behind NEON_DATABASE_URL. In the Replit workspace
    # DATABASE_URL points at the throwaway dev DB (helium), so a run there would
    # silently write to the wrong database and leave the report empty (the
    # "two-database trap"). Always prefer NEON_DATABASE_URL when present so every
    # context — Scheduled Deployment, Run Now, manual backfill — writes the report DB.
    dsn = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError("Neither NEON_DATABASE_URL nor DATABASE_URL is set")
    conn = psycopg2.connect(dsn)
    return conn


def _dict_cursor(conn):
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


def init_db():
    """Verify connectivity. Tables are managed by Drizzle, not created here."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT 1")
        print("Database connection OK")
    finally:
        conn.close()


def clear_date(date):
    """Remove all rows for a given date so we can re-insert cleanly."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("DELETE FROM mmm_ad_spend    WHERE date = %s", (date,))
            c.execute("DELETE FROM mmm_ims_revenue WHERE date = %s", (date,))
            c.execute("DELETE FROM mmm_ao_revenue  WHERE date = %s", (date,))
        conn.commit()
    finally:
        conn.close()


def upsert_daily_spend(date, google_spend, taboola_spend):
    """Persist Google + Taboola spend so it survives re-runs."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                INSERT INTO mmm_daily_spend (date, google_spend, taboola_spend)
                VALUES (%s, %s, %s)
                ON CONFLICT (date) DO UPDATE SET
                    google_spend  = EXCLUDED.google_spend,
                    taboola_spend = EXCLUDED.taboola_spend
            """, (date, google_spend, taboola_spend))
        conn.commit()
    finally:
        conn.close()


def get_daily_spend(date):
    """Retrieve persisted Google + Taboola spend for a date."""
    conn = get_connection()
    try:
        with _dict_cursor(conn) as c:
            c.execute("SELECT google_spend, taboola_spend FROM mmm_daily_spend WHERE date = %s", (date,))
            row = c.fetchone()
    finally:
        conn.close()
    if row:
        return {"google_spend": row["google_spend"], "taboola_spend": row["taboola_spend"]}
    return {"google_spend": 0.0, "taboola_spend": 0.0}


# ---------------------------------------------------------------------------
# Compound key normalisation
# ---------------------------------------------------------------------------

def _normalize_ims_key(key):
    """
    Strip IMS-specific suffixes so keys match Meta tracking:
      Step 1: strip trailing -MMDD date    meta-0220-50-Ad4-B-0429 → meta-0220-50-Ad4-B
      Step 2: strip trailing -[letter]     meta-0220-50-Ad4-B      → meta-0220-50-Ad4
              only when preceded by a digit (variant suffix, not part of key structure)

    Examples:
      meta-1104-A-Ad5-0429     → meta-1104-A-Ad5
      meta-0220-50-Ad4-B-0429  → meta-0220-50-Ad4
      meta-0120-50-Ad2-B       → meta-0120-50-Ad2
      meta-0510-6              → meta-0510-6   (6 is not MMDD, unchanged)
      meta-0106-A-Ad2          → meta-0106-A-Ad2  (A follows letter, unchanged)
      meta-0304-50-CostAd3     → meta-0304-50-CostAd3  (unchanged)
    """
    if not key:
        return key
    # Step 1: strip trailing -MMDD calendar date suffix
    m = re.match(r'^(.+)-(\d{4})$', key)
    if m:
        suffix = m.group(2)
        month, day = int(suffix[:2]), int(suffix[2:])
        if 1 <= month <= 12 and 1 <= day <= 31:
            key = m.group(1)
    # Step 2: strip trailing -[A-Za-z] variant ONLY when preceded by a digit
    # e.g. Ad4-B → Ad4  but NOT meta-0106-A (A follows a letter, structural)
    m = re.match(r'^(.+\d)-([A-Za-z])$', key)
    if m:
        key = m.group(1)
    return key


# Manual compound key aliases: ad name key → correct UTM key
# Used when meta_puller stores spend under ad-name key but IMS/AO use URL-based key
_KEY_ALIASES = {
    "meta-1230-A-Ad4": "meta-0323-A-Ad4",
    "meta-1230-A-Ad2": "meta-0323-A-Ad2",
}


def _ims_fallback_key(key):
    """
    Fallback for ads where Meta spend key doesn't match IMS/AO key.
    Returns a list of fallback keys to try in order.
    Cases handled:
      1. Stockoffer:    meta-0510-50-Ad6 → meta-0510-6
      2. Budget strip:  meta-0615-50-Ad1 → meta-0615-Ad1 (IMS drops -50-)
      3. Manual alias:  meta-1230-A-Ad4  → meta-0323-A-Ad4 (name vs UTM mismatch)
    """
    if not key:
        return []
    # Check manual aliases first
    if key in _KEY_ALIASES:
        return [_KEY_ALIASES[key]]
    m = re.match(r'^(meta-\d{4})-50-Ad(\d+)$', key)
    if m:
        return [
            f"{m.group(1)}-{m.group(2)}",    # stockoffer: meta-0510-6
            f"{m.group(1)}-Ad{m.group(2)}",  # budget strip: meta-0615-Ad1
        ]
    return []


# ---------------------------------------------------------------------------
# Insert helpers
# ---------------------------------------------------------------------------

def classify_platform(compound_key):
    """
    Tag each creative row with its traffic platform.
    Used by the dashboard to group rows in the creative table.
    """
    if not compound_key:
        return "Other"
    key = compound_key.lower()
    if key.startswith("meta-tab") or "taboola" in key:
        return "Taboola"
    elif key.startswith("bf-") or key.startswith("{") or key.startswith("google"):
        return "Google"
    elif key.startswith("meta") or key.startswith("metav2"):
        return "Meta"
    else:
        return "Other"


def _insert_ad_rows(rows, platform, normalize=False):
    """Shared insert for creative-level spend (Meta / Google) into mmm_ad_spend."""
    if not rows:
        print(f"  insert {platform} rows: no rows to insert")
        return
    prepared = []
    for r in rows:
        key = r.get("compound_key")
        if normalize:
            key = _normalize_ims_key(key)
        prepared.append({
            "date": r.get("date"),
            "platform": platform,
            "ad_id": r.get("ad_id"),
            "ad_name": r.get("ad_name"),
            "campaign_id": r.get("campaign_id"),
            "campaign_name": r.get("campaign_name"),
            "aff_id": r.get("aff_id"),
            "aff_sub": r.get("aff_sub"),
            "compound_key": key,
            "spend": r.get("spend") or 0,
            "impressions": r.get("impressions") or 0,
            "clicks": r.get("clicks") or 0,
            "link_clicks": r.get("link_clicks") or 0,
            "cpm": r.get("cpm") or 0,
            "ctr": r.get("ctr") or 0,
        })
    conn = get_connection()
    try:
        with _dict_cursor(conn) as c:
            c.executemany("""
                INSERT INTO mmm_ad_spend
                    (date, platform, ad_id, ad_name, campaign_id, campaign_name,
                     aff_id, aff_sub, compound_key, spend, impressions, clicks,
                     link_clicks, cpm, ctr)
                VALUES
                    (%(date)s, %(platform)s, %(ad_id)s, %(ad_name)s, %(campaign_id)s,
                     %(campaign_name)s, %(aff_id)s, %(aff_sub)s, %(compound_key)s,
                     %(spend)s, %(impressions)s, %(clicks)s, %(link_clicks)s,
                     %(cpm)s, %(ctr)s)
            """, prepared)
            conn.commit()
            c.execute(
                "SELECT COUNT(*) AS n, COALESCE(SUM(spend),0) AS total "
                "FROM mmm_ad_spend WHERE date=%s AND platform=%s",
                (prepared[0]["date"], platform),
            )
            row = c.fetchone()
        print(f"  DB verify mmm_ad_spend ({platform}): {row['n']} rows, ${row['total']:.2f} total")
    except Exception as e:
        conn.rollback()
        print(f"  insert {platform} rows ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()


def insert_meta_rows(rows):
    # Normalize Meta compound keys so they match IMS keys
    # (e.g. meta-0120-50-Ad2-B-0429 → meta-0120-50-Ad2)
    _insert_ad_rows(rows, platform="Meta", normalize=True)


def insert_google_rows(rows):
    # Google keys come straight from URL utm params — do NOT apply the
    # Meta-specific -MMDD / -letter normalisation to them.
    _insert_ad_rows(rows, platform="Google", normalize=False)


def insert_ims_rows(rows):
    if not rows:
        return
    prepared = []
    for r in rows:
        prepared.append({
            "date": r.get("date"),
            "aff_id": r.get("aff_id"),
            "sub_id": r.get("sub_id"),
            # Normalize compound key: strip trailing -MMDD date suffixes so IMS
            # keys match Meta tracking keys (e.g. meta-1104-A-Ad5-0429 → meta-1104-A-Ad5)
            "compound_key": _normalize_ims_key(r.get("compound_key")),
            "revenue": r.get("revenue") or 0,
            "ecpm": r.get("ecpm") or 0.0,
            "impressions": r.get("impressions") or 0,
        })
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.executemany("""
                INSERT INTO mmm_ims_revenue (date, aff_id, sub_id, compound_key, revenue, ecpm, impressions)
                VALUES (%(date)s, %(aff_id)s, %(sub_id)s, %(compound_key)s, %(revenue)s, %(ecpm)s, %(impressions)s)
            """, prepared)
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"  insert_ims_rows ERROR: {e}")
    finally:
        conn.close()


def insert_ao_rows(rows):
    if not rows:
        return
    prepared = []
    for r in rows:
        prepared.append({
            "date": r.get("date"),
            "utm_source": r.get("utm_source"),
            "utm_medium": r.get("utm_medium"),
            # Normalize compound key to match Meta/IMS keys
            "compound_key": _normalize_ims_key(r.get("compound_key")),
            "revenue": r.get("revenue") or 0,
            "epi": r.get("epi") or 0.0,
            "signups": r.get("signups") or 0,
        })
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.executemany("""
                INSERT INTO mmm_ao_revenue (date, utm_source, utm_medium, compound_key, revenue, epi, signups)
                VALUES (%(date)s, %(utm_source)s, %(utm_medium)s, %(compound_key)s, %(revenue)s, %(epi)s, %(signups)s)
            """, prepared)
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"  insert_ao_rows ERROR: {e}")
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def get_joined_performance(date=None, days=30):
    """
    Join all three sources on (date, compound_key).
    Pre-aggregates each source to prevent row multiplication.
    Applies Python-level fallback for stockoffer compound keys:
      meta-XXXX-50-AdN in Meta  →  meta-XXXX-N in IMS
    """
    conn = get_connection()
    c = _dict_cursor(conn)

    if date:
        date_filter = "WHERE k.date = %(date)s"
        params = {"date": date}
    else:
        date_filter = f"WHERE k.date >= CURRENT_DATE - INTERVAL '{int(days)} days'"
        params = {}

    query = f"""
    WITH all_keys AS (
        SELECT date, compound_key FROM mmm_ad_spend    WHERE compound_key IS NOT NULL
        UNION
        SELECT date, compound_key FROM mmm_ims_revenue WHERE compound_key IS NOT NULL
        UNION
        SELECT date, compound_key FROM mmm_ao_revenue  WHERE compound_key IS NOT NULL
    ),
    meta_agg AS (
        SELECT date, compound_key,
               SUM(spend)       AS spend,
               SUM(impressions) AS impressions,
               SUM(clicks)      AS clicks,
               MAX(ad_name)     AS ad_name,
               MAX(campaign_name) AS campaign_name,
               MAX(aff_id)      AS aff_id,
               MAX(aff_sub)     AS aff_sub,
               MAX(platform)    AS platform
        FROM mmm_ad_spend
        GROUP BY date, compound_key
    ),
    ims_agg AS (
        SELECT date, compound_key,
               SUM(revenue)     AS revenue,
               AVG(ecpm)        AS ecpm,
               SUM(impressions) AS ims_impressions
        FROM mmm_ims_revenue
        GROUP BY date, compound_key
    ),
    ao_agg AS (
        SELECT date, compound_key,
               SUM(revenue)     AS revenue,
               AVG(epi)         AS epi,
               SUM(signups)     AS signups
        FROM mmm_ao_revenue
        GROUP BY date, compound_key
    )
    SELECT
        k.date,
        k.compound_key,
        COALESCE(m.spend, 0)           AS spend,
        COALESCE(m.impressions, 0)     AS meta_impressions,
        COALESCE(m.clicks, 0)          AS clicks,
        m.platform                     AS ad_platform,
        m.ad_name,
        m.campaign_name,
        m.aff_id,
        m.aff_sub,
        COALESCE(i.revenue, 0)         AS ims_revenue,
        COALESCE(i.ecpm, 0)            AS ims_ecpm,
        COALESCE(i.ims_impressions, 0) AS ims_impressions,
        COALESCE(a.revenue, 0)         AS ao_revenue,
        COALESCE(a.epi, 0)             AS ao_epi,
        COALESCE(a.signups, 0)         AS ao_signups,
        COALESCE(i.revenue, 0) + COALESCE(a.revenue, 0) AS total_revenue,
        CASE
            WHEN COALESCE(m.spend, 0) > 0
            THEN (COALESCE(i.revenue, 0) + COALESCE(a.revenue, 0)) / m.spend
            ELSE NULL
        END AS day0_roas
    FROM all_keys k
    LEFT JOIN meta_agg m ON k.date = m.date AND k.compound_key = m.compound_key
    LEFT JOIN ims_agg  i ON k.date = i.date AND k.compound_key = i.compound_key
    LEFT JOIN ao_agg   a ON k.date = a.date AND k.compound_key = a.compound_key
    {date_filter}
    AND (COALESCE(i.revenue, 0) + COALESCE(a.revenue, 0) > 0 OR COALESCE(m.spend, 0) > 0)
    ORDER BY k.date DESC, total_revenue DESC
    """

    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    # Cast dates to ISO strings so downstream code + JSON stay string-keyed
    for r in rows:
        if r.get("date") is not None:
            r["date"] = str(r["date"])
        for numeric in ("spend", "ims_revenue", "ims_ecpm", "ao_revenue", "ao_epi",
                        "total_revenue", "day0_roas"):
            if r.get(numeric) is not None:
                r[numeric] = float(r[numeric])
    c.close()
    conn.close()

    # ------------------------------------------------------------------
    # Fallback: stockoffer compound key matching
    # meta-0510-50-Ad6 (Meta) → meta-0510-6 (IMS)
    # Only applies when the original key produced zero IMS revenue.
    # ------------------------------------------------------------------
    needs_fallback = {}
    for row in rows:
        key = row.get("compound_key")
        if (row.get("ims_revenue") or 0) == 0:
            fb = _ims_fallback_key(key)
            if fb:
                needs_fallback[key] = fb

    absorbed_keys = set()  # IMS-only rows that get absorbed into a Meta row via fallback

    if needs_fallback:
        conn2 = get_connection()
        c2 = _dict_cursor(conn2)
        for orig_key, fallback_keys in needs_fallback.items():
            # Process each date separately — multi-date views have one row per date
            orig_rows = [r for r in rows if r.get("compound_key") == orig_key]
            any_fixed = False
            for row in orig_rows:
                row_date = row.get("date")
                if not row_date:
                    continue
                # Try each fallback key in order until one has IMS data
                r = None
                norm_key = None
                for try_key in fallback_keys:
                    c2.execute("""
                        SELECT SUM(revenue)     AS revenue,
                               SUM(impressions) AS ims_impressions,
                               AVG(ecpm)        AS ecpm
                        FROM mmm_ims_revenue
                        WHERE compound_key = %s AND date = %s
                    """, (try_key, row_date))
                    candidate = c2.fetchone()
                    if candidate and candidate["revenue"]:
                        r = candidate
                        norm_key = try_key
                        break
                # Apply fallback if IMS has revenue, OR if there's AO revenue under the fallback key
                ao_fallback = None
                if norm_key:
                    c2.execute("""
                        SELECT SUM(revenue) AS ao_rev, SUM(signups) AS signups, AVG(epi) AS epi
                        FROM mmm_ao_revenue WHERE compound_key = %s AND date = %s
                    """, (norm_key, row_date))
                    ao_fb_row = c2.fetchone()
                    if ao_fb_row and (ao_fb_row["ao_rev"] or 0) > 0:
                        ao_fallback = ao_fb_row
                if (r and r["revenue"]) or ao_fallback:
                    if r and r["revenue"]:
                        pass  # will apply below
                    elif ao_fallback and not (r and r["revenue"]):
                        r = None  # no IMS to apply but we still log the fallback
                if r and r["revenue"]:
                    row["ims_revenue"]     = float(r["revenue"] or 0)
                    row["ims_impressions"] = int(r["ims_impressions"] or 0)
                    row["ims_ecpm"]        = float(r["ecpm"] or 0)
                    row["total_revenue"]   = float((r["revenue"] or 0) + (row.get("ao_revenue") or 0))
                    spend = row.get("spend") or 0
                    row["day0_roas"] = round(row["total_revenue"] / spend, 4) if spend else None
                    print(f"  DB fallback: {orig_key} → {norm_key}  ims_rev=${float(r['revenue']):.2f}  ({row_date})")
                    any_fixed = True
                # Apply AO fallback even if IMS was $0
                if ao_fallback and norm_key and (row.get("ao_revenue") or 0) == 0:
                    row["ao_revenue"] = float(ao_fallback["ao_rev"] or 0)
                    row["ao_signups"] = int(ao_fallback["signups"] or 0)
                    row["ao_epi"]     = float(ao_fallback["epi"] or 0)
                    any_fixed = True
                    if not (r and r["revenue"]):
                        print(f"  DB fallback (AO): {orig_key} → {norm_key}  ao_rev=${float(ao_fallback['ao_rev']):.2f}  ({row_date})")
            if any_fixed:
                # Remove all standalone IMS-only rows for this normalised key
                absorbed_keys.add(norm_key)
        c2.close()
        conn2.close()

    # Remove standalone IMS-only rows whose revenue was absorbed into a Meta row above.
    # Without this they'd be double-counted (once as meta-0510-6, once as meta-0510-50-Ad6).
    if absorbed_keys:
        rows = [r for r in rows
                if not (r.get("compound_key") in absorbed_keys
                        and (r.get("spend") or 0) == 0)]

    # Tag each row with its traffic platform for grouping. Prefer the stored
    # platform from mmm_ad_spend (authoritative for creative-level Meta/Google
    # rows); fall back to key-pattern classification for revenue-only rows.
    for row in rows:
        row["platform"] = row.pop("ad_platform", None) or classify_platform(row.get("compound_key"))

    return rows


def assign_platform_spend_to_rows(performance, google_spend, taboola_spend):
    """
    Assign platform-level (sheet) spend to platform creative rows so they show ROAS.
    Google spend → bf-{...} rows (all Google spend to the one Google creative).
    Taboola spend → meta-Tab-* rows (distributed by IMS impressions).
    Only rows with spend == 0 receive an allocation — creative-level Google Ads
    spend (already > 0) is left untouched to avoid double counting.
    """
    # Google: assign total google_spend to all Google-platform rows
    google_rows = [r for r in performance if r.get("platform") == "Google" and (r.get("spend") or 0) == 0]
    if google_rows and google_spend > 0:
        if len(google_rows) == 1:
            google_rows[0]["spend"] = round(google_spend, 2)
        else:
            total_imps = sum(r.get("ims_impressions") or 0 for r in google_rows) or 1
            for r in google_rows:
                share = (r.get("ims_impressions") or 0) / total_imps
                r["spend"] = round(google_spend * share, 2)
        for r in google_rows:
            spend = r.get("spend") or 0
            rev   = r.get("total_revenue") or 0
            adj   = r.get("adjusted_revenue") or 0
            if spend > 0:
                r["day0_roas"]    = round(rev / spend, 4)
                r["adjusted_roas"] = round(adj / spend, 4)

    # Taboola: distribute taboola_spend across meta-Tab rows by IMS impressions
    tab_rows = [r for r in performance if r.get("platform") == "Taboola" and (r.get("spend") or 0) == 0]
    if tab_rows and taboola_spend > 0:
        total_imps = sum(r.get("ims_impressions") or 0 for r in tab_rows) or 1
        for r in tab_rows:
            share = (r.get("ims_impressions") or 0) / total_imps
            r["spend"] = round(taboola_spend * share, 2)
            spend = r.get("spend") or 0
            rev   = r.get("total_revenue") or 0
            adj   = r.get("adjusted_revenue") or 0
            if spend > 0:
                r["day0_roas"]    = round(rev / spend, 4)
                r["adjusted_roas"] = round(adj / spend, 4)

    return performance


def get_daily_summary(days=30):
    """Aggregate by date for trend charts. Includes Google+Taboola from mmm_daily_spend."""
    conn = get_connection()
    c = _dict_cursor(conn)

    c.execute(f"""
    WITH all_keys AS (
        SELECT date, compound_key FROM mmm_ad_spend    WHERE compound_key IS NOT NULL
        UNION
        SELECT date, compound_key FROM mmm_ims_revenue WHERE compound_key IS NOT NULL
        UNION
        SELECT date, compound_key FROM mmm_ao_revenue  WHERE compound_key IS NOT NULL
    ),
    meta_agg AS (
        SELECT date, compound_key, SUM(spend) AS spend, SUM(impressions) AS impressions
        FROM mmm_ad_spend GROUP BY date, compound_key
    ),
    ims_agg AS (
        SELECT date, compound_key, SUM(revenue) AS revenue, SUM(impressions) AS ims_impressions
        FROM mmm_ims_revenue GROUP BY date, compound_key
    ),
    ao_agg AS (
        SELECT date, compound_key, SUM(revenue) AS revenue
        FROM mmm_ao_revenue GROUP BY date, compound_key
    )
    SELECT
        k.date,
        COALESCE(SUM(m.spend), 0)
            + COALESCE(MAX(ds.google_spend), 0)
            + COALESCE(MAX(ds.taboola_spend), 0) AS total_spend,
        COALESCE(SUM(m.spend), 0)               AS meta_spend,
        COALESCE(MAX(ds.google_spend), 0)        AS google_spend,
        COALESCE(MAX(ds.taboola_spend), 0)       AS taboola_spend,
        COALESCE(SUM(m.impressions), 0)          AS total_impressions,
        COALESCE(SUM(i.ims_impressions), 0)      AS total_ims_impressions,
        COALESCE(SUM(i.revenue), 0) + COALESCE(SUM(a.revenue), 0) AS total_revenue,
        CASE
            WHEN (COALESCE(SUM(m.spend), 0)
                  + COALESCE(MAX(ds.google_spend), 0)
                  + COALESCE(MAX(ds.taboola_spend), 0)) > 0
            THEN (COALESCE(SUM(i.revenue), 0) + COALESCE(SUM(a.revenue), 0))
                 / (COALESCE(SUM(m.spend), 0)
                    + COALESCE(MAX(ds.google_spend), 0)
                    + COALESCE(MAX(ds.taboola_spend), 0))
            ELSE NULL
        END AS day0_roas,
        COUNT(DISTINCT k.compound_key) AS active_creatives
    FROM all_keys k
    LEFT JOIN meta_agg   m  ON k.date = m.date AND k.compound_key = m.compound_key
    LEFT JOIN ims_agg    i  ON k.date = i.date AND k.compound_key = i.compound_key
    LEFT JOIN ao_agg     a  ON k.date = a.date AND k.compound_key = a.compound_key
    LEFT JOIN mmm_daily_spend ds ON k.date = ds.date
    WHERE k.date >= CURRENT_DATE - INTERVAL '{int(days)} days'
    GROUP BY k.date
    ORDER BY k.date ASC
    """)

    rows = [dict(r) for r in c.fetchall()]
    for r in rows:
        if r.get("date") is not None:
            r["date"] = str(r["date"])
    c.close()
    conn.close()
    return rows


def get_meta_creative_deep_dive(as_of_date=None):
    """
    Per-creative Meta analysis: last 7D vs previous 7D.
    Metrics: CPM, link click CTR, conversion rate (leads/link_clicks).
    Only includes Meta-platform rows with spend > 0.
    """
    from datetime import datetime, timedelta
    if not as_of_date:
        as_of_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    conn = get_connection()
    c = _dict_cursor(conn)

    def fetch_window(start, end):
        c.execute("""
            SELECT
                m.compound_key,
                SUM(m.spend)       AS spend,
                SUM(m.impressions) AS impressions,
                SUM(COALESCE(m.link_clicks, 0)) AS link_clicks,
                SUM(a.signups)     AS signups
            FROM mmm_ad_spend m
            LEFT JOIN (
                SELECT compound_key, date, SUM(signups) AS signups
                FROM mmm_ao_revenue GROUP BY compound_key, date
            ) a ON m.compound_key = a.compound_key AND m.date = a.date
            WHERE m.date BETWEEN %s AND %s
              AND m.compound_key IS NOT NULL
            GROUP BY m.compound_key
            HAVING SUM(m.spend) > 0
        """, (start, end))
        rows = {}
        for r in c.fetchall():
            key = r["compound_key"]
            spend      = r["spend"] or 0
            imps       = r["impressions"] or 0
            lc         = r["link_clicks"] or 0
            signups    = r["signups"] or 0
            rows[key] = {
                "spend":       round(float(spend), 2),
                "impressions": int(imps),
                "link_clicks": int(lc),
                "signups":     int(signups),
                "cpm":         round((spend / imps * 1000), 2) if imps > 0 else 0,
                "ctr":         round((lc / imps * 100), 4)     if imps > 0 else 0,
                "conv_rate":   round((signups / lc * 100), 4)  if lc > 0 else 0,
            }
        return rows

    end_curr  = as_of_date
    start_curr = (datetime.strptime(as_of_date, "%Y-%m-%d") - timedelta(days=6)).strftime("%Y-%m-%d")
    end_prev   = (datetime.strptime(as_of_date, "%Y-%m-%d") - timedelta(days=7)).strftime("%Y-%m-%d")
    start_prev = (datetime.strptime(as_of_date, "%Y-%m-%d") - timedelta(days=13)).strftime("%Y-%m-%d")

    curr = fetch_window(start_curr, end_curr)
    prev = fetch_window(start_prev, end_prev)
    c.close()
    conn.close()

    def pct_change(new_val, old_val):
        if old_val and old_val != 0:
            return round((new_val - old_val) / abs(old_val) * 100, 1)
        return None

    results = []
    for key in curr:
        c_row = curr[key]
        p_row = prev.get(key, {})
        results.append({
            "compound_key":     key,
            "spend_7d":         c_row["spend"],
            "impressions_7d":   c_row["impressions"],
            "link_clicks_7d":   c_row["link_clicks"],
            "signups_7d":       c_row["signups"],
            "cpm_7d":           c_row["cpm"],
            "ctr_7d":           c_row["ctr"],
            "conv_rate_7d":     c_row["conv_rate"],
            "cpm_prev":         p_row.get("cpm", None),
            "ctr_prev":         p_row.get("ctr", None),
            "conv_rate_prev":   p_row.get("conv_rate", None),
            "cpm_delta_pct":    pct_change(c_row["cpm"],       p_row.get("cpm")),
            "ctr_delta_pct":    pct_change(c_row["ctr"],       p_row.get("ctr")),
            "conv_delta_pct":   pct_change(c_row["conv_rate"], p_row.get("conv_rate")),
        })

    results.sort(key=lambda x: x["spend_7d"], reverse=True)
    return {
        "window_curr":  f"{start_curr} → {end_curr}",
        "window_prev":  f"{start_prev} → {end_prev}",
        "creatives":    results,
    }


# ---------------------------------------------------------------------------
# Relational snapshot writers (consumed by the Node dashboard)
# ---------------------------------------------------------------------------

def write_performance_daily(date, performance):
    """Persist the post-fallback joined performance rows for a date."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("DELETE FROM mmm_performance_daily WHERE date = %s", (date,))
            prepared = [{
                "date": date,
                "compound_key": r.get("compound_key"),
                "platform": r.get("platform") or "Other",
                "ad_name": r.get("ad_name"),
                "campaign_name": r.get("campaign_name"),
                "spend": r.get("spend") or 0,
                "impressions": r.get("meta_impressions") or 0,
                "clicks": r.get("clicks") or 0,
                "ims_revenue": r.get("ims_revenue") or 0,
                "ims_impressions": r.get("ims_impressions") or 0,
                "ao_revenue": r.get("ao_revenue") or 0,
                "ao_signups": r.get("ao_signups") or 0,
                "total_revenue": r.get("total_revenue") or 0,
                "gross_allocated": r.get("gross_allocated") or 0,
                "adjusted_revenue": r.get("adjusted_revenue") or 0,
                "day0_roas": r.get("day0_roas"),
                "adjusted_roas": r.get("adjusted_roas"),
            } for r in performance if r.get("compound_key")]
            if prepared:
                c.executemany("""
                    INSERT INTO mmm_performance_daily
                        (date, compound_key, platform, ad_name, campaign_name, spend,
                         impressions, clicks, ims_revenue, ims_impressions, ao_revenue,
                         ao_signups, total_revenue, gross_allocated, adjusted_revenue,
                         day0_roas, adjusted_roas)
                    VALUES
                        (%(date)s, %(compound_key)s, %(platform)s, %(ad_name)s,
                         %(campaign_name)s, %(spend)s, %(impressions)s, %(clicks)s,
                         %(ims_revenue)s, %(ims_impressions)s, %(ao_revenue)s,
                         %(ao_signups)s, %(total_revenue)s, %(gross_allocated)s,
                         %(adjusted_revenue)s, %(day0_roas)s, %(adjusted_roas)s)
                    ON CONFLICT (date, compound_key) DO UPDATE SET
                        platform = EXCLUDED.platform,
                        ad_name = EXCLUDED.ad_name,
                        campaign_name = EXCLUDED.campaign_name,
                        spend = EXCLUDED.spend,
                        impressions = EXCLUDED.impressions,
                        clicks = EXCLUDED.clicks,
                        ims_revenue = EXCLUDED.ims_revenue,
                        ims_impressions = EXCLUDED.ims_impressions,
                        ao_revenue = EXCLUDED.ao_revenue,
                        ao_signups = EXCLUDED.ao_signups,
                        total_revenue = EXCLUDED.total_revenue,
                        gross_allocated = EXCLUDED.gross_allocated,
                        adjusted_revenue = EXCLUDED.adjusted_revenue,
                        day0_roas = EXCLUDED.day0_roas,
                        adjusted_roas = EXCLUDED.adjusted_roas
                """, prepared)
        conn.commit()
        print(f"  DB: wrote {len(performance)} rows to mmm_performance_daily ({date})")
    except Exception as e:
        conn.rollback()
        print(f"  write_performance_daily ERROR: {e}")
    finally:
        conn.close()


def write_source_daily(date, sources):
    """Persist day-level gross revenue by source. ``sources`` is a list of
    {"source", "revenue", "leads"} dicts."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            for s in sources:
                c.execute("""
                    INSERT INTO mmm_source_daily (date, source, revenue, leads)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (date, source) DO UPDATE SET
                        revenue = EXCLUDED.revenue,
                        leads   = EXCLUDED.leads
                """, (date, s["source"], s.get("revenue", 0) or 0, s.get("leads", 0) or 0))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"  write_source_daily ERROR: {e}")
    finally:
        conn.close()


def start_run_log(run_type, run_date):
    """Insert a 'running' run-log row and return its id."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                INSERT INTO mmm_run_log (run_type, run_date, status)
                VALUES (%s, %s, 'running')
                RETURNING id
            """, (run_type, run_date))
            run_id = c.fetchone()[0]
        conn.commit()
        return run_id
    finally:
        conn.close()


def finish_run_log(run_id, status, counts=None, totals=None, sources=None, errors=None, ai_summary=None):
    """Mark a run-log row complete with counts, totals, per-source status, errors."""
    import json
    counts = counts or {}
    totals = totals or {}
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                UPDATE mmm_run_log SET
                    status = %s,
                    finished_at = NOW(),
                    meta_rows = %s,
                    google_rows = %s,
                    ims_rows = %s,
                    ao_rows = %s,
                    joined_rows = %s,
                    total_spend = %s,
                    combined_revenue = %s,
                    sources = %s,
                    errors = %s,
                    ai_summary = %s
                WHERE id = %s
            """, (
                status,
                counts.get("meta", 0), counts.get("google", 0), counts.get("ims", 0),
                counts.get("ao", 0), counts.get("joined", 0),
                totals.get("total_spend", 0), totals.get("combined_revenue", 0),
                json.dumps(sources) if sources is not None else None,
                json.dumps(errors) if errors is not None else None,
                ai_summary,
                run_id,
            ))
        conn.commit()
    finally:
        conn.close()


def export_data(date=None, io_result=None, zenect_result=None, sheets_result=None):
    """
    Build the joined dataset for ``date``, apply gross allocation + platform
    spend, and persist the relational snapshot (mmm_performance_daily +
    mmm_source_daily + mmm_daily_spend). Returns the computed dict.
    """
    from datetime import datetime, timedelta
    if not date:
        date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    performance = get_joined_performance(date=date)
    summary     = get_daily_summary(days=30)

    # ------------------------------------------------------------------
    # Gross revenue allocation via IMS impressions
    # ------------------------------------------------------------------
    total_ims_impressions = sum(r.get("ims_impressions") or 0 for r in performance)

    io_cto   = (io_result.get("display_cto_revenue", 0) if io_result else 0)
    io_coreg = (io_result.get("coreg_revenue", 0)       if io_result else 0)
    zenect   = (zenect_result.get("revenue", 0)         if zenect_result else 0)
    gross_total = io_cto + io_coreg + zenect

    gross_rev_per_imp = (gross_total / total_ims_impressions
                         if total_ims_impressions > 0 else 0)

    for row in performance:
        imps        = row.get("ims_impressions") or 0
        gross_alloc = imps * gross_rev_per_imp
        adj_rev     = ((row.get("ims_revenue") or 0) +
                       (row.get("ao_revenue")  or 0) +
                       gross_alloc)
        spend       = row.get("spend") or 0
        row["gross_allocated"]  = round(gross_alloc, 2)
        row["adjusted_revenue"] = round(adj_rev, 2)
        row["adjusted_roas"]    = round(adj_rev / spend, 4) if spend > 0 else None

    # ------------------------------------------------------------------
    # Spend totals — creative-level (Meta + Google Ads) + sheet Google/Taboola
    # ------------------------------------------------------------------
    creative_spend_total = sum(r.get("spend") or 0 for r in performance)

    google_spend  = 0.0
    taboola_spend = 0.0
    if sheets_result:
        google_spend  = sheets_result.get("google_spend", 0) or 0
        taboola_spend = sheets_result.get("taboola_spend", 0) or 0
    else:
        saved = get_daily_spend(date)
        google_spend  = saved.get("google_spend", 0)
        taboola_spend = saved.get("taboola_spend", 0)

    # Precedence: creative-level Google Ads spend wins over the sheet's daily
    # Google total. If any Google creative row already has spend, drop the sheet
    # Google figure for this date to avoid double counting.
    has_google_creatives = any(
        r.get("platform") == "Google" and (r.get("spend") or 0) > 0 for r in performance
    )
    if has_google_creatives and google_spend:
        print(f"  Google precedence: creative-level spend present — ignoring sheet Google ${google_spend:.2f}")
        google_spend = 0.0

    # Persist the effective day-level Google/Taboola spend
    upsert_daily_spend(date, google_spend, taboola_spend)

    total_spend = creative_spend_total + google_spend + taboola_spend

    attributed_revenue = sum(r.get("total_revenue") or 0 for r in performance)
    combined_revenue   = attributed_revenue + gross_total
    combined_roas      = combined_revenue / total_spend if total_spend > 0 else None

    # Assign platform-level (sheet) spend to unattributed platform rows
    performance = assign_platform_spend_to_rows(performance, google_spend, taboola_spend)

    # ------------------------------------------------------------------
    # Persist relational snapshots for the dashboard
    # ------------------------------------------------------------------
    write_performance_daily(date, performance)
    write_source_daily(date, [
        {"source": "interactive_cto",   "revenue": round(io_cto, 2),   "leads": 0},
        {"source": "interactive_coreg", "revenue": round(io_coreg, 2), "leads": 0},
        {"source": "zenect",            "revenue": round(zenect, 2),
         "leads": (zenect_result.get("good_leads", 0) if zenect_result else 0)},
    ])

    meta_deep_dive = get_meta_creative_deep_dive(as_of_date=date)

    output = {
        "date":                  date,
        "generated_at":          datetime.now().isoformat(),
        "summary":               summary,
        "performance":           performance,
        "meta_deep_dive":        meta_deep_dive,
        "gross_total":           gross_total,
        "gross_rev_per_imp":     round(gross_rev_per_imp, 6),
        "total_ims_impressions": total_ims_impressions,
        "attributed_revenue":    attributed_revenue,
        "combined_revenue":      combined_revenue,
        "total_spend":           total_spend,
        "meta_spend":            creative_spend_total,
        "google_spend":          google_spend,
        "taboola_spend":         taboola_spend,
        "combined_roas":         combined_roas,
    }

    print(f"Exported {len(performance)} rows, gross ${gross_total:.2f} for {date}")
    return output


# Backwards-compatible aliases
insert_daily_spend = upsert_daily_spend
export_json = export_data


if __name__ == "__main__":
    init_db()
