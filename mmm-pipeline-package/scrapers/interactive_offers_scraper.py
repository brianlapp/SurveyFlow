"""
interactive_offers_scraper.py
Pulls Display CTO and Co-Reg revenue from Interactive Offers.
Navigates to /reports, filters by campaign name patterns.
No source attribution — gross totals only.
"""

import json, time
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright


def pull_interactive_offers(credentials, target_date=None, intraday=False):
    creds = credentials["interactive_offers"]
    iso_date = target_date or (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    results = {
        "date": iso_date,
        "display_cto_revenue": 0.0,
        "coreg_revenue": 0.0,
        "display_cto_rows": [],
        "coreg_rows": [],
        "other_rows": [],
        "source": "interactive_offers",
    }

    if not creds.get("username") or not creds.get("password"):
        print("  IO: credentials not configured — skipping")
        results["total_revenue"] = 0.0
        return results

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})

        try:
            print("  IO: Logging in...")
            page.goto("https://app.interactiveoffers.com/login", timeout=30000)
            page.wait_for_load_state("networkidle")
            page.fill("input[name='email']", creds["username"])
            page.fill("input[name='password']", creds["password"])
            page.click("button[type='submit']")
            page.wait_for_load_state("networkidle")
            print(f"  IO: Logged in → {page.url}")

            # Reports - View All, 100 per page
            page.goto("https://app.interactiveoffers.com/reports?sub=viewAll&page=1&limit=100&query=", timeout=15000)
            page.wait_for_load_state("networkidle")
            time.sleep(2)

            # Try to set date to Yesterday via JS click on dropdown
            try:
                page.evaluate("""() => {
                    // Find any element containing 'Last 7 Days' text and click it
                    var els = Array.from(document.querySelectorAll('button, div, span'));
                    for (var el of els) {
                        if (el.innerText && el.innerText.trim().includes('Last 7 Days')) {
                            el.click();
                            return 'clicked date btn';
                        }
                    }
                    return 'not found';
                }""")
                time.sleep(0.8)
                date_label = 'Today' if intraday else 'Yesterday'
                page.evaluate(f"""() => {{
                    var els = Array.from(document.querySelectorAll('li, div, button, span, a'));
                    for (var el of els) {{
                        if (el.innerText && el.innerText.trim() === '{date_label}') {{
                            el.click();
                            return 'clicked ' + '{date_label}'.toLowerCase();
                        }}
                    }}
                    return '{date_label} not found';
                }}""")
                page.wait_for_load_state("networkidle")
                time.sleep(1.5)
                print(f"  IO: Date set to {date_label}")
            except Exception as e:
                print(f"  IO: Date filter warning: {e}")

            # Parse all pages
            all_rows = []
            page_num = 1
            while True:
                rows = parse_io_table(page, iso_date)
                all_rows.extend(rows)
                print(f"  IO: Page {page_num}: {len(rows)} campaign rows")

                try:
                    next_btn = page.query_selector("button:has-text('Next'), a:has-text('›'), a:has-text('Next')")
                    if next_btn and next_btn.is_visible() and not next_btn.is_disabled():
                        next_btn.click()
                        page.wait_for_load_state("networkidle")
                        time.sleep(1)
                        page_num += 1
                    else:
                        break
                except Exception:
                    break

            # Categorize by campaign name
            for row in all_rows:
                name = row["campaign"].upper()
                if "DISPLAY CTO" in name:
                    results["display_cto_rows"].append(row)
                    results["display_cto_revenue"] += row["revenue"]
                elif "CO-REG" in name or "COREG" in name or "CO REG" in name:
                    results["coreg_rows"].append(row)
                    results["coreg_revenue"] += row["revenue"]
                else:
                    results["other_rows"].append(row)

            print(f"  IO: Display CTO: ${results['display_cto_revenue']:.2f} ({len(results['display_cto_rows'])} rows)")
            print(f"  IO: Co-Reg:      ${results['coreg_revenue']:.2f} ({len(results['coreg_rows'])} rows)")

            unmatched = [r for r in results["other_rows"] if r["revenue"] > 0]
            if unmatched:
                print(f"  IO: Other campaigns with revenue ({len(unmatched)}):")
                for r in unmatched[:5]:
                    print(f"    '{r['campaign']}' → ${r['revenue']:.2f}")

        except Exception as e:
            print(f"  IO ERROR: {e}")
            import traceback; traceback.print_exc()
        finally:
            browser.close()

    results["total_revenue"] = results["display_cto_revenue"] + results["coreg_revenue"]
    return results


def parse_io_table(page, iso_date):
    rows = []
    for table in page.query_selector_all("table"):
        headers = [h.inner_text().strip() for h in table.query_selector_all("th")]
        hl = [h.lower() for h in headers]
        if not any("campaign" in h for h in hl):
            continue

        col = {}
        for i, h in enumerate(hl):
            if "campaign name" in h:
                col["campaign"] = i
            elif "est" in h and "rev" in h:
                col["revenue"] = i
            elif h == "revenue":
                col["revenue"] = i
            elif "format" in h:
                col["format"] = i

        if "campaign" not in col or "revenue" not in col:
            continue

        for tr in table.query_selector_all("tbody tr"):
            cells = tr.query_selector_all("td")
            if not cells:
                continue
            def cell(k):
                i = col.get(k, -1)
                return cells[i].inner_text().strip() if 0 <= i < len(cells) else ""
            campaign = cell("campaign")
            rev_text = cell("revenue").replace("$","").replace(",","").strip()
            if not campaign or not rev_text:
                continue
            try:
                revenue = float(rev_text)
            except ValueError:
                continue
            rows.append({
                "date": iso_date, "campaign": campaign,
                "ad_format": cell("format"), "revenue": revenue,
                "source": "interactive_offers",
            })
    return rows


if __name__ == "__main__":
    import sys
    sys.path.insert(0, "..")
    with open("config/credentials.json") as f:
        creds = json.load(f)
    r = pull_interactive_offers(creds)
    print(f"\nDisplay CTO: ${r['display_cto_revenue']:.2f}")
    print(f"Co-Reg:      ${r['coreg_revenue']:.2f}")
    print(f"Total:       ${r['total_revenue']:.2f}")
