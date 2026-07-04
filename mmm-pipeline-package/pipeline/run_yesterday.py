"""
run_yesterday.py
Runs backfill for yesterday's date only.
Drop-in replacement for run_daily.py in Task Scheduler.

Advantages over run_daily.py:
- Error handling wraps each scraper independently
- Re-running always produces a clean overwrite (clear_date before insert)
- If it partially fails, just re-run — no manual cleanup needed
"""
import sys, subprocess
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from pathlib import Path

yesterday = (datetime.now(ZoneInfo("America/New_York")) - timedelta(days=1)).strftime("%Y-%m-%d")
backfill  = Path(__file__).parent / "backfill.py"

print(f"Running backfill for {yesterday}...")
result = subprocess.run(
    [sys.executable, str(backfill), yesterday, yesterday],
    cwd=str(Path(__file__).parent.parent)
)
sys.exit(result.returncode)
