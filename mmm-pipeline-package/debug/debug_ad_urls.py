"""
debug_ad_urls.py
Pulls all active MrktMunch ad destination URLs from Meta API.
Fetches deep creative details for ads missing URLs.
Shows compound key, full URL, and IMS conversion status.

Usage: python pipeline/debug_ad_urls.py
"""
import sys, os, json, requests, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta
from pipeline.database import get_connection

CREDS_PATH = Path(__file__).parent.parent / "config" / "credentials.json"

with open(CREDS_PATH) as f:
    creds = json.load(f)

token      = creds["meta"]["access_token"]
account_id = creds["meta"]["ad_account_id"]
if not account_id.startswith("act_"):
    account_id = f"act_{account_id}"

# -----------------------------------------------------------------------
# Step 1: Fetch all ads with basic creative fields
# -----------------------------------------------------------------------
print("Fetching all ads from Meta API...")
base_url = f"https://graph.facebook.com/v19.0/{account_id}/ads"
params   = {
    "fields": "id,name,status,creative{object_story_spec,object_url,link_url}",
    "limit":  500,
    "access_token": token,
}
ads = []
url = base_url
p   = params
while True:
    resp = requests.get(url, params=p)
    resp.raise_for_status()
    data = resp.json()
    ads.extend(data.get("data", []))
    nxt = data.get("paging", {}).get("next")
    if not nxt:
        break
    url, p = nxt, {}
print(f"Found {len(ads)} total ads")

# -----------------------------------------------------------------------
# Step 2: Get 7-day insights to find active MrktMunch ads
# -----------------------------------------------------------------------
yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
week_ago  = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

ins_resp = requests.get(
    f"https://graph.facebook.com/v19.0/{account_id}/insights",
    params={
        "level":      "ad",
        "fields":     "ad_id,ad_name,campaign_name,spend",
        "time_range": json.dumps({"since": week_ago, "until": yesterday}),
        "limit":      500,
        "access_token": token,
    }
)
insights = {}
if ins_resp.ok:
    for row in ins_resp.json().get("data", []):
        if "mrktmunch" in (row.get("campaign_name") or "").lower():
            insights[row["ad_id"]] = {
                "spend":    float(row.get("spend", 0)),
                "campaign": row.get("campaign_name", ""),
                "name":     row.get("ad_name", ""),
            }
print(f"Found {len(insights)} MrktMunch ads with spend in last 7 days")

# -----------------------------------------------------------------------
# Step 3: Extract URLs from basic creative fields
# -----------------------------------------------------------------------
def extract_url_from_ad(ad):
    creative = ad.get("creative", {})
    spec     = creative.get("object_story_spec", {})
    for key in ["link_data", "video_data", "photo_data", "template_data"]:
        if key in spec:
            d = spec[key]
            u = (d.get("link") or
                 d.get("call_to_action", {}).get("value", {}).get("link") or
                 d.get("caption"))
            if u and ("modemarketmunchies" in u or "modefreefinds" in u or
                      "stockoffer" in u or "preipo" in u):
                return u
    return (creative.get("object_url") or creative.get("link_url") or None)

ad_map   = {ad["id"]: ad for ad in ads}
ad_urls  = {}
for ad in ads:
    u = extract_url_from_ad(ad)
    if u:
        ad_urls[ad["id"]] = u

# -----------------------------------------------------------------------
# Step 4: Deep fetch for ads missing URLs (active ads only)
# -----------------------------------------------------------------------
missing_ids = [
    ad_id for ad_id in insights
    if ad_id not in ad_urls and insights[ad_id]["spend"] > 5
]
if missing_ids:
    print(f"\nDeep-fetching creative details for {len(missing_ids)} ads missing URLs...")
    for ad_id in missing_ids:
        try:
            r = requests.get(
                f"https://graph.facebook.com/v19.0/{ad_id}",
                params={
                    "fields": (
                        "creative{id,name,object_url,link_url,body,"
                        "object_story_spec,effective_object_story_id,"
                        "asset_feed_spec}"
                    ),
                    "access_token": token,
                },
                timeout=10,
            )
            if not r.ok:
                continue
            d = r.json()
            creative = d.get("creative", {})

            # Try every possible field
            u = (creative.get("object_url") or
                 creative.get("link_url"))

            if not u:
                spec = creative.get("object_story_spec", {})
                for key in ["link_data", "video_data", "photo_data", "template_data"]:
                    if key in spec:
                        ld = spec[key]
                        u = (ld.get("link") or
                             ld.get("call_to_action", {}).get("value", {}).get("link"))
                        if u:
                            break

            # Try asset_feed_spec for dynamic ads
            if not u:
                feed = creative.get("asset_feed_spec", {})
                links = feed.get("link_urls", [])
                if links:
                    u = links[0].get("website_url")

            if u:
                ad_urls[ad_id] = u
                name = insights.get(ad_id, {}).get("name", ad_id)
                print(f"  Found URL for {name}: {u}")
            else:
                name = insights.get(ad_id, {}).get("name", ad_id)
                print(f"  Still no URL for {name}")

            time.sleep(0.1)  # rate limit courtesy
        except Exception as e:
            print(f"  Error fetching {ad_id}: {e}")

