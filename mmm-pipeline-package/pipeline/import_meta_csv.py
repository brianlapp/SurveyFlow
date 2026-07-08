"""
import_meta_csv.py — Bulk-import Meta ad spend from a Meta Ads Manager CSV export
into mmm_ad_spend, then recompute mmm_performance_daily for the affected dates.

WHY THIS EXISTS
---------------
The Meta Marketing API is dead for this account (code 190 "Application has been
deleted"), so the live meta_puller returns 0 rows and Meta spend/ROAS are blank
in the report. As an interim fix, Mike exports a per-ad, per-day spend CSV from
Meta Ads Manager and we bulk-import it here.

This script derives the SAME compound_key the live API path produces
(name_to_compound_key -> _normalize_ims_key), so imported Meta spend joins to the
already-stored IMS / AfterOffers revenue on (date, compound_key) and Meta ROAS
appears in the report — no re-scraping of revenue required.

CSV SHAPE (Meta Ads Manager "Ads" export, per-day)
    "Account name",Day,"Ad name",Reach,Impressions,Frequency,Currency,
    "Amount spent (USD)","Attribution setting","Conversion Rate",Leads,
    "Cost per lead","Reporting starts","Reporting ends"
The first data row is a grand-total row (blank Account/Day/Ad name) — skipped.
Ad names that don't match the ...AdN convention yield no key and are skipped
(this implicitly filters out any non-MrktMunch ads in the export).

USAGE
    # from the pipeline-package dir, DATABASE_URL must point at the REPORT's Neon DB
    python3 -m pipeline.import_meta_csv <file.csv>            # import + recompute
    python3 -m pipeline.import_meta_csv <file.csv> --dry-run  # parse only, no DB
    python3 -m pipeline.import_meta_csv <file.csv> --append   # keep existing Meta rows
    python3 -m pipeline.import_meta_csv <file.csv> --no-recompute

By default the script REPLACES existing Meta rows for each affected date before
inserting (idempotent re-import); Google/IMS/AO rows are never touched.
"""

import argparse
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from scrapers.meta_puller import name_to_compound_key


# --- CSV column names (exact headers from Meta Ads Manager export) ---
COL_ACCOUNT = "Account name"
COL_DAY = "Day"
COL_AD = "Ad name"
COL_IMPRESSIONS = "Impressions"
COL_CLICKS_LINK = "Link clicks"          # present in some exports; optional
COL_SPEND = "Amount spent (USD)"
COL_LEADS = "Leads"
COL_REACH = "Reach"


def _num(val):
    """Parse a Meta CSV numeric cell -> float. Strips $ , and blanks -> 0.0."""
    if val is None:
        return 0.0
    s = str(val).strip().replace(",", "").replace("$", "")
    if not s:
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


def parse_csv(path):
    """
    Read a Meta Ads Manager CSV into pipeline-shaped spend rows.

    Returns (rows, stats) where rows is a list of dicts ready for
    database.insert_meta_rows and stats summarizes what happened.
    """
    rows = []
    skipped_total_row = 0
    skipped_no_key = []          # ad names that produced no compound_key
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for raw in reader:
            ad_name = (raw.get(COL_AD) or "").strip()
            day = (raw.get(COL_DAY) or "").strip()
            # Grand-total row (and any header/blank line): no ad name / no day
            if not ad_name or not day:
                skipped_total_row += 1
                continue

            key = name_to_compound_key(ad_name)
            if not key:
                skipped_no_key.append(ad_name)
                continue

            rows.append({
                "date": day,
                "ad_id": None,
                "ad_name": ad_name,
                "campaign_id": None,
                "campaign_name": (raw.get(COL_ACCOUNT) or "").strip() or None,
                "aff_id": None,
                "aff_sub": None,
                "compound_key": key,   # insert_meta_rows applies _normalize_ims_key on top
                "spend": _num(raw.get(COL_SPEND)),
                "impressions": int(_num(raw.get(COL_IMPRESSIONS))),
                "clicks": int(_num(raw.get(COL_CLICKS_LINK))),
                "link_clicks": int(_num(raw.get(COL_CLICKS_LINK))),
                "cpm": 0,
                "ctr": 0,
            })

    stats = {
        "kept": len(rows),
        "skipped_total_row": skipped_total_row,
        "skipped_no_key": skipped_no_key,
        "dates": sorted({r["date"] for r in rows}),
    }
    return rows, stats


