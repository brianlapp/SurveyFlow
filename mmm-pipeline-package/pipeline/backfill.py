"""
backfill.py - Run daily pipeline for a range of past dates
Usage: python pipeline\backfill.py 2026-04-01 2026-04-29
"""
import sys
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

def backfill(start_date, end_date):
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end   = datetime.strptime(end_date,   "%Y-%m-%d")
    dates = []
    d = start
    while d <= end:
        dates.append(d.strftime("%Y-%m-%d"))
        d += timedelta(days=1)

    print(f"Backfilling {len(dates)} days: {start_date} → {end_date}")
    print("This will take ~2 min per day\n")

    runner = Path(__file__).parent / "run_daily.py"
    failed = []

    for i, date in enumerate(dates):
        print(f"[{i+1}/{len(dates)}] {date}...")
        result = subprocess.run(
            [sys.executable, str(runner), date],
            capture_output=False
        )
        if result.returncode != 0:
            print(f"  FAILED: {date}")
            failed.append(date)

        # Pause between days to avoid triggering Meta's security systems
        if i < len(dates) - 1:
            import time
            print(f"  Pausing 60s before next day...")
            time.sleep(60)

    print(f"\nBackfill complete. {len(dates)-len(failed)}/{len(dates)} days succeeded.")
    if failed:
        print(f"Failed dates: {failed}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python pipeline\\backfill.py 2026-04-01 2026-04-29")
        sys.exit(1)
    backfill(sys.argv[1], sys.argv[2])
