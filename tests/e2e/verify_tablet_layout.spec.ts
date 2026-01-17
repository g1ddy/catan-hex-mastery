import { test, expect } from '@playwright/test';

test('verify tablet layout', async ({ page }) => {
  await page.goto('/');

  // Wait for the page to load
  await expect(page.locator('body')).toBeVisible();

  // Start a 2-player game
  await page.getByRole('button', { name: 'Start game with 2 players' }).click();

  // Wait for the game layout to be visible
  await expect(page.locator('[data-testid="game-layout"]')).toBeVisible();

  // Hide the debug panel if it's visible
  const hideButton = page.getByRole('button', { name: 'hide' });
  if (await hideButton.isVisible()) {
    await hideButton.click();
  }

  // Take a screenshot for verification
  await page.screenshot({ path: '/home/jules/verification/verification_tablet.png', fullPage: true });
});
