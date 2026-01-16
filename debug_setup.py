
from playwright.sync_api import sync_playwright

def debug():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.screenshot(path="debug_setup.png")
        browser.close()

if __name__ == "__main__":
    debug()
