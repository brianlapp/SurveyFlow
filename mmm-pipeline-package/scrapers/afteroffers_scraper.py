"""
afteroffers_scraper.py
Logs into AfterOffers, selects Market Munchies host, sets date to yesterday,
clicks Export CSV, parses the downloaded file.
Falls back to table scraping if export fails.

CSV columns: host, utm_source, utm_medium, utm_term, utm_content,
             utm_campaign, impressions, opt-ins, total sign-ups, earnings, EPI
Ground truth revenue = earnings column (actual, not tentative)
"""

import json, time, os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from pathlib import Path
from playwright.sync_api import sync_playwright

EST = ZoneInfo("America/New_York")


def get_yesterday_range():
    # Use Eastern time so "yesterday" matches every other source's timezone.
    yesterday = datetime.now(EST) - timedelta(days=1)
    return yesterday.strftime("%Y-%m-%d"), yesterday.strftime("%m/%d/%Y")


def build_compound_key(utm_source, utm_medium):
    if utm_source and utm_medium:
        return f"{utm_source}-{utm_medium}"
    return utm_source or None


def pull_afteroffers_revenue(credentials, target_date=None):
    creds = credentials["afteroffers"]
    if not creds.get("username") or not creds.get("password"):
        print("  AfterOffers: credentials not configured — skipping (0 rows)")
        return []
    iso_date, date_display = get_yesterday_range()
    if target_date:
        iso_date = target_date
        dt = datetime.strptime(target_date, "%Y-%m-%d")
        date_display = dt.strftime("%m/%d/%Y")

    rows = []
    download_dir = Path(__file__).parent.parent / "data"
    download_dir.mkdir(exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            accept_downloads=True
        )
        page = context.new_page()

        try:
            # Login
            print("  AfterOffers: Logging in...")
            page.goto("https://users.afteroffers.com/auth/login", timeout=30000)
            page.wait_for_load_state("networkidle")
            page.fill("input[name='identity']", creds["username"])
            page.fill("input[name='password']", creds["password"])
            page.click("button[type='submit']")
            page.wait_for_load_state("networkidle")
            print(f"  AfterOffers: Logged in")

            # Navigate to tracking
            page.goto("https://users.afteroffers.com/tracking/index", timeout=15000)
            page.wait_for_load_state("networkidle")

            # Select ONLY Mode Mobile Market Munchies
            sel = page.query_selector("select[name='hosts[]']")
            if sel:
                options = sel.query_selector_all("option")
                for opt in options:
                    txt = opt.inner_text().strip()
                    is_mmm = "market munchies" in txt.lower()
                    opt.evaluate(f"el => el.selected = {'true' if is_mmm else 'false'}")
                    if is_mmm:
                        print(f"  AfterOffers: Selected host: {txt}")

            # Set timezone to EST (America/New_York) to match all other sources
            tz_sel = page.query_selector("select[name='timezone']")
            if not tz_sel:
                tz_sel = page.query_selector("select[name='tz']")
            if tz_sel:
                # Try common EST option values
                for est_val in ["America/New_York", "EST", "US/Eastern", "-5", "Eastern Time"]:
                    try:
                        tz_sel.select_option(est_val)
                        print(f"  AfterOffers: Timezone set to EST ({est_val})")
                        break
                    except Exception:
                        continue
                else:
                    # Fallback: iterate options looking for EST/New_York
                    for opt in tz_sel.query_selector_all("option"):
                        txt = opt.inner_text().strip()
                        val = opt.get_attribute("value") or ""
                        if any(k in txt.lower() or k in val.lower()
                               for k in ["new_york", "eastern", "est", "america/new"]):
                            opt.evaluate("el => el.selected = true")
                            print(f"  AfterOffers: Timezone set to: {txt}")
                            break
            else:
                print("  AfterOffers: No timezone selector found — using account default")

            # Set date range
            page.fill("input[name='from']", date_display)
            page.fill("input[name='to']", date_display)

            # Submit form
            page.click("button[type='submit']")
            page.wait_for_load_state("networkidle")
            time.sleep(1.5)

            # Try to click Export / Download CSV button
            csv_path = None
            for selector in [
                "a:has-text('Export')", "button:has-text('Export')",
                "a:has-text('CSV')", "button:has-text('CSV')",
                "a:has-text('Download')", "input[value*='Export' i]",
                "[href*='export' i]", "[href*='csv' i]",
            ]:
                el = page.query_selector(selector)
                if el and el.is_visible():
                    print(f"  AfterOffers: Found export button: {selector}")
                    with page.expect_download(timeout=15000) as dl:
                        el.click()
                    download = dl.value
                    csv_path = str(download_dir / f"ao_export_{iso_date}.csv")
                    download.save_as(csv_path)
                    print(f"  AfterOffers: Downloaded CSV to {csv_path}")
                    break

            if csv_path and Path(csv_path).exists():
                rows = parse_csv(csv_path, iso_date)
            else:
                print("  AfterOffers: No export button found, falling back to table scrape")
                rows = parse_table(page, iso_date)

        except Exception as e:
            print(f"  AfterOffers ERROR: {e}")
            import traceback; traceback.print_exc()
        finally:
            browser.close()

    total = sum(r["revenue"] for r in rows)
    print(f"  AfterOffers: Pulled {len(rows)} revenue rows, total=${total:.2f}")
    return rows


