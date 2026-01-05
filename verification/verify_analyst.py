import sys
import os

# Add local node_modules to PATH for npx
os.environ["PATH"] += os.pathsep + os.path.join(os.getcwd(), "node_modules", ".bin")

from playwright.sync_api import sync_playwright

def verify_analyst_panel():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        try:
            page.goto("http://localhost:4173/catan-hex-mastery/")

            # Wait for any content that confirms app load.
            # "Begin Placement" is a good candidate for the initial setup screen.
            # But let us just wait for the root element or something we know exists.
            page.wait_for_selector("div#root", timeout=10000)

            # Wait for something text-based to confirm rendering
            page.wait_for_selector("text=Players", timeout=10000)

            # On desktop, Analyst Panel should be open by default.
            if page.is_visible("text=Coach Mode"):
                print("Analyst Panel is visible.")
            else:
                print("Analyst Panel not visible. Checking for toggle.")
                if page.is_visible("button[aria-label=\"Toggle Analyst Dashboard\"]"):
                    page.click("button[aria-label=\"Toggle Analyst Dashboard\"]")
                    page.wait_for_selector("text=Coach Mode")
                else:
                    print("Neither panel nor toggle found.")

            # Take Screenshot
            page.screenshot(path="verification/analyst_panel.png")
            print("Screenshot captured: verification/analyst_panel.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_analyst_panel()
