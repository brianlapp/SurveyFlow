"""
ims_scraper.py
Confirmed columns: affid, subid, Rev - Mode Mobile, Impr Mode Mobile, eCPM - Mode Mobile
Compound key: affid + "-" + subid  (matches AfterOffers utm_source + "-" + utm_medium)
"""

import json
import time
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright


def get_yesterday():
    yesterday = datetime.now() - timedelta(days=1)
    return yesterday.strftime("%Y-%m-%d"), yesterday.strftime("%m/%d/%Y")


def build_compound_key(aff_id, sub_id):
    if not aff_id:
        return None
    if sub_id and sub_id not in aff_id:
        return f"{aff_id}-{sub_id}"
    return aff_id


def pull_ims_revenue(credentials, target_date=None):
    creds = credentials["ims"]
    if not creds.get("username") or not creds.get("password"):
        print("  IMS: credentials not configured — skipping (0 rows)")
        return []
    iso_date, date_display = get_yesterday()
    if target_date:
        iso_date = target_date
        dt = datetime.strptime(target_date, "%Y-%m-%d")
        date_display = dt.strftime("%m/%d/%Y")

    rows = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        try:
            # Login
            print("  IMS: Logging in...")
            page.goto("https://admin.tmginteractive.com/syslogin.aspx", timeout=30000)
            page.wait_for_load_state("networkidle")
            page.fill("input[name='txtUserName']", creds["username"])
            page.fill("input[name='txtPassword']", creds["password"])
            page.click("input[name='btnSignIn']")
            page.wait_for_load_state("networkidle")

            # Verify login actually succeeded — the portal enforces one active
            # session per account and bounces extra logins back to syslogin.aspx
            # with ex=Y and a "Login Failed" message. Without this check the run
            # would silently continue and report "no data" instead of the truth.
            body_text = page.evaluate("() => document.body.innerText || ''")
            if "ex=Y" in page.url or "Login Failed" in body_text:
                raise RuntimeError(
                    "IMS login blocked (ex=Y) — another session is active for this "
                    "account or it is temporarily throttled. Will retry next run."
                )
            print(f"  IMS: Logged in")

            # Navigate to Revenue Report
            page.goto("https://admin.tmginteractive.com/misreports/apipublisherrevenuereport.aspx?z=", timeout=15000)
            page.wait_for_load_state("networkidle")
            time.sleep(2)

            # Step 1: Set dates via JS on all relevant fields
            page.evaluate(f"""() => {{
                var fields = [
                    'ctl00_ContentPlaceHolder1_txtReportDateFrom',
                    'ctl00_ContentPlaceHolder1_txtReportDateTo'
                ];
                fields.forEach(id => {{
                    var el = document.getElementById(id);
                    if (el) {{
                        el.removeAttribute('disabled');
                        el.removeAttribute('readonly');
                        el.value = '{date_display}';
                    }}
                }});
                var vis = document.getElementById('ctl00_ContentPlaceHolder1_txtEffectedDateRange');
                if (vis) vis.value = '{date_display} - {date_display}';
            }}""")
            print(f"  IMS: Dates injected: {date_display}")

            # Step 2: Click Get Report — try every method
            clicked = False

            # Method A: find by exact text using JS and click
            result = page.evaluate("""() => {
                var all = Array.from(document.querySelectorAll('input, button, a'));
                for (var el of all) {
                    var txt = (el.value || el.innerText || '').trim();
                    if (txt === 'Get Report') {
                        el.click();
                        return 'clicked: ' + el.tagName + ' id=' + el.id;
                    }
                }
                // also try contains
                for (var el of all) {
                    var txt = (el.value || el.innerText || '').trim();
                    if (txt.includes('Get Report')) {
                        el.click();
                        return 'clicked (contains): ' + el.tagName + ' id=' + el.id;
                    }
                }
                return 'not found';
            }""")
            print(f"  IMS: Get Report click result: {result}")
            if "clicked" in result:
                clicked = True

            # Method B: __doPostBack with common button IDs
            if not clicked:
                for btn_id in [
                    "ctl00$ContentPlaceHolder1$btnGetReport",
                    "ctl00$ContentPlaceHolder1$btnSubmit",
                    "ctl00$ContentPlaceHolder1$btnGet",
                    "ctl00$ContentPlaceHolder1$Button1",
                ]:
                    try:
                        page.evaluate(f"() => __doPostBack('{btn_id}', '')")
                        clicked = True
                        print(f"  IMS: Triggered __doPostBack('{btn_id}')")
                        break
                    except Exception:
                        continue

            # Wait for AJAX to complete
            page.wait_for_load_state("networkidle")
            time.sleep(4)

            # Step 3: Check hidJsonData first (AJAX response)
            json_data = page.evaluate("""() => {
                var el = document.getElementById('ctl00_ContentPlaceHolder1_hidJsonData');
                return el ? el.value : '';
            }""")

            if json_data and len(json_data) > 20:
                print(f"  IMS: Got JSON data ({len(json_data)} chars)")
                rows = parse_ims_json(json_data, iso_date)
            
            # Step 4: Parse HTML table using confirmed column names
            if not rows:
                print("  IMS: Parsing HTML table with confirmed columns...")
                rows = parse_ims_html_table(page, iso_date)

            if not rows:
                page.screenshot(path="data/ims_debug.png")
                print("  IMS: No data found — screenshot saved to data/ims_debug.png")

        except Exception as e:
            print(f"  IMS ERROR: {e}")
            import traceback
            traceback.print_exc()
            try:
                page.screenshot(path="data/ims_error.png")
            except Exception:
                pass
        finally:
            # Explicitly log out so we don't leave a server-side session open —
            # the portal enforces one active session per account, and a dangling
            # session blocks the next login (ours or a human's) with "ex=Y".
            try:
                logged_out = page.evaluate("""() => {
                    var all = Array.from(document.querySelectorAll('a, input, button'));
                    for (var el of all) {
                        var txt = ((el.value || el.innerText || '') + '').trim().toLowerCase();
                        var href = (el.href || '') + '';
                        if (txt.includes('logout') || txt.includes('log out') ||
                            txt.includes('sign out') || href.toLowerCase().includes('logout')) {
                            el.click();
                            return true;
                        }
                    }
                    return false;
                }""")
                if logged_out:
                    page.wait_for_load_state("networkidle", timeout=10000)
                    print("  IMS: Logged out cleanly")
                else:
                    print("  IMS: No logout link found on final page")
            except Exception:
                pass
            browser.close()

    print(f"  IMS: Pulled {len(rows)} revenue rows")
    return rows


