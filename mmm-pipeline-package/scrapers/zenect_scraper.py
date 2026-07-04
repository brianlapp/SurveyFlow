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
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright

REVENUE_PER_LEAD = 1.2  # normalization factor


def pull_zenect(credentials, target_date=None, intraday=False):
    creds = credentials["zenect"]
    iso_date = target_date or (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

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

            col_label = "today" if intraday else "yesterday"
            yesterday_col = None
            for i, h in enumerate(headers):
                if col_label in h.lower():
                    yesterday_col = i
                    break
            # Fallback: if today col not found, use yesterday
            if yesterday_col is None and intraday:
                for i, h in enumerate(headers):
                    if "yesterday" in h.lower():
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
    sys.path.insert(0, "..")
    with open("config/credentials.json") as f:
        creds = json.load(f)
    r = pull_zenect(creds)
    print(f"\nGood Leads: {r['good_leads']}")
    print(f"Revenue:    ${r['revenue']:.2f}")
