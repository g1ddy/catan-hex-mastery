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

        // Wait for controls to appear (e.g. "Begin Placement")
        // The exact selector depends on the game state, but the container should be there.
        // We look for the controls container. GameControls component usually has "Begin Placement" initially or "Roll"
        const controlsButton = page.locator('button', { hasText: /Begin Placement|Roll|Cancel/ }).first();
        await expect(controlsButton).toBeInViewport();
    });
});