# -----------------------------------------------------------------------
# Step 5: Load IMS data from DB
# -----------------------------------------------------------------------
conn = get_connection()
c = conn.cursor()
c.execute("""
    SELECT compound_key,
           SUM(impressions) as ims_imps,
           SUM(revenue) as ims_rev
    FROM ims_revenue WHERE date >= ?
    GROUP BY compound_key
""", (week_ago,))
ims_data = {r["compound_key"]: dict(r) for r in c.fetchall()}
conn.close()

# -----------------------------------------------------------------------
# Step 6: Parse compound key from URL
# -----------------------------------------------------------------------
def parse_compound_key(url):
    if not url:
        return None
    try:
        parsed = urlparse(url)
        p = parse_qs(parsed.query)
        src = (p.get("utm_source") or p.get("aff_id") or [None])[0]
        med = (p.get("utm_medium") or p.get("aff_sub") or [None])[0]
        if src and med:
            return f"{src}-{med}"
        return src
    except Exception:
        return None

def lander_type(url):
    if not url:
        return "NO URL"
    if "stockoffer" in url:
        return "stockoffer"
    if "modefreefinds" in url:
        return "freefinds"
    if "preipo" in url:
        return "preipo (no IMS)"
    if "modemarketmunchies" in url:
        return "mmm"
    return "other"

# -----------------------------------------------------------------------
# Step 7: Build results and print
# -----------------------------------------------------------------------
results = []
for ad_id, ins in insights.items():
    if ins["spend"] < 1:
        continue
    url     = ad_urls.get(ad_id)
    key     = parse_compound_key(url)
    lander  = lander_type(url)
    ims     = ims_data.get(key, {})
    ims_imps = ims.get("ims_imps", 0)
    results.append({
        "ad_id":    ad_id,
        "name":     ins.get("name", ""),
        "url":      url or "NOT FOUND",
        "key":      key or "—",
        "spend":    ins["spend"],
        "ims_imps": ims_imps,
        "lander":   lander,
    })

results.sort(key=lambda x: x["spend"], reverse=True)

print("\n" + "=" * 110)
print(f"  {'Ad Name':<40} {'Key':<32} {'7D Spend':>9} {'IMS Imps':>9}  Lander")
print("=" * 110)

problem_ads = []
for r in results:
    flag = ""
    if r["lander"] == "preipo (no IMS)":
        flag = "  — preipo, no IMS expected"
    elif r["url"] == "NOT FOUND":
        flag = "  ⚠️  URL not retrievable from API"
    elif r["ims_imps"] == 0 and r["spend"] > 10:
        flag = "  ❌ NO IMS — TEST THIS URL"
        problem_ads.append(r)
    elif r["ims_imps"] > 0:
        pass  # working fine

    print(f"  {r['name'][:38]:<40} {r['key']:<32} ${r['spend']:>8.2f} {r['ims_imps']:>9}  [{r['lander']}]{flag}")

print()
print("=" * 110)
print(f"\n{'='*50}")
print("ACTIONABLE: ADS WITH SPEND BUT ZERO IMS — TEST THESE SIGNUP FLOWS:")
print(f"{'='*50}\n")

if problem_ads:
    for r in problem_ads:
        print(f"  Name:   {r['name']}")
        print(f"  Key:    {r['key']}")
        print(f"  Lander: {r['lander']}")
        print(f"  Spend:  ${r['spend']:.2f} (7d)")
        print(f"  URL:    {r['url']}")
        print(f"  Action: Open URL, complete signup, check if IMS monetization page loads")
        print()
else:
    print("  None found — all ads with extractable URLs have IMS impressions.")

print(f"Summary: {len(results)} active ads | "
      f"{len(problem_ads)} with no IMS | "
      f"{len([r for r in results if r['url']=='NOT FOUND'])} with missing URLs")