def build_summary(rows, stats, imported=False):
    """Machine-readable result — printed as `IMPORT_SUMMARY: {json}` so the
    upload endpoint / UI can show numbers without scraping stdout."""
    by_date = defaultdict(lambda: {"rows": 0, "spend": 0.0, "impressions": 0})
    for r in rows:
        d = by_date[r["date"]]
        d["rows"] += 1
        d["spend"] += r["spend"]
        d["impressions"] += r["impressions"]
    per_date = [
        {"date": dt, "ads": v["rows"],
         "spend": round(v["spend"], 2), "impressions": v["impressions"]}
        for dt, v in sorted(by_date.items())
    ]
    distinct_keys = len({r["compound_key"] for r in rows})
    return {
        "imported": imported,
        "dates": stats["dates"],
        "rows": len(rows),
        "distinct_creatives": distinct_keys,
        "total_spend": round(sum(r["spend"] for r in rows), 2),
        "per_date": per_date,
        "skipped_no_key": sorted(set(stats["skipped_no_key"])),
        "skipped_blank_rows": stats["skipped_total_row"],
    }


def summarize(rows, stats):
    """Print a per-date breakdown + the derived compound keys (dry-run friendly)."""
    from scrapers.meta_puller import name_to_compound_key as _n  # noqa: F401
    try:
        from pipeline.database import _normalize_ims_key
    except Exception:
        _normalize_ims_key = lambda k: k  # dry-run may run without psycopg2

    by_date = defaultdict(lambda: {"rows": 0, "spend": 0.0, "impr": 0})
    for r in rows:
        d = by_date[r["date"]]
        d["rows"] += 1
        d["spend"] += r["spend"]
        d["impr"] += r["impressions"]

    print("\n=== Per-date summary ===")
    grand = 0.0
    for date in sorted(by_date):
        d = by_date[date]
        grand += d["spend"]
        print(f"  {date}: {d['rows']:>3} ads   ${d['spend']:>10,.2f}   {d['impr']:>10,} impr")
    print(f"  {'TOTAL':<10}: {len(rows):>3} ads   ${grand:>10,.2f}")

    # Show the final DB keys (post-normalization) so we can eyeball the join surface
    final_keys = {}
    for r in rows:
        fk = _normalize_ims_key(r["compound_key"])
        final_keys.setdefault(fk, 0)
        final_keys[fk] += 1
    print(f"\n=== Distinct compound keys after normalization: {len(final_keys)} ===")
    for k in sorted(final_keys):
        print(f"  {k}   (x{final_keys[k]} day-rows)")

    if stats["skipped_no_key"]:
        uniq = sorted(set(stats["skipped_no_key"]))
        print(f"\n=== Skipped (no compound_key derivable): {len(uniq)} distinct ad names ===")
        for name in uniq:
            print(f"  {name!r}")
    print(f"\nSkipped total/blank rows: {stats['skipped_total_row']}")


