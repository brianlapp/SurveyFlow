"""
google_ads_puller.py
Pulls creative-level (ad-level) spend from the Google Ads API and derives a
compound key from the final URL's utm_source / utm_medium, matching the same
`{utm_source}-{utm_medium}` convention used by Meta / IMS / AfterOffers.

Requires the google-ads library and OAuth credentials. When credentials are
missing the puller returns an empty list so the pipeline runs cleanly with no
Google data (acceptable until creds are provided).

Returned rows mirror the Meta puller shape so they can be inserted into the
same mmm_ad_spend table with platform="Google".
"""

from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs


def _yesterday():
    return (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")


def parse_tracking_params(url):
    """
    Extract (utm_source, utm_medium, compound_key) from a final URL.
    Compound key = utm_source + "-" + utm_medium (falls back to utm_source).
    """
    if not url:
        return None, None, None
    try:
        params = parse_qs(urlparse(url).query)
        utm_source = (params.get("utm_source") or [None])[0]
        utm_medium = (params.get("utm_medium") or [None])[0]
        if utm_source and utm_medium:
            return utm_source, utm_medium, f"{utm_source}-{utm_medium}"
        if utm_source:
            return utm_source, None, utm_source
        return None, None, None
    except Exception:
        return None, None, None


def _has_creds(gads):
    required = ("developer_token", "client_id", "client_secret", "refresh_token", "customer_id")
    return all(gads.get(k) for k in required)


def pull_google_ads_spend(credentials, date_start=None, date_stop=None):
    """
    Pull ad-level spend for the date range and return rows shaped like Meta rows.
    Extracts utm_source / utm_medium from each ad's final URL to build the key.
    """
    gads = (credentials or {}).get("google_ads", {})
    date_start = date_start or _yesterday()
    date_stop = date_stop or date_start

    if not _has_creds(gads):
        print("  Google Ads: credentials not configured — skipping (0 rows)")
        return []

    try:
        from google.ads.googleads.client import GoogleAdsClient
    except Exception as e:
        print(f"  Google Ads: library unavailable ({e}) — skipping")
        return []

    config = {
        "developer_token": gads["developer_token"],
        "client_id": gads["client_id"],
        "client_secret": gads["client_secret"],
        "refresh_token": gads["refresh_token"],
        "use_proto_plus": True,
    }
    if gads.get("login_customer_id"):
        config["login_customer_id"] = str(gads["login_customer_id"]).replace("-", "")

    customer_id = str(gads["customer_id"]).replace("-", "")

    rows = []
    try:
        client = GoogleAdsClient.load_from_dict(config)
        ga_service = client.get_service("GoogleAdsService")

        query = f"""
            SELECT
                ad_group_ad.ad.id,
                ad_group_ad.ad.name,
                ad_group_ad.ad.final_urls,
                campaign.id,
                campaign.name,
                metrics.cost_micros,
                metrics.impressions,
                metrics.clicks,
                segments.date
            FROM ad_group_ad
            WHERE segments.date BETWEEN '{date_start}' AND '{date_stop}'
              AND metrics.cost_micros > 0
        """

        stream = ga_service.search_stream(customer_id=customer_id, query=query)
        for batch in stream:
            for row in batch.results:
                ad = row.ad_group_ad.ad
                final_urls = list(ad.final_urls) if ad.final_urls else []
                url = final_urls[0] if final_urls else None
                utm_source, utm_medium, compound_key = parse_tracking_params(url)

                spend = (row.metrics.cost_micros or 0) / 1_000_000.0
                impressions = int(row.metrics.impressions or 0)
                clicks = int(row.metrics.clicks or 0)
                cpm = round(spend / impressions * 1000, 4) if impressions else 0.0
                ctr = round(clicks / impressions * 100, 4) if impressions else 0.0

                rows.append({
                    "date": str(row.segments.date),
                    "ad_id": str(ad.id),
                    "ad_name": ad.name or "",
                    "campaign_id": str(row.campaign.id),
                    "campaign_name": row.campaign.name or "",
                    "aff_id": utm_source,
                    "aff_sub": utm_medium,
                    "compound_key": compound_key,
                    "spend": spend,
                    "impressions": impressions,
                    "clicks": clicks,
                    "link_clicks": clicks,
                    "cpm": cpm,
                    "ctr": ctr,
                })

        print(f"  Google Ads: pulled {len(rows)} ad rows, "
              f"${sum(r['spend'] for r in rows):.2f} total")
    except Exception as e:
        print(f"  Google Ads ERROR: {e}")
        import traceback
        traceback.print_exc()

    return rows


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))
    from config.config import load_credentials
    for r in pull_google_ads_spend(load_credentials())[:5]:
        print(r)
