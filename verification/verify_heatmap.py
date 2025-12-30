from playwright.sync_api import sync_playwright

def verify_heatmap():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        print("Navigating to app...")
        page.goto("http://localhost:4173/catan-hex-mastery/")

        print("Waiting for Setup Phase text...")
        try:
            page.wait_for_selector("text=Hex Mastery", timeout=5000)
            print("Found Hex Mastery title")
        except:
            print("Did not find Hex Mastery title.")

        # 1. Start 2-Player Game
        print("Clicking 2 Players...")
        page.get_by_role("button", name="2 Players").click()

        # 2. Wait for Game Board
        # "Player 1's Turn" might not exist as exact text.
        # Let's wait for the Board element or something game specific.
        # The GameLayout has "game-layout-desktop" class.
        print("Waiting for Game Layout...")
        page.wait_for_selector(".game-layout-desktop", timeout=10000)

        # 3. Enter "Placing" Mode
        # Look for "Place a Settlement" text.
        # It's inside GameControls.tsx.
        print("Looking for Place a Settlement...")
        try:
             page.wait_for_selector("text=Place a Settlement", timeout=5000)
             print("Found 'Place a Settlement' text.")
             # In setup phase, it's just text saying "Setup Phase: Place a Settlement" maybe?
             # Or it's a button to toggle mode?
             # In Board.tsx: "if uiMode === 'placing'" -> calls moves.placeSettlement
             # In GameControls.tsx, we need to see how "placing" mode is triggered.
             # If it's Setup Phase, typically the instruction is "Place a Settlement" and we click the board.
             # BUT `uiMode` defaults to 'viewing' in Board.tsx.
             # So we must click something to enter placing mode.

             # Let's try to click the element containing "Place a Settlement" if it's clickable.
             # Or look for a button near it.

             # Just click the text if it looks like a button
             page.get_by_text("Place a Settlement").click()
             print("Clicked Place a Settlement text.")

        except Exception as e:
             print(f"Could not find or click Place a Settlement: {e}")
             # Take a screenshot to debug
             page.screenshot(path="verification/debug_no_place_btn.png")

        # 4. Verify Heatmap
        print("Waiting for coach highlights...")
        try:
            # Wait a bit for React to render the new state
            page.wait_for_timeout(2000)

            # Check for the elements
            count = page.locator(".coach-highlight").count()
            print(f"Found {count} coach highlights.")

            if count > 0:
                 print("SUCCESS: Coach highlights found.")
            else:
                 print("FAILURE: No coach highlights found.")
                 # Debug screenshot
                 page.screenshot(path="verification/debug_no_highlights.png")

        except Exception as e:
            print(f"Error looking for highlights: {e}")

        # Take a screenshot of the board with heatmap
        page.screenshot(path="verification/heatmap_active.png")

        # 5. Toggle Coach Mode Off
        print("Toggling coach mode off...")
        # The toggle is in AnalystPanel.
        # Check if AnalystPanel is visible.
        # On desktop it is sidebar-area.

        # Checkbox label "Coach Mode"
        try:
            coach_toggle = page.get_by_label("Coach Mode")
            if coach_toggle.is_visible():
                coach_toggle.uncheck()
                print("Unchecked Coach Mode")

                page.wait_for_timeout(1000)

                count = page.locator(".coach-highlight").count()
                print(f"Coach highlights count after toggle off: {count}")

                page.screenshot(path="verification/heatmap_off.png")

                if count == 0:
                    print("SUCCESS: Heatmap toggled off correctly.")
                else:
                    print("FAILURE: Heatmap still visible.")
            else:
                 print("Coach Mode toggle not visible.")
        except Exception as e:
             print(f"Error toggling coach mode: {e}")

        browser.close()

if __name__ == "__main__":
    verify_heatmap()
