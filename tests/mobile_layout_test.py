import time
import sys
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
             user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
        )
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:5173/")

        # Setup: Select 2 Players
        try:
            page.wait_for_selector("button:has-text('2 Players')", timeout=5000)
            page.click("button:has-text('2 Players')")
        except Exception as e:
            print(f"Setup failed: {e}")
            browser.close()
            sys.exit(1)

        print("Waiting for Game Page...")
        time.sleep(3) # Wait for load

        # Check SVG 0 details
        print("--- INSPECTING BOARD SVG ---")
        debug_info = page.evaluate("""
            () => {
                const svg = document.querySelector('svg.grid');
                if (!svg) return null;

                const style = window.getComputedStyle(svg);
                const rect = svg.getBoundingClientRect();

                return {
                    width: rect.width,
                    height: rect.height,
                    computedDisplay: style.display,
                    computedPosition: style.position,
                    computedHeight: style.height,
                    className: svg.getAttribute('class')
                };
            }
        """)

        print(f"SVG Info: {debug_info}")

        if not debug_info:
            print("FAIL: SVG.grid not found.")
            browser.close()
            sys.exit(1)

        # Assertions
        if debug_info['height'] < 500:
            print(f"FAIL: Board height too small ({debug_info['height']}px). Expected > 500px.")
            browser.close()
            sys.exit(1)

        if debug_info['computedDisplay'] == 'grid':
            print("FAIL: Display is 'grid' (Tailwind conflict not resolved).")
            browser.close()
            sys.exit(1)

        print("PASS: Board SVG is visible, has correct display mode, and fills screen height.")
        browser.close()

if __name__ == "__main__":
    run_test()
