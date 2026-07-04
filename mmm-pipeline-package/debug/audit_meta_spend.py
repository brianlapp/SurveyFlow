"""
audit_meta_spend.py
Compares Meta API spend (June 1-14) vs what's stored in meta_spend DB.
Flags any gaps between API total and DB total per day and per creative.

Usage: python pipeline\audit_meta_spend.py
"""
import sys, os, json, requests, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pathlib import Path
from pipeline.database import get_connection

CREDS_PATH = Path(__file__).parent.parent / "config" / "credentials.json"
with open(CREDS_PATH) as f:
    creds = json.load(f)

token      = creds["meta"]["access_token"]
account_id = creds["meta"]["ad_account_id"]
if not account_id.startswith("act_"):
    account_id = f"act_{account_id}"

START = "2026-06-01"
END   = "2026-06-14"

# ── Step 1: Pull Meta API spend per ad per day ──────────────────────────────
print(f"Pulling Meta API spend {START} to {END}...")
resp = requests.get(
    f"https://graph.facebook.com/v19.0/{account_id}/insights",
    params={
        "level":       "ad",
        "fields":      "ad_id,ad_name,campaign_name,spend,impressions,clicks,date_start",
        "time_range":  json.dumps({"since": START, "until": END}),
        "time_increment": 1,
        "limit":       500,
        "access_token": token,
    }
)
resp.raise_for_status()
api_rows = resp.json().get("data", [])

# Paginate
while resp.json().get("paging", {}).get("next"):
    resp = requests.get(resp.json()["paging"]["next"])
    api_rows.extend(resp.json().get("data", []))

# Filter to MrktMunch only
api_mrkt = [r for r in api_rows if "mrktmunch" in (r.get("campaign_name") or "").lower()]
print(f"  API: {len(api_rows)} total rows → {len(api_mrkt)} MrktMunch rows")

# Aggregate API spend by date
api_by_date = {}
api_by_ad   = {}
for r in api_mrkt:
    date  = r["date_start"]
    spend = float(r.get("spend", 0))
    ad_id = r["ad_id"]
    name  = r.get("ad_name", "")
    api_by_date[date] = api_by_date.get(date, 0) + spend
    if ad_id not in api_by_ad:
        api_by_ad[ad_id] = {"name": name, "spend": 0}
    api_by_ad[ad_id]["spend"] += spend

api_total = sum(api_by_date.values())
print(f"  API total MrktMunch spend: ${api_total:,.2f}")

# ── Step 2: Pull DB spend per day ────────────────────────────────────────────
conn = get_connection()
c    = conn.cursor()
c.execute("""
    SELECT date, SUM(spend) as spend, COUNT(DISTINCT compound_key) as keys
    FROM meta_spend
    WHERE date BETWEEN ? AND ?
    GROUP BY date ORDER BY date
""", (START, END))
db_by_date = {r["date"]: {"spend": r["spend"], "keys": r["keys"]} for r in c.fetchall()}
db_total   = sum(v["spend"] for v in db_by_date.values())
print(f"  DB total stored spend:     ${db_total:,.2f}")
print(f"  Gap:                       ${api_total - db_total:,.2f}  ({(api_total-db_total)/api_total*100:.1f}% uncaptured)")
conn.close()

# ── Step 3: Day-by-day comparison ────────────────────────────────────────────
print(f"\n{'Date':<12} {'API Spend':>11} {'DB Spend':>11} {'Gap':>9}  {'DB Keys':>8}  Status")
print("-" * 65)
all_dates = sorted(set(api_by_date) | set(db_by_date))
for date in all_dates:
    api_s = api_by_date.get(date, 0)
    db_v  = db_by_date.get(date, {})
    db_s  = db_v.get("spend", 0)
    db_k  = db_v.get("keys", 0)
    gap   = api_s - db_s
    pct   = gap / api_s * 100 if api_s > 0 else 0
    flag  = "✅" if abs(pct) < 3 else ("⚠️" if abs(pct) < 10 else "❌")
    print(f"  {date}  ${api_s:>9,.2f}  ${db_s:>9,.2f}  ${gap:>8,.2f}  {db_k:>8}  {flag} {pct:.1f}%")

print(f"\n  {'TOTAL':<10}  ${api_total:>9,.2f}  ${db_total:>9,.2f}  ${api_total-db_total:>8,.2f}")

# ── Step 4: Find ads with API spend but NOT in DB ────────────────────────────
print(f"\n{'='*70}")
print("ADS WITH SIGNIFICANT SPEND IN META API NOT CAPTURED IN DB:")
print(f"{'='*70}")

conn = get_connection()
c    = conn.cursor()
c.execute("""
    SELECT DISTINCT ad_id FROM meta_spend
    WHERE date BETWEEN ? AND ?
""", (START, END))
db_ad_ids = {r["ad_id"] for r in c.fetchall() if r["ad_id"]}
conn.close()

missing = []
for ad_id, v in sorted(api_by_ad.items(), key=lambda x: -x[1]["spend"]):
    if float(v["spend"]) > 10 and ad_id not in db_ad_ids:
        missing.append((ad_id, v["name"], v["spend"]))

if missing:
    missing_spend = sum(m[2] for m in missing)
    print(f"  Found {len(missing)} ads (${missing_spend:,.2f} total spend) missing from DB:\n")
    for ad_id, name, spend in missing:
        print(f"  ${spend:>8.2f}  {name[:50]:<52}  ID:{ad_id}")
else:
    print("  None — all significant ad IDs accounted for ✅")

print(f"\n{'='*70}")
print("SUMMARY")
print(f"{'='*70}")
print(f"  Meta API MrktMunch spend (Jun 1-14): ${api_total:,.2f}")
print(f"  Pipeline DB captured:                ${db_total:,.2f}")
print(f"  Uncaptured spend:                    ${api_total-db_total:,.2f} ({(api_total-db_total)/api_total*100:.1f}%)")
if (api_total - db_total) / api_total < 0.05:
    print(f"\n  ✅ SPEND CAPTURE ACCURATE — within 5% of API total")
    print(f"     ROAS analysis is reliable for creative decisions")
else:
    print(f"\n  ⚠️  SPEND GAP EXCEEDS 5% — investigate missing ad IDs above")
