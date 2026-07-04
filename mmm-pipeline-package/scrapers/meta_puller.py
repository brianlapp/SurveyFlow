"""
meta_puller.py
Pulls yesterday's ad-level spend from Meta Marketing API.
Extracts aff_id and aff_sub from each ad's destination URL.
"""

import requests
import time
import json
import re
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs


def name_to_compound_key(ad_name):
    """
    Extract compound key from ad name when URL params unavailable.
    Ad names: '0220-50-Ad4 - 0429', '1104-A-Ad5 -B- 0429', '0120-50-Ad2-D-0429'
    Compound key always ends at AdN: meta-0220-50-Ad4, meta-1104-A-Ad5
    """
    if not ad_name:
        return None
    m = re.match(r'^(.*?Ad\d+)', ad_name.strip(), re.IGNORECASE)
    if m:
        return f"meta-{m.group(1).strip()}"
    return None


def get_yesterday():
    d = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    return d, d


def parse_tracking_params(url):
    """
    Extract compound key from ad destination URL.
    URLs use ?utm_source=meta&utm_medium=0120-50-Ad2-D-0429
    Compound key = utm_source + "-" + utm_medium = meta-0120-50-Ad2-D-0429
    Also handles legacy aff_id + aff_sub format.
    """
    if not url:
        return None, None, None
    try:
        parsed = urlparse(url)
        params = parse_qs(parsed.query)

        # Primary format: utm_source + utm_medium
        utm_source = params.get("utm_source", [None])[0]
        utm_medium = params.get("utm_medium", [None])[0]
        if utm_source and utm_medium:
            compound_key = f"{utm_source}-{utm_medium}"
            return utm_source, utm_medium, compound_key

        # Legacy format: aff_id + aff_sub
        aff_id = params.get("aff_id", [None])[0]
        aff_sub = params.get("aff_sub", [None])[0]
        if aff_id and aff_sub:
            compound_key = f"{aff_id}-{aff_sub}"
            return aff_id, aff_sub, compound_key
        if aff_id:
            return aff_id, None, aff_id

        return None, None, None
    except Exception:
        return None, None, None


def pull_meta_spend(credentials, date_start=None, date_stop=None):
    """
    Pull ad-level insights from Meta Marketing API.
    Returns list of dicts with compound_key, spend, impressions, clicks.
    """
    token = credentials["meta"]["access_token"]
    account_id = credentials["meta"]["ad_account_id"]

    if not token or not account_id:
        print("  Meta: credentials not configured — skipping (0 rows)")
        return [], []

    if not date_start:
        date_start, date_stop = get_yesterday()

    # Ensure account_id has act_ prefix
    if not account_id.startswith("act_"):
        account_id = f"act_{account_id}"
    base_url = f"https://graph.facebook.com/v19.0/{account_id}/ads"

    # Step 1: Fetch insights first, then get creative details only for active ads
    # This avoids fetching all 347 ads upfront which causes Meta 500 errors
    print(f"  Fetching ads for account {account_id}...")
    ads = []  # will be populated after insights filter below