def parse_ims_json(json_str, iso_date):
    """Parse JSON from hidJsonData using confirmed field names.
    Filter by LeadDate matching target date. Skip template/NaN rows.
    """
    rows = []
    try:
        data = json.loads(json_str)
        items = data if isinstance(data, list) else data.get("data", data.get("rows", [data]))

        # Target date as (month, day) integers for robust matching. IMS may emit
        # LeadDate zero-padded ("04/30"), unpadded ("4/30"), or with a year
        # ("4/30/2026") — normalise both sides to integers before comparing.
        dt = datetime.strptime(iso_date, "%Y-%m-%d")
        target_md = (dt.month, dt.day)

        for item in items:
            aff_id = str(item.get("AffId") or "").strip()
            sub_id = str(item.get("SubId") or "").strip()

            # Skip template/header rows
            if "!!" in aff_id or "~~" in aff_id:
                continue
            # Use placeholder for NaN/empty affid rows — still count revenue
            if not aff_id or aff_id.lower() in ("nan", "none", ""):
                aff_id = "unattributed"
                sub_id = sub_id or "unknown"

            # Filter by LeadDate — only keep rows matching target date
            lead_date = str(item.get("LeadDate") or "").strip()
            if lead_date:
                parts = lead_date.split("/")
                try:
                    if (int(parts[0]), int(parts[1])) != target_md:
                        continue
                except (ValueError, IndexError):
                    pass

            try:
                revenue     = float(str(item.get("RevenuePage1") or 0).replace(",",""))
                impressions = int(str(item.get("ImpressionPage1") or 0).replace(",","").split(".")[0])
                ecpm        = float(str(item.get("eCPMPage1") or 0).replace(",",""))
            except (ValueError, TypeError):
                continue

            rows.append({
                "date":         iso_date,
                "aff_id":       aff_id,
                "sub_id":       sub_id,
                "compound_key": build_compound_key(aff_id, sub_id),
                "revenue":      revenue,
                "impressions":  impressions,
                "ecpm":         ecpm,
                "epi":          ecpm / 1000 if ecpm else 0.0,
                "source":       "ims",
            })

        # Verify total matches expected
        total = sum(r["revenue"] for r in rows)
        print(f"  IMS: {len(rows)} rows, total=${total:.2f}")

    except Exception as e:
        print(f"  IMS JSON parse error: {e}")
    return rows


