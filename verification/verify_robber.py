from playwright.sync_api import sync_playwright, expect
import time

def verify_robber(page):
    # Navigate to app
    page.goto("http://localhost:5173")

    # Wait for load
    page.wait_for_load_state("networkidle")

    # Click "2 Players" button (Start game)
    start_btn = page.get_by_role("button", name="Start game with 2 players")
    if start_btn.count() == 0:
        start_btn = page.get_by_text("2 Players")

    if start_btn.count() > 0:
        start_btn.first.click()
    else:
        print("Could not find start button, taking screenshot")
        page.screenshot(path="verification/setup_page.png")
        return

    # Wait for board
    page.wait_for_selector(".hex-grid-svg", timeout=10000)

    # Verify Skull exists
    skull_locator = page.locator(".lucide-skull").first
    expect(skull_locator).to_be_visible()

    # Take screenshot
    page.screenshot(path="verification/robber_board.png")

    print("Found skull")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_robber(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
