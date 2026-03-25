from playwright.sync_api import Page, expect, sync_playwright

def verify_feature(page: Page):
  page.goto("http://localhost:5173/catan-hex-mastery/")
  page.wait_for_timeout(500)

  # Hide the debug panel via CSS
  page.add_style_tag(content=".debug-panel { display: none !important; }")

  # Start a 3-player game
  no_bots_btn = page.get_by_role("button", name="3 Players (No Bots)")
  no_bots_btn.click()
  page.wait_for_timeout(500)

  # Begin Placement
  begin_placement_btn = page.get_by_role("button", name="Begin Placement")
  begin_placement_btn.click()
  page.wait_for_timeout(500)

  # Open Coach Panel (if not already open)
  coach_btn = page.locator('button[aria-label="Toggle Coach Bot"]')
  if coach_btn.is_visible():
      coach_btn.click(force=True)

  page.wait_for_timeout(500)

  # Check if "Resource Distribution" is visible
  expect(page.get_by_text("Resource Distribution", exact=True)).to_be_visible()

  # Save screenshot
  page.screenshot(path="/home/jules/verification/verification.png")
  page.wait_for_timeout(1000)

if __name__ == "__main__":
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(record_video_dir="/home/jules/verification/video")
    page = context.new_page()
    try:
      verify_feature(page)
    finally:
      context.close()
      browser.close()
