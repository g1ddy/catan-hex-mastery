from playwright.sync_api import sync_playwright

def verify_clean_game_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the home page (using dev server port 5173 for import.meta.env.DEV)
        page.goto("http://localhost:5173/")

        # Wait for "2 Players" button and click it to start setup
        page.click("text=2 Players")

        # Verify we are on the game page
        page.wait_for_url("**/game")

        # Verify Dev Tools DO NOT exist
        dev_tools = page.locator("text=Dev Mode")
        if dev_tools.is_visible():
             print("Dev Mode indicator STILL FOUND! Verification failed.")
             page.screenshot(path="verification/failed_dev_tools_still_there.png")
             browser.close()
             return

        print("Dev tools correctly removed.")

        # Take screenshot of clean state
        page.screenshot(path="verification/clean_game_page.png")

        browser.close()

if __name__ == "__main__":
    verify_clean_game_page()
