from playwright.sync_api import sync_playwright, expect
import time

def verify_setup_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a larger viewport to ensure board visibility
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # Listen to console
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        print("1. Loading game...")
        page.goto("http://localhost:4173/catan-hex-mastery/")

        print("2. Starting 2-player game...")
        # "2 Players" button starts the game immediately
        page.get_by_role("button", name="2 Players").click()

        # Wait for board to load
        page.wait_for_selector("svg")
        time.sleep(1) # Give it a moment to render overlays

        # Debug screenshot
        page.screenshot(path="verification/debug_start.png")
        print("   Debug screenshot taken: verification/debug_start.png")

        # Helper to handle placement turn
        def perform_turn(player_name, turn_index):
            print(f"--- {player_name} Turn {turn_index} ---")

            # 1. Click Begin Placement
            begin_btn = page.get_by_role("button", name="Begin Placement")
            try:
                expect(begin_btn).to_be_visible(timeout=5000)
            except Exception as e:
                print(f"FAILED to find Begin Placement for {player_name} Turn {turn_index}")
                page.screenshot(path=f"verification/fail_{player_name}_{turn_index}.png")
                raise e

            begin_btn.click()
            print(f"   Clicked 'Begin Placement'")

            # 2. Verify "Place a Settlement" instruction
            expect(page.get_by_text("Place a Settlement")).to_be_visible()

            # 3. Place Settlement
            ghosts = page.locator(".ghost-vertex")
            expect(ghosts.first).to_be_visible()
            ghosts.first.click(force=True)
            print(f"   Placed Settlement")

            # 4. Verify immediate transition to "Place a Road"
            # It might take a tick for React to update
            try:
                expect(page.get_by_text("Place a Road")).to_be_visible(timeout=5000)
            except:
                print("Failed to see 'Place a Road'")
                page.screenshot(path="verification/fail_road_transition.png")
                raise

            expect(page.get_by_role("button", name="Begin Placement")).not_to_be_visible()
            if player_name == "P1" and turn_index == 1:
                page.screenshot(path="verification/step2_immediate_road.png")
            print(f"   Instruction changed to 'Place a Road'")

            # 5. Place Road
            road_ghosts = page.locator("rect[opacity='0.5']")
            expect(road_ghosts.first).to_be_visible()
            road_ghosts.first.click(force=True)
            print(f"   Placed Road")

            # 6. Verify Turn End (Instruction should disappear or change to next player's wait)
            time.sleep(0.5)

        # --- Execution Sequence ---

        # P1 Turn 1
        perform_turn("P1", 1)

        # P2 Turn 1
        perform_turn("P2", 1)

        # P2 Turn 2 (Snake Draft!)
        perform_turn("P2", 2)

        # P1 Turn 2
        perform_turn("P1", 2)

        # --- Verify Gameplay Start ---
        print("--- Verifying Game Start ---")
        # Should see "Roll Dice" button
        roll_btn = page.get_by_role("button", name="Roll Dice")
        expect(roll_btn).to_be_visible(timeout=10000)
        print("Roll Dice button visible!")

        page.screenshot(path="verification/step4_gameplay_start.png")

        browser.close()

if __name__ == "__main__":
    verify_setup_flow()
