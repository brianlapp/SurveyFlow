"""
run_daily.py - Daily orchestrator
Sources: Meta, Google Ads, IMS, AfterOffers, Interactive Offers, Zenect, Sheet.

Writes joined per-creative rows to mmm_performance_daily and a run summary to
mmm_run_log. Designed to run as a Scheduled Deployment (daily ~09:00 EST) or
on-demand via the dashboard "Run Now" button.
"""

import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from scrapers.meta_puller import pull_meta_spend
from scrapers.google_ads_puller import pull_google_ads_spend
from scrapers.ims_scraper import pull_ims_revenue
from scrapers.afteroffers_scraper import pull_afteroffers_revenue
from scrapers.interactive_offers_scraper import pull_interactive_offers
from scrapers.zenect_scraper import pull_zenect
from scrapers.sheets_reader import pull_sheet_data
from pipeline.database import (
    init_db, clear_date, insert_meta_rows, insert_google_rows,
    insert_ims_rows, insert_ao_rows, export_data, insert_daily_spend,
    start_run_log, finish_run_log,
)
from pipeline.check_token import check_meta_token
from config.config import load_credentials, GOOGLE_SPREADSHEET_ID

EST = ZoneInfo("America/New_York")


def log(msg):
    print(f"[{datetime.now(EST).strftime('%H:%M:%S')}] {msg}", flush=True)


