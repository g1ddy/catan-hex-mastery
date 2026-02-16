import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173/catan-hex-mastery/"

def verify_coach_panel():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Navigate to game
        print("Navigating to game...")
        try:
            page.goto(BASE_URL)
        except Exception as e:
            print(f"Error navigating: {e}")
            return

        # Hide Debug Panel
        page.add_style_tag(content=".debug-panel { display: none !important; }")

        # 2. Setup Game
        print("Setting up game...")
        try:
            page.get_by_role("button", name="3 Players (No Bots)").click(force=True)
        except Exception:
             print("Retrying navigation or click...")
             page.goto(BASE_URL)
             page.add_style_tag(content=".debug-panel { display: none !important; }")
             page.get_by_role("button", name="3 Players (No Bots)").click(force=True)


        # Wait for game layout
        page.wait_for_selector("[data-testid='game-layout']", timeout=10000)

        # 3. Enter Placement (to make sure game is active)
        page.get_by_role("button", name="Begin Placement").click(force=True)

        # 4. Open Coach Panel
        print("Opening Coach Panel...")
        toggle_btn = page.get_by_label("Toggle Coach Bot")

        # Try to locate the text first
        try:
            # If the panel is NOT visible, click the toggle.
            if not page.get_by_text("Player Production Potential").is_visible(timeout=1000):
                 if toggle_btn.is_visible():
                     toggle_btn.click(force=True)
        except Exception:
             if toggle_btn.is_visible():
                 toggle_btn.click(force=True)

        # Wait for panel content
        page.get_by_text("Player Production Potential").wait_for(state="visible", timeout=5000)

        # 5. Screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification_coach_panel_refactored.png", full_page=True)

        browser.close()
        print("Done.")

if __name__ == "__main__":
    verify_coach_panel()
