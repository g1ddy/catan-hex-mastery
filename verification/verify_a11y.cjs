
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Load the app (assuming preview runs on 4173)
  // Base path is /catan-hex-mastery/ according to memory/config
  await page.goto('http://localhost:4173/catan-hex-mastery/');

  // Wait for content to load
  await page.waitForSelector('h1:has-text("Hex Mastery")');

  // Select 2 players to start the game
  await page.click('button:has-text("2 Players")');

  // Wait for game controls to appear
  await page.waitForSelector('button:has-text("Begin Placement")');

  // Click Begin Placement
  await page.click('button:has-text("Begin Placement")');

  // Verify InstructionDisplay has accessibility attributes
  const instruction = page.locator('div[role="status"]');
  const role = await instruction.getAttribute('role');
  const live = await instruction.getAttribute('aria-live');
  const text = await instruction.textContent();

  console.log(`Instruction attributes: role=${role}, aria-live=${live}, text=${text.trim()}`);

  if (role !== 'status' || live !== 'polite') {
      console.error('InstructionDisplay missing accessibility attributes!');
      process.exit(1);
  }

  await page.screenshot({ path: 'verification/instructions.png' });

  // Now we need to get to the build phase to check the buttons.
  // This is hard to do in a simple script because we have to play through setup.
  // However, I can check if the InstructionDisplay is working as expected first.

  // To check build buttons, we need to be in gameplay phase.
  // I will rely on the unit test for the build buttons since simulating a full game setup is complex and flaky in a simple script.
  // But I can check if the buttons exist (hidden or disabled) if I could skip setup.

  // For this verification, confirming the instruction display attributes via Playwright is a good end-to-end check.

  await browser.close();
})();
