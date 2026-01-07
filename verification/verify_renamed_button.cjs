const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Navigating to Setup Page (Dev Mode)...');
  await page.goto('http://localhost:5173/catan-hex-mastery/');

  console.log('Checking for renamed button...');
  const button = page.getByRole('button', { name: '1 Player (Debug)' });

  if (await button.isVisible()) {
    console.log('SUCCESS: Button "1 Player (Debug)" is visible.');
    await page.screenshot({ path: 'verification/final_setup_page.png' });
  } else {
    console.error('FAILURE: Button not found.');
  }

  await browser.close();
})();
