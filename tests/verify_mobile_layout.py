import time
from playwright.sync_api import sync_playwright

def verify_mobile_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
        )
        page = context.new_page()

        print("Navigating to setup page...")
        page.goto("http://localhost:5173/")

        try:
            page.wait_for_selector("button:has-text('2 Players')", timeout=5000)
            page.click("button:has-text('2 Players')")
        except:
            print("Setup page failed.")
            return

        print("Navigating to game page...")
        time.sleep(3)

        # Hide debug panel
        page.evaluate("""
            const elements = document.querySelectorAll('div');
            for (const el of elements) {
                if (el.innerText && el.innerText.includes('CONTROLS') && el.style.position === 'fixed') {
                    el.style.display = 'none';
                }
            }
        """)

        screenshot_path = "mobile_view_fixed.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_mobile_layout()
