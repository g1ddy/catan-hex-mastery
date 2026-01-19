from playwright.sync_api import sync_playwright

def verify_app_start():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to app
        page.goto("http://localhost:5173/catan-hex-mastery/")

        # Click Start Button
        try:
            print("Clicking Start Button...")
            # Try specific text or role
            page.get_by_role("button", name="1 Player (Debug)").click()
        except Exception as e:
            print(f"Failed to click button: {e}")

        # Wait for game layout
        try:
            page.wait_for_selector('[data-testid="game-layout"]', timeout=10000)
            print("Game layout found.")
        except:
            print("Game layout not found.")

        # Take screenshot
        screenshot_path = "/home/jules/verification/verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_app_start()
