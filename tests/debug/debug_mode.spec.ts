import { test, expect } from '@playwright/test';

test('Debug Mode (Single Player) Setup and AI Controls Verification', async ({ page }) => {
  // 1. Navigate to Setup Page
  await page.goto('/');

  // 2. Click "1 Player (Debug)" button
  const debugButton = page.getByRole('button', { name: '1 Player (Debug)' });
  await expect(debugButton).toBeVisible();
  await debugButton.click();

  // 3. Wait for game to load (GamePage)
  // We expect the Debug Panel to be present.
  const debugPanel = page.locator('.debug-panel');
  await expect(debugPanel).toBeVisible({ timeout: 15000 });

  // 4. Ensure AI Tab is selected
  // The debug panel has tabs: Main, Log, Info, AI.
  // We click "AI" to ensure the controls are visible.
  // Use a more relaxed locator just in case "AI" is part of a larger string, but 'AI' usually stands alone in the tab.
  // We use a try/catch or just attempt to click it if visible.
  const aiTab = page.getByText('AI', { exact: true });
  if (await aiTab.isVisible()) {
      await aiTab.click();
  }

  // 5. Verify AI Controls are present
  // Check for "simulate" which is a standard control in the AI tab.
  await expect(page.getByText('simulate')).toBeVisible();

  // 6. Start the Game Setup (since we are in Setup phase)
  const beginButton = page.getByRole('button', { name: 'Begin Placement' });
  if (await beginButton.isVisible()) {
      await beginButton.click();
  }

  // 7. Verify Bot Action (Click "Play" shortcut '2')
  // Pressing '2' triggers the "play" action.
  // We wait a bit to ensure the keypress registers.
  await page.waitForTimeout(500);
  await page.keyboard.press('2');

  // 8. Verify State Change
  // If the bot played, it should have placed a settlement.
  // We wait up to 10s for the bot move to process and update the UI.
  await expect(page.locator('body')).toContainText(/Sett: [1-9]|Roads: [1-9]/, { timeout: 10000 });
});
