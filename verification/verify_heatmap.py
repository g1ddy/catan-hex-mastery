from playwright.sync_api import sync_playwright

def verify_heatmap():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Navigate to game
        page.goto('http://localhost:4173/catan-hex-mastery/#/')
        page.get_by_text('2 Players').click()

        # 2. Wait for load
        page.get_by_text('5').first.wait_for()

        # 3. Enter Setup Phase
        page.get_by_role('button', name='Begin Placement').click()

        # 4. Wait for heatmap rendering (Coach Mode is ON by default)
        page.locator('.coach-highlight').first.wait_for()

        # 5. Take Screenshot
        page.screenshot(path='verification/heatmap_verification.png')
        print("Screenshot saved to verification/heatmap_verification.png")

        browser.close()

if __name__ == "__main__":
    verify_heatmap()
