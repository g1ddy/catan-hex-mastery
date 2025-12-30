import { test, expect } from '@playwright/test';
import { GamePage } from './pages/GamePage';

test.describe('Desktop Layout', () => {
    // Only run this test in Chromium (Desktop)
    test.skip(({ isMobile }) => isMobile, 'Desktop only test');

    test('Verify Game Setup and Layout', async ({ page }) => {
        const game = new GamePage(page);

        console.log("Navigating to app...");
        await game.goto();

        console.log("Selecting 2 Players...");
        await game.selectTwoPlayers();

        console.log("Waiting for Game Page...");
        await expect(game.gameLayoutDesktop).toBeVisible({ timeout: 30000 });

        // Run Setup Sequence (Snake Draft: P1, P2, P2, P1)

        // P1
        console.log("P1 Turn");
        await game.placeSettlement();
        await game.placeRoad();

        // P2
        console.log("P2 Turn");
        await game.placeSettlement();
        await game.placeRoad();

        // P2 (Snake return)
        console.log("P2 Turn (Snake)");
        await game.placeSettlement();
        await game.placeRoad();

        // P1 (Final)
        console.log("P1 Turn (Snake)");
        await game.placeSettlement();
        await game.placeRoad();

        console.log("Setup complete. Waiting for Gameplay Phase...");

        // Verification: Roll Dice Button position
        const box = await game.getRollButtonBoundingBox();
        expect(box).not.toBeNull();

        if (box) {
            const viewportSize = page.viewportSize();
            if (viewportSize) {
                console.log(`Roll Button found at Y: ${box.y}, Height: ${box.height}`);
                // Check docking (should be near bottom, > 80% of viewport height)
                expect(box.y).toBeGreaterThan(viewportSize.height * 0.8);
            }
        }
    });
});
