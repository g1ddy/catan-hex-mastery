from playwright.sync_api import sync_playwright

def verify_board():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to http://localhost:5173/")
            page.goto("http://localhost:5173/")

            # Start game with 3 players
            print("Starting game...")
            # We assume there's a button or text for "3 Players" based on memory
            # "The application initialization includes a player count selection (3 or 4 players)"
            page.get_by_text("3 Players").click()

            # Wait for board to appear. Looking for elements inside the board.
            # SVG hexes usually have a 'g' element or class.
            # Or we can wait for the PlayerPanel which is part of Board.
            print("Waiting for board...")
            page.wait_for_selector(".board-container", timeout=5000)

            # Take screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification/board_screenshot.png")
            print("Screenshot saved to verification/board_screenshot.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_screenshot.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_board()
