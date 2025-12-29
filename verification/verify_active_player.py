from playwright.sync_api import sync_playwright

def verify_active_player():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to home
        page.goto("http://localhost:5173/")

        # Click "2 Players"
        page.click("text=2 Players")

        # Wait for game page
        page.wait_for_url("**/game")

        # Check if we are Player 0.
        # The PlayerPanel usually highlights the current player or shows "You" or we can check the top left player indicator.
        # Based on previous screenshot, there is a "Players" panel.
        # We can look for the "Place a Settlement" instruction which only appears if we are the active player (and it's setup phase).
        # If we were spectator, we wouldn't see "Place a Settlement" or it would say "Spectating".

        try:
            # Wait for "Place a Settlement" text (case insensitive usually good, but let's try exact first)
            # The previous screenshot showed "Place a Settlement" in a dark pill.
            page.wait_for_selector("text=Place a Settlement", timeout=5000)
            print("Found 'Place a Settlement' - We are active Player 0.")
        except:
            print("Did not find 'Place a Settlement'. We might be in spectator mode.")
            page.screenshot(path="verification/failed_spectator_check.png")
            browser.close()
            return

        # Take success screenshot
        page.screenshot(path="verification/active_player_0.png")

        browser.close()

if __name__ == "__main__":
    verify_active_player()
