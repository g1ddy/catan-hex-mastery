const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Navigating to Setup Page (Dev Mode)...');
  await page.goto('http://localhost:5173/');

  console.log('Clicking Debug Button...');
  await page.getByRole('button', { name: '1 Player (Debug)' }).click();

  console.log('Waiting for game to load...');
  await page.waitForURL(/.*game/);
  // Wait for board to be visible
  await page.waitForSelector('.board');

  // Wait for debug panel using the verified class name
  console.log('Waiting for Debug Panel (.debug-panel)...');
  await page.waitForSelector('.debug-panel');

  console.log('Taking screenshot of Game Page in Debug Mode...');
  await page.screenshot({ path: 'verification/debug_game_page.png' });

  await browser.close();
})();
