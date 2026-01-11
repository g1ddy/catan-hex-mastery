import { test, expect } from '@playwright/test';

test('Debug Mode (Single Player) Setup and AI Controls Verification', async ({ page }) => {
  // 1. Navigate to Setup Page
  await page.goto('/');

  // 2. Click "1 Player (Debug)" button
  const debugButton = page.getByRole('button', { name: '1 Player (Debug)' });
  await expect(debugButton).toBeVisible();
  await debugButton.click();

  // 3. Wait for game to load (GamePage)
  const debugPanel = page.locator('.debug-panel');
  await expect(debugPanel).toBeVisible({ timeout: 15000 });

  // 4. Ensure AI Tab is selected
  const aiTab = page.getByText('AI', { exact: true });
  if (await aiTab.isVisible()) {
      await aiTab.click();
  }

  // 5. Verify AI Controls are present
  await expect(page.getByText('simulate')).toBeVisible();

  // 6. Start the Game Setup (since we are in Setup phase)
  const beginButton = page.getByRole('button', { name: 'Begin Placement' });
  if (await beginButton.isVisible()) {
      await beginButton.click();
  }

  // 7. Verify Bot Action
  // Instead of keyboard shortcut, try clicking the "play" control in the debug panel.
  const playControl = page.locator('.debug-panel').getByText('play', { exact: false }).first();
  await expect(playControl).toBeVisible();
  await playControl.click();

  // Fallback: Try pressing '2' as well if click fails to trigger (sometimes it's just a label)
  await page.waitForTimeout(500);
  await page.keyboard.press('2');

  // 8. Verify State Change
  await expect(page.locator('body')).toContainText(/Sett: [1-9]|Roads: [1-9]/, { timeout: 10000 });
});
