from playwright.sync_api import sync_playwright, expect
import time

def verify_roll_animation():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # 1. Start App
        print("Navigating to app...")
        page.goto("http://localhost:5173/catan-hex-mastery/")

        # 2. Click "1 Player vs 2 Bots"
        print("Starting Game vs 2 Bots...")
        page.get_by_text("1 Player vs 2 Bots").click()

        # 3. Handle Setup Phase (Place Settlements and Roads)
        print("Handling Setup Phase...")

        # We need to place 2 settlements and 2 roads per player (2 players = 8 steps)
        # But wait, Debug mode might be different?
        # SetupPage says "1 Player (Debug)".
        # Game.ts setup: 2 settlements, 2 roads.

        # Check for "Begin Placement" button first
        begin_btn = page.get_by_text("Begin Placement")
        if begin_btn.is_visible():
            print("Clicking Begin Placement...")
            begin_btn.click()
            time.sleep(1)

        # Loop until we see "Roll Dice"
        max_attempts = 50
        attempts = 0

        while attempts < max_attempts:
            time.sleep(0.5) # Wait for animations/state update

            # Check if Roll Dice button is present
            roll_btn = page.get_by_role("button", name="Roll Dice")
            if roll_btn.is_visible():
                print("Roll Dice button found!")
                break

            # Try to find ghost vertices (Settlements)
            ghost_vertices = page.get_by_test_id("ghost-vertex")
            if ghost_vertices.count() > 0:
                print(f"Found {ghost_vertices.count()} ghost vertices. Clicking first one...")
                ghost_vertices.first.click(force=True)
                continue

            # Try to find ghost edges (Roads)
            ghost_edges = page.get_by_test_id("ghost-edge")
            if ghost_edges.count() > 0:
                print(f"Found {ghost_edges.count()} ghost edges. Clicking first one...")
                ghost_edges.first.click(force=True)
                continue

            attempts += 1
            print("Waiting for game state...")

        # 4. Trigger Roll
        if page.get_by_role("button", name="Roll Dice").is_visible():
            print("Clicking Roll Dice...")
            page.get_by_role("button", name="Roll Dice").click()

            # 5. Capture "Rolling..." state
            # It should appear immediately
            print("Taking screenshot of Rolling state...")
            # Wait a tiny bit for React to render
            time.sleep(0.1)
            page.screenshot(path="verification_rolling.png")

            # Verify "Rolling..." text is visible
            # Note: The text is "Rolling..." inside GameNotification
            # GameNotification.tsx: <span className="font-bold text-lg text-amber-400">Rolling...</span>
            # We use try/except to catch assertion error and still save screenshot
            try:
                expect(page.get_by_text("Rolling...")).to_be_visible()
                print("ASSERTION PASSED: 'Rolling...' text is visible.")
            except Exception as e:
                print(f"ASSERTION FAILED: {e}")

            # 6. Wait for Resolution (1s animation)
            print("Waiting for animation to finish...")
            time.sleep(1.5)

            # 7. Capture Result
            print("Taking screenshot of Result state...")
            page.screenshot(path="verification_result.png")

            # Verify "Rolling..." is GONE
            try:
                expect(page.get_by_text("Rolling...")).not_to_be_visible()
                print("ASSERTION PASSED: 'Rolling...' text is gone.")
            except Exception as e:
                print(f"ASSERTION FAILED: {e}")

            print("Verification Complete!")
        else:
            print("Failed to reach Gameplay phase.")
            page.screenshot(path="verification_failed.png")

        browser.close()

if __name__ == "__main__":
    verify_roll_animation()
