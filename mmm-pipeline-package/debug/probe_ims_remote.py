"""Test IMS login through a remote browser (different egress IP)."""
import sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config.config import load_credentials
from playwright.sync_api import sync_playwright

creds = load_credentials()["ims"]
ws_url = open("/tmp/bb_connect_url.txt").read().strip()

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_url)
    context = browser.contexts[0] if browser.contexts else browser.new_context()
    page = context.pages[0] if context.pages else context.new_page()

    # What IP does this browser egress from?
    page.goto("https://api.ipify.org", timeout=30000)
    ip = page.evaluate("() => document.body.innerText")
    print("Remote browser egress IP:", ip.strip())

    page.goto("https://admin.tmginteractive.com/syslogin.aspx", timeout=45000)
    page.wait_for_load_state("networkidle")
    time.sleep(1.5)
    page.fill("input[name='txtUserName']", creds["username"])
    time.sleep(0.7)
    page.fill("input[name='txtPassword']", creds["password"])
    time.sleep(0.7)
    page.click("input[name='btnSignIn']")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    print("After login URL:", page.url)
    body = page.evaluate("() => document.body.innerText.slice(0, 300)")

    if "ex=Y" in page.url or "Login Failed" in body:
        print("RESULT: BLOCKED even from remote IP")
        print(body)
    else:
        print("RESULT: LOGIN SUCCEEDED from remote IP")
        links = page.evaluate("""() =>
            Array.from(document.querySelectorAll('a')).map(a => ({
                text: (a.innerText || '').trim().replace(/\\s+/g, ' '),
                href: a.href || ''
            })).filter(l => l.text)
        """)
        print(f"--- {len(links)} nav links ---")
        for l in links[:40]:
            print(f"  {l['text'][:60]:60s} {l['href']}")
        # log out cleanly
        page.evaluate("""() => {
            var all = Array.from(document.querySelectorAll('a, input, button'));
            for (var el of all) {
                var t = ((el.value || el.innerText || '') + '').trim().toLowerCase();
                if (t.includes('logout') || t.includes('log out') || t.includes('sign out')
                    || ((el.href||'')+'').toLowerCase().includes('logout')) { el.click(); return; }
            }
        }""")
        time.sleep(2)
        print("Logged out.")

    browser.close()