def parse_csv(csv_path, iso_date):
    """Parse AfterOffers CSV export — uses actual earnings column."""
    import pandas as pd
    rows = []
    try:
        df = pd.read_csv(csv_path)
        # Clean earnings column
        earn_col = next((c for c in df.columns if "earn" in c.lower()), None)
        if not earn_col:
            print(f"  AfterOffers CSV: No earnings column found. Columns: {list(df.columns)}")
            return rows

        df['_rev'] = df[earn_col].astype(str).str.replace('[$,]','',regex=True).astype(float)

        # Skip totals row (NaN host) and WAS_NOT_SENT rows
        df = df[df['host'].notna()]
        df = df[df['host'].str.lower() != 'totals']
        df = df[df['utm_source'] != 'WAS_NOT_SENT']
        df = df[df['utm_medium'] != 'WAS_NOT_SENT']

        for _, row in df.iterrows():
            utm_source = str(row.get('utm_source', '') or '').strip()
            utm_medium = str(row.get('utm_medium', '') or '').strip()
            if not utm_source:
                continue
            revenue = float(row['_rev'])
            epi_text = str(row.get('EPI', '0')).replace('$','').replace(',','').strip()
            try:
                epi = float(epi_text)
            except ValueError:
                epi = 0.0

            rows.append({
                "date":         iso_date,
                "utm_source":   utm_source,
                "utm_medium":   utm_medium,
                "compound_key": build_compound_key(utm_source, utm_medium),
                "revenue":      revenue,
                "epi":          epi,
                "impressions":  int(row.get('impressions', 0) or 0),
                "signups":      int(row.get('total sign-ups', 0) or 0),
                "source":       "afteroffers",
            })
    except Exception as e:
        print(f"  AfterOffers CSV parse error: {e}")
    return rows


def parse_table(page, iso_date):
    """Fallback: parse HTML table using Payout (tentative) column."""
    rows = []
    COL_HOST=0; COL_UTM_SOURCE=1; COL_UTM_MEDIUM=2
    COL_IMPRESSIONS=6; COL_SIGNUPS=8; COL_PAYOUT=9; COL_EPI=10

    for tr in page.query_selector_all("tbody tr"):
        cells = tr.query_selector_all("td")
        if len(cells) <= COL_EPI:
            continue
        def cell(i):
            return cells[i].inner_text().strip() if i < len(cells) else ""

        host_val   = cell(COL_HOST)
        utm_source = cell(COL_UTM_SOURCE)
        utm_medium = cell(COL_UTM_MEDIUM)

        if not host_val or host_val.lower() in ("nan","total","totals",""):
            continue
        if utm_source in ("WAS_NOT_SENT","") or not utm_source:
            continue

        try:
            revenue = float(cell(COL_PAYOUT).replace("$","").replace(",",""))
            epi     = float(cell(COL_EPI).replace("$","").replace(",",""))
            impr    = int(cell(COL_IMPRESSIONS).replace(",","")) if cell(COL_IMPRESSIONS) else 0
            signups = int(cell(COL_SIGNUPS).replace(",","")) if cell(COL_SIGNUPS) else 0
        except ValueError:
            continue

        rows.append({
            "date": iso_date, "utm_source": utm_source, "utm_medium": utm_medium,
            "compound_key": build_compound_key(utm_source, utm_medium),
            "revenue": revenue, "epi": epi, "impressions": impr,
            "signups": signups, "source": "afteroffers",
        })
    return rows


if __name__ == "__main__":
    import sys
    sys.path.insert(0, "..")
    with open("config/credentials.json") as f:
        creds = json.load(f)
    rows = pull_afteroffers_revenue(creds)
    print(f"\nTotal: ${sum(r['revenue'] for r in rows):.2f}")