def run(target_date=None):
    if not target_date:
        target_date = (datetime.now(EST) - timedelta(days=1)).strftime("%Y-%m-%d")

    log(f"Starting daily pull for {target_date}")

    creds = load_credentials()

    # Check Meta token expiry — warns if expiring within 7 days (non-fatal)
    check_meta_token(creds)

    init_db()
    run_id = start_run_log("daily", target_date)
    clear_date(target_date)

    errors = []
    meta_rows = google_rows = ims_rows = ao_rows = 0
    io_result = zenect_result = sheets_result = None

    # --- Google Sheet (Google + Taboola spend) ---
    log("Reading Google Sheet for Google + Taboola spend...")
    try:
        import requests as req
        target_dt = datetime.strptime(target_date, "%Y-%m-%d")
        sheet_content = None
        for tab_name in [target_dt.strftime("%B %Y"), target_dt.strftime("%b %Y")]:
            url = (f"https://docs.google.com/spreadsheets/d/{GOOGLE_SPREADSHEET_ID}"
                   f"/gviz/tq?tqx=out:csv&sheet={tab_name.replace(' ', '%20')}")
            r = req.get(url, timeout=15)
            if r.ok and len(r.text) > 100:
                sheet_content = r.text
                log(f"  Sheet tab '{tab_name}' fetched ({len(sheet_content)} chars)")
                break
        if sheet_content:
            sheets_result = pull_sheet_data(target_date=target_date, sheet_content=sheet_content)
            if sheets_result.get("google_spend", 0) > 0 or sheets_result.get("taboola_spend", 0) > 0:
                insert_daily_spend(
                    target_date,
                    sheets_result.get("google_spend", 0),
                    sheets_result.get("taboola_spend", 0),
                )
        else:
            log("  Sheet: Could not fetch tab — check sheet sharing settings")
    except Exception as e:
        log(f"  Sheet FAILED: {e}")
        errors.append(f"sheets: {e}")

    # --- Meta ---
    log("Pulling Meta Ads spend...")
    try:
        rows, unmatched = pull_meta_spend(creds, date_start=target_date, date_stop=target_date)
        insert_meta_rows(rows)
        meta_rows = len(rows)
        log(f"  Meta: {meta_rows} rows ({len(unmatched)} unmatched)")
    except Exception as e:
        log(f"  Meta FAILED: {e}")
        errors.append(f"meta: {e}")

    # --- Google Ads (creative-level) ---
    log("Pulling Google Ads spend...")
    try:
        rows = pull_google_ads_spend(creds, date_start=target_date, date_stop=target_date)
        insert_google_rows(rows)
        google_rows = len(rows)
        log(f"  Google Ads: {google_rows} rows")
    except Exception as e:
        log(f"  Google Ads FAILED: {e}")
        errors.append(f"google_ads: {e}")

    # --- IMS ---
    log("Pulling IMS revenue...")
    try:
        rows = pull_ims_revenue(creds, target_date=target_date)
        insert_ims_rows(rows)
        ims_rows = len(rows)
        log(f"  IMS: {ims_rows} rows")
    except Exception as e:
        log(f"  IMS FAILED: {e}")
        errors.append(f"ims: {e}")

    # --- AfterOffers ---
    log("Pulling AfterOffers revenue...")
    try:
        rows = pull_afteroffers_revenue(creds, target_date=target_date)
        insert_ao_rows(rows)
        ao_rows = len(rows)
        log(f"  AfterOffers: {ao_rows} rows")
    except Exception as e:
        log(f"  AfterOffers FAILED: {e}")
        errors.append(f"afteroffers: {e}")

    # Detect if this is a backfill run (not yesterday in EST)
    yesterday = (datetime.now(EST) - timedelta(days=1)).strftime("%Y-%m-%d")
    is_backfill = target_date != yesterday

    # --- Interactive Offers ---
    log("Pulling Interactive Offers revenue...")
    try:
        if is_backfill and sheets_result and sheets_result.get("io_cto", 0) > 0:
            io_result = {
                "display_cto_revenue": sheets_result["io_cto"],
                "coreg_revenue":       sheets_result["io_coreg"],
                "total_revenue":       sheets_result["io_cto"] + sheets_result["io_coreg"],
                "source": "sheet",
            }
            log(f"  IO (from sheet): CTO=${io_result['display_cto_revenue']:.2f} Co-Reg=${io_result['coreg_revenue']:.2f}")
        else:
            io_result = pull_interactive_offers(creds, target_date=target_date)
            log(f"  IO: Display CTO=${io_result['display_cto_revenue']:.2f} Co-Reg=${io_result['coreg_revenue']:.2f}")
    except Exception as e:
        log(f"  IO FAILED: {e}")
        errors.append(f"interactive_offers: {e}")

    # --- Zenect ---
    log("Pulling Zenect revenue...")
    try:
        if is_backfill and sheets_result and sheets_result.get("zenect", 0) > 0:
            zen_rev = sheets_result["zenect"]
            zenect_result = {
                "revenue":    zen_rev,
                "good_leads": round(zen_rev / 1.2),
                "source":     "sheet",
            }
            log(f"  Zenect (from sheet): ${zen_rev:.2f}")
        else:
            zenect_result = pull_zenect(creds, target_date=target_date)
            log(f"  Zenect: {zenect_result['good_leads']} good leads → ${zenect_result['revenue']:.2f}")
    except Exception as e:
        log(f"  Zenect FAILED: {e}")
        errors.append(f"zenect: {e}")

    # --- Join & persist relational snapshot ---
    log("Joining data and writing performance snapshot...")
    data = export_data(date=target_date,
                       io_result=io_result,
                       zenect_result=zenect_result,
                       sheets_result=sheets_result)
    joined_rows = len(data["performance"])
    log(f"  Joined: {joined_rows} creative rows")

    # --- AI Daily Summary (optional; skipped without ANTHROPIC_API_KEY) ---
    ai_summary = ""
    anthropic_key = creds.get("anthropic", {}).get("api_key", "")
    if anthropic_key:
        log("Generating AI summary...")
        try:
            import requests as req2
            perf     = data["performance"]
            total_sp = round(data.get("total_spend", 0), 2)
            ims_rev  = round(sum((r.get("ims_revenue") or 0) for r in perf), 2)
            ao_rev   = round(sum((r.get("ao_revenue") or 0) for r in perf), 2)
            io_cto   = round(io_result.get("display_cto_revenue", 0) if io_result else 0, 2)
            io_coreg = round(io_result.get("coreg_revenue", 0) if io_result else 0, 2)
            zen_rev  = round(zenect_result.get("revenue", 0) if zenect_result else 0, 2)
            gross    = round(data.get("gross_total", 0), 2)
            combined = round(data.get("combined_revenue", 0), 2)
            roas     = round(combined / total_sp, 2) if total_sp else 0

            top_creatives = sorted(
                [r for r in perf if (r.get("spend") or 0) > 0 and r.get("adjusted_roas")],
                key=lambda x: x.get("adjusted_roas", 0), reverse=True)[:3]
            bottom_creatives = sorted(
                [r for r in perf if (r.get("spend") or 0) > 0 and r.get("adjusted_roas") is not None],
                key=lambda x: x.get("adjusted_roas", 0))[:3]
            top_str    = ", ".join(f"{r['compound_key']} ({r['adjusted_roas']:.2f}x)" for r in top_creatives)
            bottom_str = ", ".join(f"{r['compound_key']} ({r['adjusted_roas']:.2f}x)" for r in bottom_creatives)

            prompt = f"""You are an expert digital advertising analyst for ModeMarketMunchies, a lead generation business.
Analyze yesterday's performance data and write a detailed analyst-style summary with context and actionable suggestions.
Be specific with numbers. Write 4-6 sentences. No bullet points — flowing paragraph format.

Date: {target_date}
Total Spend: ${total_sp:,}
Combined Revenue: ${combined:,}
Day 0 ROAS: {roas}x
Net Profit: ${combined - total_sp:,.2f}

Revenue by Source:
- IMS (TMG): ${ims_rev:,}
- AfterOffers: ${ao_rev:,} (tentative)
- Interactive CTO: ${io_cto:,}
- Interactive Co-Reg: ${io_coreg:,}
- Zenect: ${zen_rev:,}

Top creatives by Adjusted ROAS: {top_str if top_str else 'N/A'}
Lowest creatives by Adjusted ROAS: {bottom_str if bottom_str else 'N/A'}

Write the summary now:"""

            ai_resp = req2.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": anthropic_key,
                    "anthropic-version": "2023-06-01",
                },
                json={
                    "model": "claude-sonnet-4-5-20250929",
                    "max_tokens": 400,
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=30,
            )
            ai_resp.raise_for_status()
            ai_summary = ai_resp.json()["content"][0]["text"].strip()
            log(f"  AI Summary: generated ({len(ai_summary)} chars)")
        except Exception as e:
            log(f"  AI Summary FAILED (non-fatal): {e}")
            ai_summary = ""
    else:
        log("  AI Summary: skipped (no ANTHROPIC_API_KEY)")

    # --- Finalize run log ---
    sources_status = [
        {"source": "meta",        "rows": meta_rows},
        {"source": "google_ads",  "rows": google_rows},
        {"source": "ims",         "rows": ims_rows},
        {"source": "afteroffers", "rows": ao_rows},
        {"source": "interactive_offers", "cto": round(io_result.get("display_cto_revenue", 0) if io_result else 0, 2),
         "coreg": round(io_result.get("coreg_revenue", 0) if io_result else 0, 2)},
        {"source": "zenect",      "revenue": round(zenect_result.get("revenue", 0) if zenect_result else 0, 2)},
    ]
    finish_run_log(
        run_id,
        status="error" if errors else "success",
        counts={"meta": meta_rows, "google": google_rows, "ims": ims_rows,
                "ao": ao_rows, "joined": joined_rows},
        totals={"total_spend": round(data.get("total_spend", 0), 2),
                "combined_revenue": round(data.get("combined_revenue", 0), 2)},
        sources=sources_status,
        errors=errors,
        ai_summary=ai_summary,
    )

    log(f"Done. Meta:{meta_rows} Google:{google_rows} IMS:{ims_rows} AO:{ao_rows} Joined:{joined_rows}")
    if errors:
        log(f"Errors: {errors}")

    return {"meta": meta_rows, "google": google_rows, "ims": ims_rows, "ao": ao_rows,
            "joined": joined_rows, "errors": errors}


if __name__ == "__main__":
    date_arg = sys.argv[1] if len(sys.argv) > 1 else None
    run(date_arg)
