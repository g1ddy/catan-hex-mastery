import { test, expect } from '@playwright/test';
import { GamePage } from './pages/GamePage';

test.describe('Mobile Layout', () => {
    // Only run this test in Mobile Safari (or when isMobile is true)
    test.skip(({ isMobile }) => !isMobile, 'Mobile only test');

    test('Verify Mobile Layout and SVG', async ({ page }) => {
        const game = new GamePage(page);

        await game.goto();
        await game.selectTwoPlayers();
        await expect(game.gameLayout).toBeVisible({ timeout: 10000 });

        const debugInfo = await game.getBoardSvgInfo();
        expect(debugInfo).not.toBeNull();

        // Check SVG 0 details
        expect(debugInfo!.height).toBeGreaterThan(500);
        expect(debugInfo!.computedDisplay).not.toBe('grid');
    });
});
