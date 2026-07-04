"""
check_token.py
Lightweight Meta access-token expiry check. Non-fatal: warns if the token is
expiring soon or invalid, but never raises so the daily run can continue.
"""

from datetime import datetime, timezone

import requests


def check_meta_token(creds):
    token = (creds or {}).get("meta", {}).get("access_token", "")
    if not token:
        print("  [token] No Meta access token configured — skipping check")
        return

    try:
        resp = requests.get(
            "https://graph.facebook.com/v19.0/debug_token",
            params={"input_token": token, "access_token": token},
            timeout=15,
        )
        data = resp.json().get("data", {})

        if not data.get("is_valid", False):
            print(f"  [token] ⚠️  Meta token invalid: {data.get('error', {}).get('message', 'unknown')}")
            return

        expires_at = data.get("data_access_expires_at") or data.get("expires_at") or 0
        if not expires_at:
            print("  [token] Meta token valid (no expiry / long-lived)")
            return

        exp_dt = datetime.fromtimestamp(expires_at, tz=timezone.utc)
        days_left = (exp_dt - datetime.now(timezone.utc)).days
        if days_left <= 7:
            print(f"  [token] ⚠️  Meta token expires in {days_left} day(s) ({exp_dt.date()}) — renew soon")
        else:
            print(f"  [token] Meta token valid — {days_left} days left ({exp_dt.date()})")
    except Exception as e:
        print(f"  [token] Meta token check failed (non-fatal): {e}")
