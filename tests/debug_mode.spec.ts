import { test, expect } from '@playwright/test';

test('Debug Mode (Single Player) Setup Verification', async ({ page }) => {
  // 1. Navigate to the root (Setup Page)
  await page.goto('/');

  // 2. Verify we are on the Setup Page
  await expect(page.getByRole('heading', { name: 'Hex Mastery - Setup' })).toBeVisible();

  // 3. Click the "1 Player (Debug)" button
  const debugButton = page.getByRole('button', { name: '1 Player (Debug)' });
  await expect(debugButton).toBeVisible();
  await debugButton.click();

  // 4. Verify we are navigated to the Game Page
  await expect(page).toHaveURL(/.*game/);

  // 5. Verify the Board is rendered
  const gameLayout = page.getByTestId('game-layout');
  await expect(gameLayout).toBeVisible({ timeout: 10000 });

  // 6. Verify Debug Panel Integration
  // We use the class selector verified in diagnostics (.debug-panel)
  // This confirms the Single Player Client (which enables debug) is active.
  const debugPanel = page.locator('.debug-panel');
  await expect(debugPanel).toBeVisible({ timeout: 10000 });
});
