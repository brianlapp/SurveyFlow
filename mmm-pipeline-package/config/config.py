"""
config.py
Central credential + settings loader for the MMM pipeline.

All secrets are read from environment variables (Replit Secrets) — there is no
credentials.json on disk. Missing credentials are returned as empty strings so
each scraper can skip gracefully (empty data is acceptable until creds exist).
"""

import os


# Public Google Sheet used for Google/Taboola spend + backfill revenue.
# Overridable via env; falls back to the known tracking sheet.
GOOGLE_SPREADSHEET_ID = os.environ.get(
    "GOOGLE_SPREADSHEET_ID",
    "1cu3JFqtNYdXDUSXeYPS_12yTG1S4HaZSR5sEi-8SBj4",
)


def _env(*names, default=""):
    """Return the first non-empty environment variable among ``names``."""
    for n in names:
        v = os.environ.get(n)
        if v:
            return v
    return default


def load_credentials():
    """
    Build the nested credentials dict the scrapers expect, sourced entirely
    from environment variables. Any absent value is an empty string.

    IMS runs on admin.tmginteractive.com — the existing TMG_REVENUE_USER /
    TMG_REVENUE_PASSWORD secrets are its login and are used as the default.
    """
    return {
        "meta": {
            "access_token": _env("META_ACCESS_TOKEN"),
            "ad_account_id": _env("META_AD_ACCOUNT_ID"),
        },
        "ims": {
            "username": _env("IMS_USERNAME", "TMG_REVENUE_USER"),
            "password": _env("IMS_PASSWORD", "TMG_REVENUE_PASSWORD"),
        },
        "afteroffers": {
            "username": _env("AFTEROFFERS_USERNAME"),
            "password": _env("AFTEROFFERS_PASSWORD"),
        },
        "interactive_offers": {
            "username": _env("INTERACTIVE_OFFERS_USERNAME"),
            "password": _env("INTERACTIVE_OFFERS_PASSWORD"),
        },
        "zenect": {
            "username": _env("ZENECT_USERNAME"),
            "password": _env("ZENECT_PASSWORD"),
        },
        "anthropic": {
            "api_key": _env("ANTHROPIC_API_KEY"),
        },
        "google_ads": {
            "developer_token": _env("GOOGLE_ADS_DEVELOPER_TOKEN"),
            "client_id": _env("GOOGLE_ADS_CLIENT_ID"),
            "client_secret": _env("GOOGLE_ADS_CLIENT_SECRET"),
            "refresh_token": _env("GOOGLE_ADS_REFRESH_TOKEN"),
            "login_customer_id": _env("GOOGLE_ADS_LOGIN_CUSTOMER_ID"),
            "customer_id": _env("GOOGLE_ADS_CUSTOMER_ID"),
        },
        "spreadsheet_id": GOOGLE_SPREADSHEET_ID,
    }
