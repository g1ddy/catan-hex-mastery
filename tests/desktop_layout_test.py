import sys
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Desktop viewport (Full HD)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080}
        )
        page = context.new_page()

        # Debug Logs
        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"BROWSER ERROR: {exc}"))

        print("Navigating to app...")
        # URL verified from previous preview log
        page.goto("http://localhost:4173/catan-hex-mastery/")

        page.wait_for_load_state("networkidle")

        # Setup
        try:
            print("Selecting 2 Players...")
            page.wait_for_selector("button:has-text('2 Players')", timeout=30000)
            page.click("button:has-text('2 Players')")
        except Exception as e:
            print(f"Setup failed: {e}")
            page.screenshot(path="debug_desktop_setup_fail.png")
            browser.close()
            sys.exit(1)

        print("Waiting for Game Page...")
        # Check for the unified desktop layout class
        page.wait_for_selector('.game-layout-desktop', timeout=30000)

        # Helper to click a ghost vertex (for settlement)
        def place_settlement():
            print("Action: Place Settlement")
            # 1. Click "Begin Placement" (New Flow)
            try:
                page.click("button:has-text('Begin Placement')")
            except:
                print("Note: 'Begin Placement' not found, might be already active or logic changed.")

            # Wait for ghost vertices to appear
            # The app logic sets uiMode='placing', which renders the ghost vertices
            ghost_locator = page.locator(".ghost-vertex")
            ghost_locator.first.wait_for(state="visible", timeout=2000)

            if ghost_locator.count() > 0:
                # Remove force=True to ensure actionability
                ghost_locator.first.click()
            else:
                print("Error: No ghost vertices found!")

        # Helper to click a ghost edge (for road)
        def place_road():
            print("Action: Place Road")
            # New Flow: No need to click "Place a Road". It's auto-selected.
            # But we verify the text is visible
            try:
                page.wait_for_selector("text=Place a Road", timeout=2000)
            except:
                print("Warning: 'Place a Road' text not found immediately.")

            # Wait for ghost edges to appear
            ghost_locator = page.locator("rect[fill='white'][opacity='0.5']")
            ghost_locator.first.wait_for(state="visible", timeout=2000)

            if ghost_locator.count() > 0:
                # Remove force=True
                ghost_locator.first.click()
            else:
                print("Error: No ghost edges found!")

        # Run Setup Sequence (Snake Draft: P1, P2, P2, P1)
        # P1
        print("--- P1 Turn 1 ---")
        place_settlement()
        place_road()

        # P2
        print("--- P2 Turn 1 ---")
        place_settlement()
        place_road()

        # P2 (Snake return)
        print("--- P2 Turn 2 ---")
        place_settlement()
        place_road()

        # P1 (Final)
        print("--- P1 Turn 2 ---")
        place_settlement()
        place_road()

        print("Setup complete. Waiting for Gameplay Phase...")

        # Verification: Roll Dice Button
        try:
            roll_btn = page.locator("button[aria-label='Roll Dice']")
            roll_btn.wait_for(state="visible", timeout=10000)

            box = roll_btn.bounding_box()
            viewport_height = page.viewport_size['height']

            print(f"Roll Button found at Y: {box['y']}, Height: {box['height']}")

            # Check docking (should be near bottom)
            # Layout: Button is in a bottom bar.
            # 1920x1080. Y should be > 900 presumably.
            if box['y'] > viewport_height * 0.8:
                print("PASS: Roll Dice button is visible and docked at the bottom.")
                print("TEST PASSED")
            else:
                print(f"WARNING: Roll Dice button Y position ({box['y']}) seems high. Verify layout.")

        except Exception as e:
            print(f"FAIL: Roll Dice button not found or not visible: {e}")
            page.screenshot(path="debug_desktop_roll_missing.png")
            browser.close()
            sys.exit(1)

        browser.close()

if __name__ == "__main__":
    run_test()
