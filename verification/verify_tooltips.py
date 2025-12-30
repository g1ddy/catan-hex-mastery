from playwright.sync_api import sync_playwright

def verify_tooltips():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use desktop viewport
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        # Navigate to game
        # Assuming server is running at localhost:4173/catan-hex-mastery/
        page.goto("http://localhost:4173/catan-hex-mastery/")

        # Click 2 players
        page.click("button:has-text('2 Players')")

        # Click Begin Placement to make UI static
        page.click("button:has-text('Begin Placement')")

        # Find wood icon in player panel (Active player usually P1)
        # We need to hover it
        wood_icon = page.locator('span[data-tooltip-content="Wood"]').first
        wood_icon.hover()

        # Wait a bit for tooltip animation
        page.wait_for_timeout(500)

        # Take screenshot
        page.screenshot(path="verification/tooltip_verification.png")
        print("Screenshot taken")

        browser.close()

if __name__ == "__main__":
    verify_tooltips()
