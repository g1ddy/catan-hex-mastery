
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 }, // Mobile Viewport
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Load the preview URL (ensure preview server is running)
  await page.goto('http://localhost:4173/catan-hex-mastery/');

  // 2 Players
  await page.click('button:has-text("2 Players")');

  // Start Placement
  const beginButton = page.locator('button', { hasText: 'Begin Placement' });
  await beginButton.waitFor();
  await beginButton.click();

  // Wait for board and panel
  await page.waitForSelector('.player-panel');
  await page.waitForTimeout(1000); // Give animations a moment

  // Take screenshot of Mobile
  await page.screenshot({ path: 'verification/mobile_panel.png' });

  await browser.close();
})();
