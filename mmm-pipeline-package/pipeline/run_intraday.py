"""
run_intraday.py
Full intraday pipeline — mirrors run_daily.py but targets TODAY (EST).
IO and Zenect scrapers run in Today mode. Google/Taboola show $0 (no sheet data
available intraday — expected). Runs every ~2 hours via a Scheduled Deployment,
or on-demand via the dashboard "Run Now" button.
"""
import sys
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from config.config import ensure_playwright
ensure_playwright()

from pipeline.database import (
    init_db, clear_date,
    insert_meta_rows, insert_google_rows, insert_ims_rows, insert_ao_rows,
    export_data, start_run_log, finish_run_log,
)
from scrapers.meta_puller import pull_meta_spend
from scrapers.google_ads_puller import pull_google_ads_spend
from scrapers.ims_scraper import pull_ims_revenue
from scrapers.afteroffers_scraper import pull_afteroffers_revenue
from scrapers.interactive_offers_scraper import pull_interactive_offers
from scrapers.zenect_scraper import pull_zenect
from config.config import load_credentials

EST = ZoneInfo("America/New_York")


def log(msg):
    print(f"[{datetime.now(EST).strftime('%H:%M:%S')}] {msg}", flush=True)


def run():
    creds = load_credentials()

    today = datetime.now(EST).strftime("%Y-%m-%d")
    log(f"Intraday full refresh for {today}")
    init_db()
    run_id = start_run_log("intraday", today)
    clear_date(today)

    errors = []
    meta_rows = google_rows = ims_rows = ao_rows = 0
    io_result = zenect_result = None

    # --- Meta ---
    log("Pulling Meta spend (today)...")
    try:
        rows, _ = pull_meta_spend(creds, date_start=today, date_stop=today)
        insert_meta_rows(rows or [])
        meta_rows = len(rows or [])
        log(f"  Meta: {meta_rows} rows")
    except Exception as e:
        log(f"  Meta FAILED: {e}"); errors.append(f"meta: {e}")

    # --- Google Ads (creative-level) ---
    log("Pulling Google Ads spend (today)...")
    try:
        rows = pull_google_ads_spend(creds, date_start=today, date_stop=today)
        insert_google_rows(rows or [])
        google_rows = len(rows or [])
        log(f"  Google Ads: {google_rows} rows")
    except Exception as e:
        log(f"  Google Ads FAILED: {e}"); errors.append(f"google_ads: {e}")

    # --- IMS ---
    log("Pulling IMS revenue (today)...")
    try:
        rows = pull_ims_revenue(creds, target_date=today)
        insert_ims_rows(rows or [])
        ims_rows = len(rows or [])
        log(f"  IMS: {ims_rows} rows")
    except Exception as e:
        log(f"  IMS FAILED: {e}"); errors.append(f"ims: {e}")

    # --- AfterOffers ---
    log("Pulling AfterOffers revenue (today)...")
    try:
        rows = pull_afteroffers_revenue(creds, target_date=today)
        insert_ao_rows(rows or [])
        ao_rows = len(rows or [])
        log(f"  AO: {ao_rows} rows")
    except Exception as e:
        log(f"  AO FAILED: {e}"); errors.append(f"ao: {e}")

    # --- Interactive Offers (Today mode) ---
    log("Pulling Interactive Offers (today)...")
    try:
        io_result = pull_interactive_offers(creds, target_date=today, intraday=True)
        log(f"  IO: CTO=${io_result.get('display_cto_revenue',0):.2f}  Co-Reg=${io_result.get('coreg_revenue',0):.2f}")
    except Exception as e:
        log(f"  IO FAILED: {e}"); errors.append(f"io: {e}")

    # --- Zenect (Today mode) ---
    log("Pulling Zenect (today)...")
    try:
        zenect_result = pull_zenect(creds, target_date=today, intraday=True)
        log(f"  Zenect: {zenect_result.get('good_leads',0)} leads  ${zenect_result.get('revenue',0):.2f}")
    except Exception as e:
        log(f"  Zenect FAILED: {e}"); errors.append(f"zenect: {e}")

    # Google/Taboola: $0 intraday (sheet not available until end of day)
    sheets_result = {"google_spend": 0.0, "taboola_spend": 0.0}
    log("  Google=$0.00  Taboola=$0.00 (sheet not available intraday)")

    # --- Join & persist relational snapshot ---
    log("Joining data and writing performance snapshot...")
    try:
        data = export_data(
            date=today,
            io_result=io_result,
            zenect_result=zenect_result,
            sheets_result=sheets_result,
        )
        joined_rows = len(data["performance"])
        log(f"  Exported {joined_rows} rows, gross ${data.get('gross_total',0):.2f}")
    except Exception as e:
        log(f"  Export FAILED: {e}")
        import traceback; traceback.print_exc()
        finish_run_log(run_id, status="error", errors=errors + [f"export: {e}"])
        return

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
    )

    if errors:
        log(f"Done with {len(errors)} non-fatal errors: {errors}")
    else:
        log("Intraday refresh complete ✅")


if __name__ == "__main__":
    run()
