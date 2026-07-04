"""
debug_ims_leads.py
Compares platform leads vs IMS impressions per compound key.
Identifies which ad URLs are/aren't feeding into IMS correctly.

Usage: python pipeline\debug_ims_leads.py [YYYY-MM-DD]
       (defaults to yesterday)
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.database import get_connection
from datetime import datetime, timedelta

target_date = sys.argv[1] if len(sys.argv) > 1 else \
    (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

print(f"\n=== IMS Lead Conversion Analysis for {target_date} ===\n")

conn = get_connection()
c = conn.cursor()

# 1. Meta spend per compound key
c.execute("""
    SELECT compound_key, SUM(spend) as spend, SUM(impressions) as meta_imps, SUM(clicks) as clicks
    FROM meta_spend WHERE date = ?
    GROUP BY compound_key ORDER BY spend DESC
""", (target_date,))
meta_rows = {r["compound_key"]: dict(r) for r in c.fetchall()}

# 2. IMS impressions per compound key
c.execute("""
    SELECT compound_key, SUM(impressions) as ims_imps, SUM(revenue) as ims_rev
    FROM ims_revenue WHERE date = ?
    GROUP BY compound_key
""", (target_date,))
ims_rows = {r["compound_key"]: dict(r) for r in c.fetchall()}

# 3. AO signups per compound key (these = actual leads)
c.execute("""
    SELECT compound_key, SUM(signups) as signups, SUM(revenue) as ao_rev
    FROM ao_revenue WHERE date = ?
    GROUP BY compound_key
""", (target_date,))
ao_rows = {r["compound_key"]: dict(r) for r in c.fetchall()}

conn.close()

# Summary totals
total_meta_spend = sum(r["spend"] for r in meta_rows.values())
total_ao_leads   = sum(r["signups"] for r in ao_rows.values())
total_ims_imps   = sum(r["ims_imps"] for r in ims_rows.values())

print(f"TOTALS:")
print(f"  Meta spend:       ${total_meta_spend:.2f}")
print(f"  AO leads (signups): {total_ao_leads}")
print(f"  IMS impressions:    {total_ims_imps}")
if total_ao_leads > 0:
    print(f"  IMS conversion:     {total_ims_imps/total_ao_leads*100:.1f}% of leads reach IMS")
print()

# Per-creative breakdown
all_keys = set(meta_rows) | set(ims_rows) | set(ao_rows)

print(f"{'Compound Key':<35} {'Spend':>8} {'AO Leads':>9} {'IMS Imps':>9} {'IMS Rev':>8}  {'Status'}")
print("-" * 90)

no_ims = []
no_leads = []

for key in sorted(all_keys, key=lambda k: meta_rows.get(k, {}).get("spend", 0), reverse=True):
    spend    = meta_rows.get(key, {}).get("spend", 0)
    leads    = ao_rows.get(key, {}).get("signups", 0)
    ims_imps = ims_rows.get(key, {}).get("ims_imps", 0)
    ims_rev  = ims_rows.get(key, {}).get("ims_rev", 0)

    if spend < 0.50 and leads == 0 and ims_imps == 0:
        continue  # skip trivial rows

    if leads > 0 and ims_imps == 0:
        status = "⚠️  LEADS→NO IMS"
        no_ims.append((key, spend, leads))
    elif leads > 0 and ims_imps > 0:
        rate = ims_imps / leads * 100
        status = f"✅ {rate:.0f}% conv"
    elif ims_imps > 0 and leads == 0:
        status = "📊 IMS only (delayed/organic)"
        no_leads.append((key, ims_imps, ims_rev))
    elif spend > 0 and leads == 0 and ims_imps == 0:
        status = "❌ spend, no leads/IMS"
    else:
        status = "—"

    print(f"  {key:<33} ${spend:>7.2f} {leads:>9} {ims_imps:>9} ${ims_rev:>7.2f}  {status}")

print()
if no_ims:
    print(f"⚠️  {len(no_ims)} ads with AO leads but ZERO IMS impressions (lander may lack IMS widget):")
    for key, spend, leads in no_ims:
        print(f"    {key}  spend=${spend:.2f}  leads={leads}")

print()
if no_leads:
    print(f"📊 {len(no_leads)} IMS-only keys (delayed monetization from prior days):")
    for key, imps, rev in no_leads:
        print(f"    {key}  ims_imps={imps}  rev=${rev:.2f}")

print()
print("=== URL Pattern Analysis ===")
print("Looking at sample ad URLs from meta_spend to identify non-IMS landers...")

conn = get_connection()
c = conn.cursor()
c.execute("""
    SELECT DISTINCT compound_key, aff_id, aff_sub
    FROM meta_spend WHERE date = ? AND compound_key IS NOT NULL
    ORDER BY compound_key
""", (target_date,))
meta_url_rows = c.fetchall()
conn.close()

for r in meta_url_rows:
    key = r["compound_key"]
    ims_data = ims_rows.get(key, {})
    ao_data  = ao_rows.get(key, {})
    ims_imps = ims_data.get("ims_imps", 0)
    leads    = ao_data.get("signups", 0)

    if leads > 2 and ims_imps == 0:
        print(f"  ❓ {key} — aff_id={r['aff_id']} aff_sub={r['aff_sub']} — {leads} leads, 0 IMS")

