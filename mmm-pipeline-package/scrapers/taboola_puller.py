"""
taboola_puller.py
Pulls Taboola spend from the Taboola Backstage API.

Replaces the sheet-only path for Taboola spend (previously $0 intraday, since the
tracking Google Sheet isn't populated until end of day). Returns a single daily
spend total for the target date — the same granularity `mmm_daily_spend` stores
and `export_data` distributes across meta-Tab rows by impressions.

Credentials (Replit Secrets, read via config.load_credentials()["taboola"]):
  TABOOLA_CLIENT_ID, TABOOLA_CLIENT_SECRET, TABOOLA_ACCOUNT_ID

Auth is OAuth2 client_credentials against Backstage; the report used is
campaign-summary rolled up by day. Any missing credential or API error returns
0.0 so a Taboola outage never breaks the run (mirrors the other scrapers).
"""
import requests

TOKEN_URL = "https://backstage.taboola.com/backstage/oauth/token"
BASE = "https://backstage.taboola.com/backstage/api/1.0"


def _get_token(client_id, client_secret):
    resp = requests.post(
        TOKEN_URL,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "client_credentials",
        },
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def pull_taboola_spend(creds, target_date):
    """
    Return total Taboola spend (float USD) for target_date (YYYY-MM-DD).
    Returns 0.0 if credentials are absent or the API call fails.
    """
    tab = (creds or {}).get("taboola", {})
    client_id = tab.get("client_id")
    client_secret = tab.get("client_secret")
    account_id = tab.get("account_id")
    if not (client_id and client_secret and account_id):
        print("  Taboola: credentials not configured — skipping (spend $0)")
        return 0.0

    try:
        token = _get_token(client_id, client_secret)
        url = (
            f"{BASE}/{account_id}/reports/campaign-summary/dimensions/day"
            f"?start_date={target_date}&end_date={target_date}"
        )
        resp = requests.get(
            url, headers={"Authorization": f"Bearer {token}"}, timeout=30
        )
        resp.raise_for_status()
        results = resp.json().get("results", []) or []
        spend = round(sum(float(r.get("spent", 0) or 0) for r in results), 2)
        print(f"  Taboola: ${spend:.2f} for {target_date} ({len(results)} rows)")
        return spend
    except Exception as e:
        print(f"  Taboola FAILED: {e}")
        return 0.0
