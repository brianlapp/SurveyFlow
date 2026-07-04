# ModeMarketMunchies (MMM) Ad Revenue Intelligence Pipeline

## Overview
Automated daily pipeline that scrapes ad spend and revenue data from 5 sources, 
stores in SQLite, and pushes to a LeadPulse/Lovable dashboard for ROAS analysis.

## Architecture

```
Pipeline Flow:
  Meta Ads API     → spend per creative (compound key)
  IMS / Tiburon    → attributed eCPM revenue per creative
  AfterOffers      → lead revenue per creative  
  Interactive Offers → gross CTO revenue (unattributed)
  Zenect           → gross coreg revenue (unattributed)
  Google Sheet     → Google + Taboola spend, IO/Zenect fallback
        ↓
  SQLite DB (mmm.db)
        ↓
  LeadPulse Dashboard (Lovable)
```

## File Structure

```
mmm-dashboard/
├── config/
│   └── credentials.json          # API keys, tokens (NOT committed to git)
├── pipeline/
│   ├── run_yesterday.py          # ★ MAIN DAILY RUNNER (Task Scheduler entry point)
│   ├── backfill.py               # Run for date range: python backfill.py 2026-06-01 2026-06-14
│   ├── run_intraday.py           # 2-hour intraday refresh (Meta + IMS + AO + IO + Zenect)
│   ├── run_daily.py              # Full daily pipeline (called by backfill.py)
│   ├── smart_runner.py           # Waits for sheet data, then triggers run_daily
│   ├── database.py               # ★ Core: SQLite schema, joins, normalization, export
│   └── sheets_reader.py          # Google Sheets reader for spend + revenue fallbacks
├── scrapers/
│   ├── meta_puller.py            # Meta Marketing API v19.0
│   ├── ims_scraper.py            # Playwright → Tiburon/IMS portal
│   ├── afteroffers_scraper.py    # Playwright → AfterOffers CSV export
│   ├── interactive_offers_scraper.py  # Playwright → Interactive Offers dashboard
│   └── zenect_scraper.py         # Playwright → Zenect/MasterCoReg dashboard
├── data/
│   └── mmm.db                    # SQLite database
└── debug/                        # Diagnostic scripts (not part of main pipeline)
    ├── audit_meta_spend.py       # Verify Meta API vs DB spend totals
    ├── debug_ad_urls.py          # Extract all Meta ad destination URLs
    ├── debug_ims_leads.py        # Compare IMS impressions vs platform leads
    ├── debug_freeshares.py       # Trace unattributed freeshares traffic
    └── debug_orphans.py          # Find compound key mismatches
```

## Compound Key System
All revenue sources are joined on a `compound_key` = `{utm_source}-{utm_medium}` or `{aff_id}-{aff_sub}`.

**Normalization rules** (applied at insert time in database.py):
- Strip trailing `-MMDD` date suffix (e.g. `-0429` = April 29)
- Strip trailing `-[letter]` after digit (e.g. `-B` variant)

**Fallback keys** (applied post-join in get_joined_performance):
- Stockoffer: `meta-0510-50-Ad6` → `meta-0510-6`
- Budget strip: `meta-0615-50-Ad1` → `meta-0615-Ad1`
- Manual alias: `meta-1230-A-Ad4` → `meta-0323-A-Ad4`

**Three landers:**
| Lander | Domain | utm_source |
|--------|--------|-----------|
| Main MMM | join.modemarketmunchies.com/mmm-signup-15-v4/ | meta |
| Stockoffer | stockoffer.modemarketmunchies.com/ | meta (aff_id) |
| FreeFinds | join.modefreefinds.com/mmm-signup-15-v5/ | metav2 |

## Database Schema

```sql
meta_spend:   date, ad_id, compound_key, spend, impressions, clicks, link_clicks, cpm, ctr
ims_revenue:  date, compound_key, revenue, impressions, ecpm
ao_revenue:   date, compound_key, revenue, signups, epi
daily_spend:  date, google_spend, taboola_spend  (from Google Sheet)
```

## LeadPulse Payload Structure
```json
{
  "date": "2026-06-15",
  "partial": false,
  "performance": [...],        // per-creative rows with ROAS
  "sources": [...],            // 5 revenue source totals
  "platform_pnl": [...],       // Meta/Google/Taboola P&L
  "meta_deep_dive": {...},     // 7D vs prev-7D CPM/CTR/conv_rate
  "summary": [...],            // 30-day trend data
  "sheet_metrics": {...}       // total_leads, rpl, cpl
}
```

## credentials.json Structure
```json
{
  "meta": {
    "access_token": "EAANi...",
    "ad_account_id": "act_1224818999387790"
  },
  "ims": {
    "username": "...",
    "password": "...",
    "url": "https://..."
  },
  "afteroffers": {
    "username": "...",
    "password": "...",
    "url": "https://..."
  },
  "interactive_offers": {
    "username": "...",
    "password": "..."
  },
  "zenect": {
    "username": "...",
    "password": "..."
  },
  "google_sheets": {
    "credentials_file": "config/google_service_account.json",
    "spreadsheet_id": "1cu3JFqtNYdXDUSXeYPS_12yTG1S4HaZSR5sEi-8SBj4"
  },
  "leadpulse": {
    "ingest_url": "https://...",
    "ingest_secret": "..."
  },
  "anthropic": {
    "api_key": "sk-ant-..."
  }
}
```

## Task Scheduler (Windows)
```
Task:    MMM Daily Run
Command: python C:\Users\mike\Downloads\mmm-dashboard\mmm-dashboard\pipeline\run_yesterday.py
Schedule: Daily at 09:00 AM

Task:    MMM Intraday Refresh  
Command: python C:\Users\mike\Downloads\mmm-dashboard\mmm-dashboard\pipeline\run_intraday.py
Schedule: Every 2 hours starting 09:00 AM
```

## Known Issues / Active Work
1. **Meta API access suspended** — Facebook dev account restricted after password reset. 
   Needs developers.facebook.com access restored, then generate new access token.
   Token was expiring July 4, 2026 anyway.
   
2. **AfterOffers timezone** — Scraper uses GMT default, should use EST (America/New_York).
   The selector element name differs from expected. Needs browser inspection to find correct 
   HTML element name for the timezone dropdown.

3. **IMS impressions vs total leads gap** — Known ~15-20% drop-off expected (not all leads 
   complete the post-signup IMS monetization step). modefreefinds lander has intermittent 
   IMS widget load issue — needs web developer investigation.

## Dependencies
```
playwright
requests
gspread
google-auth
sqlite3 (stdlib)
```

Install: `pip install playwright requests gspread google-auth && playwright install chromium`
