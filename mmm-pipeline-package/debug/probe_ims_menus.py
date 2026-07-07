"""One-off probe: log into IMS, handle ex=Y page, inventory nav links."""
import sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config.config import load_credentials
from playwright.sync_api import sync_playwright

creds = load_credentials()["ims"]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_context(viewport={"width": 1280, "height": 900}).new_page()

    page.goto("https://admin.tmginteractive.com/syslogin.aspx", timeout=30000)
    page.wait_for_load_state("networkidle")
    page.fill("input[name='txtUserName']", creds["username"])
    page.fill("input[name='txtPassword']", creds["password"])
    page.click("input[name='btnSignIn']")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    print("After login, URL:", page.url)

    # Dump visible text + all buttons/inputs on whatever page we're on
    body_text = page.evaluate("() => document.body.innerText.slice(0, 1500)")
    print("--- page text ---")
    print(body_text)
    inputs = page.evaluate("""() =>
        Array.from(document.querySelectorAll('input, button')).map(el => ({
            tag: el.tagName, type: el.type || '', name: el.name || '',
            id: el.id || '', value: el.value || '', text: (el.innerText||'').trim()
        }))
    """)
    print("--- inputs/buttons ---")
    for i in inputs:
        print(" ", i)
    page.screenshot(path="../data/ims_probe1.png")

    # If there's a continue/yes button for existing session, click it
    clicked = page.evaluate("""() => {
        var all = Array.from(document.querySelectorAll('input, button, a'));
        for (var el of all) {
            var txt = ((el.value || el.innerText || '') + '').trim().toLowerCase();
            if (txt.includes('continue') || txt === 'yes' || txt.includes('proceed') || txt.includes('sign in')) {
                el.click();
                return txt;
            }
        }
        return '';
    }""")
    if clicked:
        print("Clicked:", clicked)
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        print("Now at:", page.url)

    # Try going to the placement page regardless
    page.goto("https://admin.tmginteractive.com/MISReports/apiPlacementMIS.aspx", timeout=30000)
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    print("Placement page URL:", page.url)
    links = page.evaluate("""() =>
        Array.from(document.querySelectorAll('a')).map(a => ({
            text: (a.innerText || '').trim().replace(/\\s+/g, ' '),
            href: a.href || ''
        })).filter(l => l.text)
    """)
    print(f"--- {len(links)} links on placement page ---")
    for l in links:
        print(f"  {l['text'][:60]:60s} {l['href']}")
    page.screenshot(path="../data/ims_probe2.png")

    browser.close()
