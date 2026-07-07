"""Single stealth login test: real-browser fingerprint vs default headless."""
import sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config.config import load_credentials
from playwright.sync_api import sync_playwright

creds = load_credentials()["ims"]

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=[
        "--disable-blink-features=AutomationControlled",
    ])
    context = browser.new_context(
        viewport={"width": 1366, "height": 768},
        user_agent=UA,
        locale="en-US",
        timezone_id="America/New_York",
    )
    context.add_init_script(
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
    )
    page = context.new_page()

    page.goto("https://admin.tmginteractive.com/syslogin.aspx", timeout=30000)
    page.wait_for_load_state("networkidle")
    time.sleep(1.5)
    page.fill("input[name='txtUserName']", creds["username"])
    time.sleep(0.8)
    page.fill("input[name='txtPassword']", creds["password"])
    time.sleep(0.8)
    page.click("input[name='btnSignIn']")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    print("After login URL:", page.url)
    body = page.evaluate("() => document.body.innerText.slice(0, 400)")
    print("--- page text ---")
    print(body)

    if "ex=Y" in page.url or "Login Failed" in body:
        print("\nRESULT: still blocked with stealth fingerprint")
    else:
        print("\nRESULT: LOGIN SUCCEEDED with stealth fingerprint")
        # Inventory nav links while we're in
        links = page.evaluate("""() =>
            Array.from(document.querySelectorAll('a')).map(a => ({
                text: (a.innerText || '').trim().replace(/\\s+/g, ' '),
                href: a.href || ''
            })).filter(l => l.text)
        """)
        print(f"--- {len(links)} nav links ---")
        for l in links:
            print(f"  {l['text'][:60]:60s} {l['href']}")
        # Log out cleanly
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