# Step 2: Get insights (spend/impressions/clicks) for each ad
    insights_url = f"https://graph.facebook.com/v19.0/{account_id}/insights"
    insights_params = {
        "level": "ad",
        "fields": "ad_id,ad_name,campaign_id,campaign_name,spend,impressions,clicks,inline_link_clicks,cpm,ctr",
        "time_range": json.dumps({"since": date_start, "until": date_stop}),
        "time_increment": 1,
        "limit": 500,
        "access_token": token,
    }

    print(f"  Fetching insights for {date_start}...")
    insights = []
    url = insights_url
    p = insights_params
    while True:
        for _attempt in range(3):
            try:
                resp = requests.get(url, params=p, timeout=60)
                if resp.ok:
                    break
                if _attempt < 2:
                    print(f"  Meta insights {resp.status_code} (attempt {_attempt+1}/3) — retrying in 20s...")
                    time.sleep(20)
                else:
                    pass
                break
            except Exception as _e:
                if _attempt < 2:
                    print(f"  Meta insights error (attempt {_attempt+1}/3) — retrying in 20s...")
                    time.sleep(20)
                else:
                    raise
        if not resp.ok:
            print(f"  Meta insights error: {resp.status_code} {resp.text[:200]}")
            break
        data = resp.json()
        insights.extend(data.get("data", []))
        next_url = data.get("paging", {}).get("next")
        if not next_url:
            break
        url = next_url
        p = {}  # next URL already has all params embedded

    # Filter to only MrktMunch campaigns (case-insensitive)
    all_count = len(insights)
    insights = [i for i in insights if "mrktmunch" in (i.get("campaign_name") or "").lower()]
    print(f"  Filtered to MrktMunch campaigns: {len(insights)}/{all_count} insights")

    # Step 3: Fetch creative details ONLY for active MrktMunch ads (not all 347)
    # Targeted fetch of ~44 ads is far more reliable than bulk fetch of 347
    active_ad_ids = [i["ad_id"] for i in insights if i.get("ad_id")]
    print(f"  Fetching creative details for {len(active_ad_ids)} active MrktMunch ads...")
    ads = []
    for ad_id in active_ad_ids:
        for _attempt in range(3):
            try:
                r = requests.get(
                    f"https://graph.facebook.com/v19.0/{ad_id}",
                    params={
                        "fields": "id,name,creative{object_story_spec,object_url,link_url}",
                        "access_token": token,
                    },
                    timeout=15,
                )
                if r.ok:
                    ads.append(r.json())
                    break
                elif _attempt < 2:
                    time.sleep(5)
            except Exception:
                if _attempt < 2:
                    time.sleep(5)

    ad_urls = {}
    for ad in ads:
        ad_id = ad["id"]
        
        # Try to get URL directly from creative fields
        creative = ad.get("creative", {})
        spec = creative.get("object_story_spec", {})
        url = None

        # Try all common locations for the destination URL
        for key in ["link_data", "video_data", "photo_data", "template_data"]:
            if key in spec:
                d = spec[key]
                url = (d.get("link") or 
                       d.get("call_to_action", {}).get("value", {}).get("link") or
                       d.get("caption"))
                if url:
                    break

        # Also check top-level creative for link
        if not url:
            url = creative.get("object_url") or creative.get("link_url")

        if url:
            ad_urls[ad_id] = url

    # Debug: print first few URLs to verify aff_id is present
    sample = list(ad_urls.values())[:3]
    print(f"  Sample ad URLs: {sample}")

    # If we got very few URLs, fetch creatives individually with more fields
    if len(ad_urls) < len(ads) * 0.5:
        print(f"  Only got {len(ad_urls)} URLs from {len(ads)} ads, fetching creative details...")
        for ad in ads[:10]:  # debug first 10
            ad_id = ad["id"]
            if ad_id not in ad_urls:
                try:
                    r = requests.get(
                        f"https://graph.facebook.com/v19.0/{ad_id}",
                        params={"fields": "creative{body,object_url,link_url,object_story_spec,effective_instagram_story_id}", "access_token": token}
                    )
                    d = r.json()
                    cr = d.get("creative", {})
                    url = cr.get("object_url") or cr.get("link_url")
                    spec2 = cr.get("object_story_spec", {})
                    for key in ["link_data", "video_data"]:
                        if key in spec2:
                            url = url or spec2[key].get("link") or spec2[key].get("call_to_action", {}).get("value", {}).get("link")
                    if url:
                        ad_urls[ad_id] = url
                        print(f"  Found URL for ad {ad_id}: {url[:80]}")
                except Exception as e:
                    print(f"  Could not fetch ad {ad_id}: {e}")

    # Step 4: Build output rows
    rows = []
    unmatched = []

    for insight in insights:
        ad_id = insight.get("ad_id")
        spend = float(insight.get("spend", 0))

        if spend == 0:
            continue

        url = ad_urls.get(ad_id)
        aff_id, aff_sub, compound_key = parse_tracking_params(url)

        # Fall back to ad name when URL tracking params unavailable
        if not compound_key:
            compound_key = name_to_compound_key(insight.get("ad_name", ""))
            aff_id = "meta"
            aff_sub = compound_key.replace("meta-", "") if compound_key else None

        row = {
            "date": date_start,
            "ad_id": ad_id,
            "ad_name": insight.get("ad_name", ""),
            "campaign_id": insight.get("campaign_id", ""),
            "campaign_name": insight.get("campaign_name", ""),
            "aff_id": aff_id,
            "aff_sub": aff_sub,
            "compound_key": compound_key,
            "spend": spend,
            "impressions":       int(insight.get("impressions", 0)),
            "clicks":            int(insight.get("clicks", 0)),
            "link_clicks":       int(insight.get("inline_link_clicks", 0)),
            "cpm":               float(insight.get("cpm", 0) or 0),
            "ctr":               float(insight.get("ctr", 0) or 0),
        }

        # Skip ads whose destination URL is not an MMM lander
        allowed_domains = ("modemarketmunchies", "modefreefinds")
        if url and not any(d in url.lower() for d in allowed_domains):
            continue

        if compound_key:
            rows.append(row)
        else:
            unmatched.append(row)

    if unmatched:
        print(f"  Warning: {len(unmatched)} ads had no aff_id/aff_sub in destination URL")

    print(f"  Pulled {len(rows)} Meta spend rows")
    return rows, unmatched


if __name__ == "__main__":
    import sys
    sys.path.insert(0, "..")
    with open("config/credentials.json") as f:
        creds = json.load(f)
    rows, unmatched = pull_meta_spend(creds)
    for r in rows[:5]:
        print(r)
