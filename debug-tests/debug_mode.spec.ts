import { test, expect } from '@playwright/test';

test('Debug Mode (Single Player) Setup and AI Controls Verification', async ({ page }) => {
  // 1. Go to Setup Page
  await page.goto('/');

  // 2. Click "1 Player (Debug)"
  // This button is only available in DEV mode, which this test config ensures.
  const debugButton = page.getByRole('button', { name: '1 Player (Debug)' });
  await expect(debugButton).toBeVisible();
  await debugButton.click();

  // 3. Wait for game to load and Debug Panel to appear
  await page.waitForSelector('.debug-panel', { timeout: 15000 });
  await expect(page.locator('.debug-panel')).toBeVisible();

  // 4. Open AI Tab
  // The tab button usually has text "AI"
  const aiTab = page.locator('.debug-panel').getByRole('button', { name: 'AI', exact: true });
  await expect(aiTab).toBeVisible();
  await aiTab.click();

  // 5. Verify AI Controls
  // Look for MCTS controls which appear when a bot is correctly wired
  await expect(page.getByRole('button', { name: 'simulate' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'play' })).toBeVisible();
  await expect(page.getByText('iterations')).toBeVisible();
});
