import { test, expect } from '@playwright/test';
import { GamePage } from './pages/GamePage';

test.describe('Desktop Layout', () => {
    // Only run this test in Chromium (Desktop)
    test.skip(({ isMobile }) => isMobile, 'Desktop only test');

    test('Verify Game Setup and Layout', async ({ page, baseURL }) => {
        const game = new GamePage(page);
        console.log('Navigating to:', baseURL);

        await game.goto();
        await game.selectTwoPlayers();

        await expect(game.gameLayout).toBeVisible({ timeout: 30000 });

        // Run Setup Sequence (Snake Draft: P1, P2, P2, P1)
        // P1
        await game.placeSettlement();
        await game.placeRoad();

        // P2
        await game.placeSettlement();
        await game.placeRoad();

        // P2 (Snake return)
        await game.placeSettlement();
        await game.placeRoad();

        // P1 (Final)
        await game.placeSettlement();
        await game.placeRoad();

        // Verification: Roll Dice Button position
        const box = await game.getRollButtonBoundingBox();
        expect(box).not.toBeNull();

        const viewportSize = page.viewportSize()!;
        // Check docking (should be near bottom, > 80% of viewport height)
        expect(box!.y).toBeGreaterThan(viewportSize.height * 0.8);
    });
});
