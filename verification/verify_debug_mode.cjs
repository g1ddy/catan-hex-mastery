const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Navigating to Setup Page...');
  await page.goto('http://localhost:4173/catan-hex-mastery/');

  console.log('Taking screenshot of Setup Page with new Debug Button...');
  await page.screenshot({ path: 'verification/setup_page.png' });

  console.log('Clicking Debug Button...');
  await page.getByRole('button', { name: 'Start Debug Session (1 Player)' }).click();

  console.log('Waiting for game to load...');
  await page.waitForURL(/.*game/);
  // Wait for board to be visible
  await page.waitForSelector('.board');

  // Wait a moment for debug panel to inject
  await page.waitForTimeout(2000);

  console.log('Taking screenshot of Game Page in Debug Mode...');
  await page.screenshot({ path: 'verification/debug_game_page.png' });

  await browser.close();
})();
