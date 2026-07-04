"""
smart_runner.py
Waits for Google Sheet to have Google + Taboola spend filled in,
then triggers the full daily pipeline automatically.

Schedule this instead of run_daily.py:
  schtasks /create /tn "MMM Smart Runner" /tr "python C:\...\pipeline\smart_runner.py" /sc daily /st 07:00 /f

Logic:
  - Checks sheet every 30 minutes
  - If Google+Agency spend > 0 for yesterday → runs pipeline
  - Gives up after MAX_HOURS and sends a warning
  - Won't run twice for the same date
"""

import sys
import json
import time
import subprocess
import requests
from datetime import datetime, timedelta
from pathlib import Path

MAX_HOURS    = 6      # give up after 6 hours (1pm if starting at 7am)
RETRY_MINS   = 30     # check every 30 minutes
SHEET_ID     = "1cu3JFqtNYdXDUSXeYPS_12yTG1S4HaZSR5sEi-8SBj4"

BASE_DIR     = Path(__file__).parent.parent
STATE_FILE   = BASE_DIR / "data" / "smart_runner_state.json"
RUNNER       = BASE_DIR / "pipeline" / "run_daily.py"


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def get_yesterday():
    return (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")


def already_ran_today(target_date):
    """Check if we already successfully ran for this date today."""
    if not STATE_FILE.exists():
        return False
    try:
        state = json.loads(STATE_FILE.read_text())
        return state.get("last_run_date") == target_date
    except Exception:
        return False


def mark_ran(target_date):
    STATE_FILE.parent.mkdir(exist_ok=True)
    STATE_FILE.write_text(json.dumps({
        "last_run_date": target_date,
        "ran_at": datetime.now().isoformat(),
    }))


def fetch_sheet_spend(target_date):
    """
    Fetch the Google Sheet and check if Google+Agency spend is filled in.
    Returns (google_spend, taboola_spend) or (0, 0) if not found/filled.
    """
    dt = datetime.strptime(target_date, "%Y-%m-%d")

    for tab_name in [dt.strftime("%b %Y"), dt.strftime("%B %Y")]:
        try:
            url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={tab_name.replace(' ', '%20')}"
            r = requests.get(url, timeout=15)
            if not r.ok or len(r.text) < 100:
                continue

            import csv, io
            reader = csv.reader(io.StringIO(r.text))
            rows = list(reader)

            # Find header
            col_google = col_taboola = None
            for i, row in enumerate(rows):
                rl = [c.lower().strip() for c in row]
                if any("cost + agency" in c for c in rl):
                    for j, h in enumerate(rl):
                        if "cost + agency" in h:
                            col_google = j
                        elif "cost (taboola)" in h:
                            col_taboola = j
                    break

            col_google  = col_google  or 4
            col_taboola = col_taboola or 6

            # Find yesterday's row
            m, d, y = dt.month, dt.day, dt.year
            patterns = [f"{m}/{d}/{y}", f"{m:02d}/{d:02d}/{y}"]

            for row in rows:
                if not row:
                    continue
                date_cell = row[0].strip().strip('"')
                if any(p in date_cell for p in patterns):
                    def parse(val):
                        try:
                            return float(str(val).replace("$","").replace(",","").strip())
                        except:
                            return 0.0
                    g = parse(row[col_google])  if col_google  < len(row) else 0.0
                    t = parse(row[col_taboola]) if col_taboola < len(row) else 0.0
                    return g, t

        except Exception as e:
            log(f"  Sheet check error: {e}")

    return 0.0, 0.0


def run_pipeline(target_date):
    log(f"🚀 Running pipeline for {target_date}...")
    result = subprocess.run(
        [sys.executable, str(RUNNER), target_date],
        capture_output=False
    )
    if result.returncode == 0:
        mark_ran(target_date)
        log(f"✅ Pipeline completed for {target_date}")
        return True
    else:
        log(f"❌ Pipeline failed (exit code {result.returncode})")
        return False


def notify(msg):
    """Simple Windows toast notification."""
    try:
        subprocess.run([
            "powershell", "-Command",
            f"[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; "
            f"[System.Windows.Forms.MessageBox]::Show('{msg}', 'MMM Pipeline')"
        ], capture_output=True, timeout=5)
    except Exception:
        pass  # notification is best-effort


def main():
    target_date = get_yesterday()
    log(f"Smart Runner started for {target_date}")

    # Don't run twice for same date
    if already_ran_today(target_date):
        log(f"Already ran for {target_date} today — skipping")
        return

    deadline = datetime.now() + timedelta(hours=MAX_HOURS)
    attempt  = 0

    while datetime.now() < deadline:
        attempt += 1
        log(f"Attempt {attempt}: Checking sheet for {target_date}...")

        google_spend, taboola_spend = fetch_sheet_spend(target_date)
        log(f"  Sheet → Google+Agency=${google_spend:.2f}  Taboola=${taboola_spend:.2f}")

        if google_spend > 0:
            log(f"✅ Sheet data ready! Google=${google_spend:.2f} Taboola=${taboola_spend:.2f}")
            success = run_pipeline(target_date)
            if success:
                notify(f"MMM pipeline ran successfully for {target_date}")
            return
        else:
            next_check = datetime.now() + timedelta(minutes=RETRY_MINS)
            log(f"  Sheet not ready yet. Next check at {next_check.strftime('%H:%M')}...")
            time.sleep(RETRY_MINS * 60)

    # Timed out
    log(f"⚠️  Gave up after {MAX_HOURS} hours — sheet never had data for {target_date}")
    log(f"   Run manually: python pipeline\\run_daily.py {target_date}")
    notify(f"MMM pipeline WARNING: Sheet data never appeared for {target_date}. Run manually.")


def poll_for_dashboard_trigger():
    """
    Poll LeadPulse for manual refresh requests triggered from the dashboard.
    Runs as a background loop — check every 2 minutes for a pending trigger.
    """
    import requests as req
    import json
    with open(CREDS_PATH) as f:
        creds = json.load(f)
    lp = creds.get("leadpulse", {})
    trigger_url = lp.get("ingest_url", "").replace("/ingest", "/trigger")
    secret = lp.get("ingest_secret", "")
    headers = {"x-ingest-secret": secret}

    log("Dashboard trigger polling started (every 2 min)...")
    while True:
        try:
            resp = req.get(trigger_url, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("pending"):
                    log("🔔 Dashboard refresh triggered!")
                    subprocess.run(
                        [sys.executable, str(PIPELINE_DIR / "run_intraday.py")],
                        check=False
                    )
                    # Mark trigger as handled
                    req.post(trigger_url + "/clear", headers=headers, timeout=10)
                    log("✅ Intraday refresh complete, trigger cleared")
        except Exception as e:
            pass  # Silently continue polling if endpoint not available
        time.sleep(120)  # Check every 2 minutes


if __name__ == "__main__":
    import threading
    # Start dashboard trigger polling in background thread
    t = threading.Thread(target=poll_for_dashboard_trigger, daemon=True)
    t.start()
    # Run the main daily pipeline logic
    main()