def parse_ims_html_table(page, iso_date):
    """
    Parse HTML table using confirmed column headers:
    affid, subid, Rev - Mode Mobile, Impr Mode Mobile, eCPM - Mode Mobile
    """
    rows = []
    tables = page.query_selector_all("table")

    for table in tables:
        # Get headers from <th> or first <tr>
        headers = []
        th_els = table.query_selector_all("th")
        if th_els:
            headers = [h.inner_text().strip() for h in th_els]
        else:
            first_tr = table.query_selector("tr")
            if first_tr:
                headers = [td.inner_text().strip() for td in first_tr.query_selector_all("td")]

        headers_lower = [h.lower() for h in headers]

        # Must have affid column
        if not any("affid" in h for h in headers_lower):
            continue

        print(f"  IMS: Found data table, headers: {headers}")

        # Map column indices using confirmed names
        col = {}
        for i, h in enumerate(headers_lower):
            if h == "affid" or h == "aff_id":
                col["aff_id"] = i
            elif h == "subid" or h == "sub_id":
                col["sub_id"] = i
            elif "rev" in h and "mode" in h:
                col["revenue"] = i
            elif "impr" in h and "mode" in h:
                col["impressions"] = i
            elif "ecpm" in h or "cpm" in h:
                col["ecpm"] = i

        print(f"  IMS: Column mapping: {col}")

        if "aff_id" not in col:
            continue

        # Parse data rows
        data_trs = table.query_selector_all("tr")
        start = 1 if th_els else 2  # skip header row(s)

        for tr in data_trs[start:]:
            cells = tr.query_selector_all("td")
            if not cells:
                continue

            def cell(key):
                i = col.get(key, -1)
                if 0 <= i < len(cells):
                    return cells[i].inner_text().strip()
                return ""

            aff_id = cell("aff_id")
            if not aff_id or aff_id.lower() in ("total", "subtotal", "affid", ""):
                continue

            sub_id = cell("sub_id")

            def parse_num(s):
                return s.replace("$","").replace(",","").strip()

            try:
                revenue     = float(parse_num(cell("revenue"))) if col.get("revenue") is not None else 0.0
                impressions = int(parse_num(cell("impressions")).split(".")[0]) if col.get("impressions") is not None else 0
                ecpm        = float(parse_num(cell("ecpm"))) if col.get("ecpm") is not None else 0.0
            except ValueError:
                continue

            rows.append({
                "date":         iso_date,
                "aff_id":       aff_id,
                "sub_id":       sub_id,
                "compound_key": build_compound_key(aff_id, sub_id),
                "revenue":      revenue,
                "impressions":  impressions,
                "ecpm":         ecpm,
                "epi":          ecpm / 1000 if ecpm else 0.0,
                "source":       "ims",
            })

    return rows


if __name__ == "__main__":
    import sys
    sys.path.insert(0, "..")
    with open("config/credentials.json") as f:
        creds = json.load(f)
    rows = pull_ims_revenue(creds)
    for r in rows[:5]:
        print(r)
