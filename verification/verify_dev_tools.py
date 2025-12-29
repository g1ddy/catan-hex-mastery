from playwright.sync_api import sync_playwright

def verify_dev_tools():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the home page (using dev server port 5173 for import.meta.env.DEV)
        page.goto("http://localhost:5173/")

        # Wait for "2 Players" button and click it to start setup
        page.click("text=2 Players")

        # Verify we are on the game page
        page.wait_for_url("**/game")

        # Verify Dev Tools exist
        dev_tools = page.locator("text=Dev Mode")
        # Increase timeout just in case
        try:
             dev_tools.wait_for(state="visible", timeout=5000)
        except TimeoutError:
             print("Dev Mode indicator not found!")
             page.screenshot(path="verification/failed_no_dev_tools.png")
             browser.close()
             return

        # Check for P0 and P1 buttons
        p0_btn = page.locator("button:has-text('P0')")
        p1_btn = page.locator("button:has-text('P1')")

        if not p0_btn.is_visible() or not p1_btn.is_visible():
            print("Player switch buttons not found!")
            page.screenshot(path="verification/failed_no_buttons.png")
            browser.close()
            return

        print("Dev tools found.")

        # Take screenshot of initial state (P0 active)
        page.screenshot(path="verification/dev_tools_p0.png")

        # Switch to P1
        p1_btn.click()

        # Verify P1 is active (visual check via screenshot mostly, but we can check class)
        # The active button has bg-blue-600
        page.wait_for_selector("button:has-text('P1')[class*='bg-blue-600']") # Wait for P1 to be active
        page.screenshot(path="verification/dev_tools_p1.png")

        browser.close()

if __name__ == "__main__":
    verify_dev_tools()
