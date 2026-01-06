import { test, expect } from '@playwright/test';

test('Debug Mode (Single Player) Setup Verification', async ({ page }) => {
  // 1. Navigate to the root (Setup Page)
  await page.goto('/');

  // 2. Verify we are on the Setup Page
  await expect(page.getByRole('heading', { name: 'Hex Mastery - Setup' })).toBeVisible();

  // 3. Click the "Start Debug Session" button
  const debugButton = page.getByRole('button', { name: 'Start Debug Session (1 Player)' });
  await expect(debugButton).toBeVisible();
  await debugButton.click();

  // 4. Verify we are navigated to the Game Page
  await expect(page).toHaveURL(/.*game/);

  // 5. Verify the Board is rendered
  // This confirms that the GameClientFactory successfully instantiated a client (SinglePlayerClient)
  // and that the game initialized without errors.
  const gameLayout = page.getByTestId('game-layout');
  await expect(gameLayout).toBeVisible({ timeout: 10000 });
});
