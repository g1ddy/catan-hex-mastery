import { test, expect } from '@playwright/test';
import { GamePage } from './pages/GamePage';

test.describe('Tablet Layout', () => {
  test('Verify Game Controls are visible without scrolling', async ({ page }) => {
    // Skip if not iPad
    test.skip(!test.info().project.name.includes('iPad'), 'iPad only test');
    const game = new GamePage(page);

    await game.goto();
    // Setup a 2-player game to ensure controls are loaded
    await game.selectTwoPlayers();

    // Wait for the game layout to be visible
    await expect(game.gameLayout).toBeVisible({ timeout: 10000 });

    // Wait for controls to appear
    const controlsContainer = page.locator('[data-testid="game-controls"]');
    await expect(controlsContainer).toBeVisible();
    await expect(controlsContainer).toBeInViewport();

    // Take a screenshot for verification
    await page.screenshot({ path: '/home/jules/verification/verification_tablet.png', fullPage: true });
  });
});
