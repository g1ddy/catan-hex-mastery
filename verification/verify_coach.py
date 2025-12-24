from playwright.sync_api import sync_playwright, expect
import time

def verify_coach_mode():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to the game (Vite usually on 5173)
            page.goto("http://localhost:5173")

            # Click "3 Players" button to start game if not already started
            # The HTML shows a setup menu: <button class="player-btn">3 Players</button>
            # We need to click this to see the board and analyst panel.
            setup_btn = page.get_by_text("3 Players")
            if setup_btn.is_visible():
                setup_btn.click()

            # Wait for game to load
            page.wait_for_selector(".analyst-panel")

            # 1. Verify "Show Hints" Toggle exists
            toggle = page.locator(".toggle-switch input")
            expect(toggle).to_be_visible()

            # Enable Hints
            # Need to click the LABEL or the INPUT
            toggle.click(force=True)
            # time.sleep(1) # Removed as per code review

            # 2. Verify Hints (Gold Rings) appear
            # We look for the circle with gold stroke
            # The component renders <circle fill="none" stroke="gold" ... />
            # Using CSS selector to find it
            hints = page.locator("circle[stroke='gold']")

            # Should have at least 1 hint (usually 3)
            # Give it a moment
            expect(hints.first).to_be_visible()

            count = hints.count()
            print(f"Found {count} placement hints")

            # 3. Perform a move to trigger feedback
            # Find a valid settlement spot (transparent circle with ghost-vertex class or similar)
            # The code renders: <circle ... className="ghost-vertex" /> for valid spots
            valid_spots = page.locator(".ghost-vertex")
            if valid_spots.count() > 0:
                # Click the first one
                valid_spots.first.click(force=True)

                # 4. Verify Toast appears
                toast = page.locator(".toast")
                expect(toast).to_be_visible()
                print("Toast feedback appeared: " + toast.text_content())

                # Take screenshot
                page.screenshot(path="verification/coach_verification.png")
            else:
                print("No valid spots found to click")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_coach_mode()
