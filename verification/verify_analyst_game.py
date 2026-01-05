import sys
import os

# Add local node_modules to PATH for npx
os.environ["PATH"] += os.pathsep + os.path.join(os.getcwd(), "node_modules", ".bin")

from playwright.sync_api import sync_playwright

def verify_analyst_panel_in_game():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        try:
            page.goto("http://localhost:4173/catan-hex-mastery/")

            # 1. Start a game to get to the Board/Analyst view
            page.wait_for_selector("text=2 Players", timeout=10000)
            page.click("text=2 Players")

            # Wait for Game Board load
            page.wait_for_selector("div[data-testid=\"game-layout\"]", timeout=10000)

            # 2. Check Analyst Panel
            if page.is_visible("text=Coach Mode"):
                print("Analyst Panel is visible.")
            else:
                 # Toggle it if needed (though desktop default is open)
                if page.is_visible("button[aria-label=\"Toggle Analyst Dashboard\"]"):
                    page.click("button[aria-label=\"Toggle Analyst Dashboard\"]")

            page.wait_for_selector("text=Coach Mode")

            # 3. Take Screenshot
            page.screenshot(path="verification/analyst_panel_game.png")
            print("Screenshot captured: verification/analyst_panel_game.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_game.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_analyst_panel_in_game()
