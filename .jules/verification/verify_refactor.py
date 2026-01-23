from playwright.sync_api import sync_playwright
import time

def verify_game_load():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            page.goto("http://localhost:5173", timeout=60000)
            print("Navigated to page")

            # Click "1 Player (Debug)"
            # Use get_by_role or text
            page.get_by_text("1 Player (Debug)").click()
            print("Clicked 1 Player (Debug)")

            # Wait for board
            page.wait_for_selector(".board", timeout=10000)
            print("Board container found")

            # Take screenshot
            page.screenshot(path=".jules/verification/refactor_verification.png")
            print("Screenshot taken")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path=".jules/verification/error_2.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_game_load()
