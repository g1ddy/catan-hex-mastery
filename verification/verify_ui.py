from playwright.sync_api import sync_playwright, expect
import time

def verify_game_controls():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        try:
            # 1. Setup: Start Game
            page.goto("http://localhost:5173/catan-hex-mastery/")

            # Click "2 Players"
            page.get_by_role("button", name="2 Players").click()

            # Wait for Game Board
            page.wait_for_selector("text=Place a Settlement", timeout=10000)

            page.screenshot(path="verification/game_started.png")
            print("Successfully started game.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_game_controls()
