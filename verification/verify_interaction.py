import sys
import os

# Add local node_modules to PATH for npx
os.environ["PATH"] += os.pathsep + os.path.join(os.getcwd(), "node_modules", ".bin")

from playwright.sync_api import sync_playwright

def verify_analyst_panel_interaction():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        try:
            page.goto("http://localhost:4173/catan-hex-mastery/")

            # 1. Start a game
            page.wait_for_selector("text=2 Players", timeout=10000)
            page.click("text=2 Players")

            # Wait for Game Board load
            page.wait_for_selector("div[data-testid=\"game-layout\"]", timeout=10000)

            # 2. Check Coach Mode Toggle Click (via Label)
            # Find the input check status
            toggle_input = page.locator("input[aria-label=\"Toggle Coach Mode\"]")

            # Initially uncheck (default)
            if toggle_input.is_checked():
                print("Coach mode was enabled, resetting.")
                toggle_input.click()

            # Click the LABEL text "Coach Mode"
            print("Clicking Coach Mode text label...")
            page.click("text=Coach Mode")

            # Verify input is now checked
            if toggle_input.is_checked():
                print("SUCCESS: Clicking label toggled the checkbox ON.")
            else:
                print("FAILURE: Clicking label did NOT toggle checkbox.")

            # Click the LABEL again
            print("Clicking Coach Mode text label again...")
            page.click("text=Coach Mode")

             # Verify input is now unchecked
            if not toggle_input.is_checked():
                print("SUCCESS: Clicking label toggled the checkbox OFF.")
            else:
                print("FAILURE: Clicking label did NOT toggle checkbox.")


            # 3. Check Regenerate Board Toast
            # Click Regenerate Board
            print("Clicking Regenerate Board...")
            page.click("button:has-text(\"Regenerate Board\")")

            # Wait for toast
            # Toast usually has role=status or some class.
            # react-hot-toast creates div with aria-live="polite" usually, or we check text "Board regenerated!"
            try:
                page.wait_for_selector("text=Board regenerated!", timeout=3000)
                print("SUCCESS: Toast notification appeared.")
            except Exception:
                print("FAILURE: Toast notification did NOT appear.")


            # 3. Take Screenshot of final state
            page.screenshot(path="verification/analyst_interaction.png")
            print("Screenshot captured: verification/analyst_interaction.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_interaction.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_analyst_panel_interaction()
