"""
debug_freeshares.py
Finds any Meta ads using 'freeshares' in URL or tracking params.
Also checks DB for the compound key origin.
"""
import sys, os, json, requests, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from pipeline.database import get_connection

CREDS_PATH = Path(__file__).parent.parent / "config" / "credentials.json"
with open(CREDS_PATH) as f:
    creds = json.load(f)

token      = creds["meta"]["access_token"]
account_id = creds["meta"]["ad_account_id"]
if not account_id.startswith("act_"):
    account_id = f"act_{account_id}"

# --- Check DB for freeshares compound keys ---
print("=== DB: compound keys containing 'freeshares' (last 30 days) ===")
conn = get_connection()
c = conn.cursor()
for table in ("meta_spend", "ims_revenue", "ao_revenue"):
    c.execute(f"""
        SELECT date, compound_key,
               {'SUM(spend)' if table == 'meta_spend' else 'SUM(revenue)'} as amount,
               COUNT(*) as rows
        FROM {table}
        WHERE compound_key LIKE '%freeshares%'
          AND date >= date('now', '-30 days')
        GROUP BY date, compound_key
        ORDER BY date DESC
    """)
    rows = c.fetchall()
    if rows:
        print(f"\n  {table}:")
        for r in rows:
            print(f"    {r['date']}  {r['compound_key']:<35}  amount=${r['amount']:.2f}  rows={r['rows']}")
    else:
        print(f"\n  {table}: none")
conn.close()

# --- Search ALL Meta ads (including paused) for freeshares ---
print("\n=== Meta API: searching ALL ads for 'freeshares' in URL ===")
url    = f"https://graph.facebook.com/v19.0/{account_id}/ads"
params = {
    "fields": "id,name,status,creative{object_story_spec,object_url,link_url}",
    "limit":  500,
    "access_token": token,
}
ads = []
p   = params
u   = url
while True:
    resp = requests.get(u, params=p)
    resp.raise_for_status()
    data = resp.json()
    ads.extend(data.get("data", []))
    nxt = data.get("paging", {}).get("next")
    if not nxt:
        break
    u, p = nxt, {}

print(f"Checking {len(ads)} total ads...")

found = []
for ad in ads:
    creative = ad.get("creative", {})
    spec     = creative.get("object_story_spec", {})
    
    # Pull any URL from creative
    url_found = None
    for key in ["link_data", "video_data"]:
        if key in spec:
            d = spec[key]
            url_found = (d.get("link") or
                         d.get("call_to_action", {}).get("value", {}).get("link"))
            if url_found:
                break
    if not url_found:
        url_found = creative.get("object_url") or creative.get("link_url", "")

    # Also check ad name
    name = ad.get("name", "")

    if url_found and "freeshares" in url_found.lower():
        found.append({"name": name, "id": ad["id"], "status": ad.get("status"), "url": url_found})
    elif "freeshares" in name.lower():
        found.append({"name": name, "id": ad["id"], "status": ad.get("status"), "url": url_found or "N/A"})

if found:
    print(f"\nFound {len(found)} ads mentioning 'freeshares':")
    for a in found:
        print(f"  [{a['status']}] {a['name']}")
        print(f"    ID:  {a['id']}")
        print(f"    URL: {a['url']}")
        
        # Parse URL params
        try:
            parsed = urlparse(a['url'])
            params_parsed = parse_qs(parsed.query)
            print(f"    Params: {dict(params_parsed)}")
        except Exception:
            pass
        print()
else:
    print("\nNo Meta ads found with 'freeshares' in URL or name.")
    print("\nThis traffic likely originates from a non-Meta source.")
    print("Check: Taboola, Google, direct/organic, or a different campaign not in this account.")
