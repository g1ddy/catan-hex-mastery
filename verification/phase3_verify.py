from playwright.sync_api import sync_playwright, expect
import time

def verify_phase3():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # 1. Start Game
            page.goto("http://localhost:4173")

            # Check for Player Selection screen and click if present
            try:
                page.wait_for_selector("text=Select Number of Players", timeout=5000)
                print("Found Player Selection screen. Selecting 3 Players...")
                page.get_by_role("button", name="3 Players").click()
            except:
                print("Player selection screen not found (or timed out), assuming already on board or different flow.")

            # Wait for board
            page.wait_for_selector(".board-container")

            # 2. Verify Analyst Panel
            print("Verifying Analyst Panel...")
            # Check Sidebar presence
            expect(page.get_by_role("heading", name="Analyst Dashboard")).to_be_visible()

            # Check Fairness Score
            score = page.get_by_text("/ 100")
            expect(score).to_be_visible()

            # Check Pips
            # Use strict locator or regex to find "Ore" inside the list item
            # The list items have structure: <li><span>ore</span><strong>X pips</strong></li>
            # But the resource name is capitalized in JS: `resource.charAt(0).toUpperCase()...`?
            # In `AnalystPanel.tsx`: <span style={{ textTransform: 'capitalize' }}>{resource}</span>
            # So the text is "Ore".

            # get_by_text("Ore") might be matching "Fairness ScORE" or something?
            # Ah, "Fairness Score" contains "ore".

            # Let's target the list item specifically.
            expect(page.get_by_role("listitem").filter(has_text="Ore")).to_be_visible()

            # 3. Setup Moves (3 Players, need 2 settlements each = 6 total placements + roads)
            print("Simulating Setup Phase...")

            # Verify the Regenerate button is present in Setup
            expect(page.get_by_role("button", name="Regenerate Board")).to_be_visible()

            # Take screenshot of Setup + Analyst
            page.screenshot(path="verification/setup_analyst.png")
            print("Screenshot taken: setup_analyst.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_phase3()
