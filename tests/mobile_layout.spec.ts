import { test, expect } from '@playwright/test';
import { GamePage } from './pages/GamePage';

test.describe('Mobile Layout', () => {
    // Only run this test in Mobile Safari (or when isMobile is true)
    test.skip(({ isMobile }) => !isMobile, 'Mobile only test');

    test('Verify Mobile Layout and SVG', async ({ page }) => {
        const game = new GamePage(page);

        console.log("Navigating to app...");
        await game.goto();

        console.log("Selecting 2 Players...");
        await game.selectTwoPlayers();

        console.log("Waiting for Game Page...");
        await expect(game.gamePageMobile).toBeVisible({ timeout: 10000 });

        console.log("--- INSPECTING BOARD SVG ---");
        const debugInfo = await game.getBoardSvgInfo();

        console.log(`SVG Info: ${JSON.stringify(debugInfo)}`);

        expect(debugInfo).not.toBeNull();

        if (debugInfo) {
            // Check SVG 0 details
            if (debugInfo.height < 500) {
                 console.error(`FAIL: Board height too small (${debugInfo.height}px). Expected > 500px.`);
            }
            expect(debugInfo.height).toBeGreaterThan(500);

            if (debugInfo.computedDisplay === 'grid') {
                 console.error("FAIL: Display is 'grid' (Tailwind conflict not resolved).");
            }
            expect(debugInfo.computedDisplay).not.toBe('grid');
        }
    });
});
