"""
zenect_scraper.py
Pulls "Good Leads" from Zenect dashboard Yesterday column.
Revenue = good_leads * 1.2 (normalization factor)

Table structure:
  Columns: URL Slug | Name, Today T|G|R, Yesterday T|G|R, Past 7 Days...
  Target row: 'mm1 | Mode Mobile' or any Mode Mobile row
  Yesterday cell format: "248 | 238 | 10"  -> T=248, G=238, R=10
  Good leads = G (middle value)
"""

import json, time
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

REVENUE_PER_LEAD = 1.2  # normalization factor

# Zenect's dashboard days run on Mountain time: "Today" rolls over ~2am Eastern
# (hourly snapshots 11/5-11/10). Before that, "Yesterday" is the day BEFORE
# yesterday — the 12:16am ET finalize stamped 11/8's $7 onto 11/9 (Mike 11/10).
# ponytail: inferred from winter rollovers only. If after DST (Mar 8 2027) the
# rollover moves to 3am EDT, the portal is America/Phoenix — swap it here.
PORTAL_TZ = ZoneInfo("America/Denver")


def zenect_column(iso_date, now=None):
    """Dashboard column holding iso_date's numbers: 'today', 'yesterday', or None."""
    portal_today = (now or datetime.now(PORTAL_TZ)).astimezone(PORTAL_TZ).date()
    return {portal_today: "today", portal_today - timedelta(days=1): "yesterday"}.get(
        date.fromisoformat(iso_date))


def pull_zenect(credentials, target_date=None):
    creds = credentials["zenect"]
    iso_date = target_date or (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    col_label = zenect_column(iso_date)

    result = {
        "date": iso_date,
        "good_leads": 0,
        "revenue": 0.0,
        "source": "zenect",
        "rows": [],
    }

    if not creds.get("username") or not creds.get("password"):
        print("  Zenect: credentials not configured — skipping")
        return result

    if col_label is None:
        if date.fromisoformat(iso_date) > datetime.now(PORTAL_TZ).date():
            print(f"  Zenect: {iso_date} hasn't started on Zenect's clock yet → $0 so far")
            return result
        raise RuntimeError(f"Zenect dashboard only shows today/yesterday — can't read {iso_date}")

    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})

        try:
            print("  Zenect: Logging in...")
            page.goto("https://mastercoreg.com/auth/login", timeout=30000)
            page.wait_for_load_state("networkidle")
            page.fill("input[name='email']", creds["username"])
            page.fill("input[name='password']", creds["password"])
            page.click("button:has-text('Sign in')")
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            print(f"  Zenect: Logged in → {page.url}")

            # Navigate to dashboard
            page.goto("https://mastercoreg.com/admin/dashboard", timeout=15000)
            page.wait_for_load_state("networkidle")
            time.sleep(2)

            # Find the Yesterday column index
            headers = [h.inner_text().strip() for h in page.query_selector_all("th")]
            print(f"  Zenect: Headers: {headers}")

            yesterday_col = None
            for i, h in enumerate(headers):
                if col_label in h.lower():
                    yesterday_col = i
                    break

            if yesterday_col is None:
                print(f"  Zenect: {col_label} column not found")
                return result

            print(f"  Zenect: {col_label.title()} column index: {yesterday_col}")

            # Parse all data rows
            rows = page.query_selector_all("tbody tr")
            for tr in rows:
                cells = tr.query_selector_all("td")
                if len(cells) <= yesterday_col:
                    continue

                name_cell = cells[0].inner_text().strip()
                yesterday_cell = cells[yesterday_col].inner_text().strip()

                # Skip totals row
                if name_cell.lower().startswith("total"):
                    continue

                # Parse T | G | R format
                parts = [p.strip() for p in yesterday_cell.split("|")]
                if len(parts) < 2:
                    continue

                try:
                    good_leads = int(parts[1].strip())
                except (ValueError, IndexError):
                    continue

                revenue = round(good_leads * REVENUE_PER_LEAD, 2)
                print(f"  Zenect: '{name_cell}' → yesterday={yesterday_cell} → G={good_leads} → ${revenue}")

                result["good_leads"] += good_leads
                result["revenue"] += revenue
                result["rows"].append({
                    "date": iso_date,
                    "name": name_cell,
                    "good_leads": good_leads,
                    "revenue": revenue,
                    "source": "zenect",
                })

        except Exception as e:
            print(f"  Zenect ERROR: {e}")
            import traceback; traceback.print_exc()
        finally:
            browser.close()

    result["revenue"] = round(result["revenue"], 2)
    print(f"  Zenect: Total good leads: {result['good_leads']} → ${result['revenue']:.2f}")
    return result


if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["--selftest"]:
        et = ZoneInfo("America/New_York")
        at = lambda h: datetime(2026, 11, 10, h, 16, tzinfo=et)
        assert zenect_column("2026-11-09", at(0)) == "today"       # 12:16am ET: Zenect still on 11/9
        assert zenect_column("2026-11-10", at(0)) is None          # ...11/10 hasn't started there
        assert zenect_column("2026-11-09", at(3)) == "yesterday"   # after the ~2am ET rollover
        assert zenect_column("2026-11-10", at(3)) == "today"
        assert zenect_column("2026-11-07", at(3)) is None          # off the dashboard
        sys.exit(print("zenect_column ok"))
    sys.path.insert(0, "..")
    with open("config/credentials.json") as f:
        creds = json.load(f)
    r = pull_zenect(creds)
    print(f"\nGood Leads: {r['good_leads']}")
    print(f"Revenue:    ${r['revenue']:.2f}")
