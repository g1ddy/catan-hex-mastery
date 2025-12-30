
import os
from playwright.sync_api import sync_playwright

def capture_tooltip_screenshot():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        # 1. Go to Setup Page
        page.goto("http://localhost:4173/catan-hex-mastery/")

        # Hover over 4 Players button to trigger tooltip
        page.hover("button:has-text('4 Players')")
        page.wait_for_selector("div[role='tooltip']", state="visible")

        # Screenshot Setup Tooltip
        page.screenshot(path="verification/setup_tooltip_screenshot.png")
        print("Captured setup tooltip screenshot.")

        # 2. Go to Game Page
        page.click("button:has-text('2 Players')")

        # Wait for game to load
        page.wait_for_selector("text=Place a Settlement")

        # Hover over Resource Icon (Wood)
        # Note: react-tooltip might need a moment or mouse move
        wood_icon = page.locator("span[data-tooltip-content='Wood']").first
        wood_icon.hover()
        page.wait_for_selector("div[role='tooltip']", state="visible")

        # Screenshot Resource Tooltip
        page.screenshot(path="verification/resource_tooltip_screenshot.png")
        print("Captured resource tooltip screenshot.")

        browser.close()

if __name__ == "__main__":
    capture_tooltip_screenshot()