def load_source_results(date, conn):
    """
    Reconstruct io_result + zenect_result from the already-stored
    mmm_source_daily so export_data preserves the gross-revenue allocation
    (Interactive Offers + Zenect) instead of zeroing it out on recompute.
    """
    import psycopg2.extras
    io_cto = io_coreg = zen_rev = 0.0
    zen_leads = 0
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as c:
        c.execute(
            "SELECT source, revenue, leads FROM mmm_source_daily WHERE date = %s",
            (date,),
        )
        for r in c.fetchall():
            src = (r["source"] or "").lower()
            rev = float(r["revenue"] or 0)
            if src == "interactive_cto":
                io_cto = rev
            elif src == "interactive_coreg":
                io_coreg = rev
            elif src == "zenect":
                zen_rev = rev
                zen_leads = int(r["leads"] or 0)
    io_result = {
        "display_cto_revenue": io_cto,
        "coreg_revenue": io_coreg,
        "total_revenue": io_cto + io_coreg,
        "source": "db",
    }
    zenect_result = {"revenue": zen_rev, "good_leads": zen_leads, "source": "db"}
    return io_result, zenect_result


def run_import(rows, stats, replace=True, recompute=True):
    """Insert Meta rows into mmm_ad_spend and recompute performance for each date."""
    from pipeline.database import (
        get_connection, init_db, insert_meta_rows, export_data,
    )

    init_db()
    dates = stats["dates"]

    # 1) Idempotent replace: drop existing Meta rows for the affected dates only
    if replace:
        conn = get_connection()
        try:
            with conn.cursor() as c:
                for date in dates:
                    c.execute(
                        "DELETE FROM mmm_ad_spend WHERE date = %s AND platform = 'Meta'",
                        (date,),
                    )
            conn.commit()
            print(f"Cleared existing Meta rows for {len(dates)} date(s).")
        finally:
            conn.close()

    # 2) Insert Meta spend per date (insert_meta_rows normalizes keys to match IMS/AO)
    for date in dates:
        day_rows = [r for r in rows if r["date"] == date]
        print(f"\nImporting {len(day_rows)} Meta rows for {date}...")
        insert_meta_rows(day_rows)

    # 3) Recompute mmm_performance_daily per date, preserving IO/Zenect gross
    if recompute:
        for date in dates:
            conn = get_connection()
            try:
                io_result, zenect_result = load_source_results(date, conn)
            finally:
                conn.close()
            print(f"Recomputing performance snapshot for {date} "
                  f"(gross: IO_cto=${io_result['display_cto_revenue']:.2f} "
                  f"IO_coreg=${io_result['coreg_revenue']:.2f} "
                  f"Zenect=${zenect_result['revenue']:.2f})...")
            export_data(
                date=date,
                io_result=io_result,
                zenect_result=zenect_result,
                sheets_result=None,   # google/taboola read back from mmm_daily_spend
            )
    print("\nDone.")


def main():
    ap = argparse.ArgumentParser(description="Import Meta Ads CSV spend into the MMM pipeline.")
    ap.add_argument("csv_path", help="Path to the Meta Ads Manager CSV export")
    ap.add_argument("--dry-run", action="store_true",
                    help="Parse + derive keys + print summary, no DB writes")
    ap.add_argument("--append", action="store_true",
                    help="Keep existing Meta rows for these dates (default: replace)")
    ap.add_argument("--no-recompute", action="store_true",
                    help="Skip recomputing mmm_performance_daily")
    args = ap.parse_args()

    path = Path(args.csv_path).expanduser()
    if not path.exists():
        print(f"ERROR: file not found: {path}")
        sys.exit(1)

    rows, stats = parse_csv(path)
    print(f"Parsed {stats['kept']} spend rows across {len(stats['dates'])} dates "
          f"({stats['dates'][0]}..{stats['dates'][-1]})." if stats["dates"]
          else "Parsed 0 usable rows.")
    summarize(rows, stats)

    if args.dry_run:
        print("\n[dry-run] No database writes performed.")
        print("IMPORT_SUMMARY: " + json.dumps(build_summary(rows, stats, imported=False)))
        return
    if not rows:
        print("Nothing to import.")
        print("IMPORT_SUMMARY: " + json.dumps(build_summary(rows, stats, imported=False)))
        return

    run_import(rows, stats, replace=not args.append, recompute=not args.no_recompute)
    print("IMPORT_SUMMARY: " + json.dumps(build_summary(rows, stats, imported=True)))


if __name__ == "__main__":
    main()
