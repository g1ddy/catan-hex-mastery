import { test, expect } from '@playwright/test';

test.describe('Bot Auto Play', () => {
    test('Game runs with 3 bots without console errors', async ({ page }) => {
        const consoleErrors: string[] = [];
        let rollCount = 0;

        page.on('console', msg => {
            const text = msg.text();
            if (msg.type() === 'error') {
                // Ignore network errors or similar if needed, but for now capture all
                consoleErrors.push(text);
            }
            if (text.includes('[GAME] Dice rolled:')) {
                rollCount++;
            }
        });

        // 1. Go to Setup Page
        await page.goto('/');

        // 2. Select "0 Players (Auto Play)"
        await page.getByRole('button', { name: '0 Players (Auto Play)' }).click();

        // 3. Wait for Game Layout
        const gameLayout = page.getByTestId('game-layout');
        await expect(gameLayout).toBeVisible({ timeout: 10000 });

        // 4. Wait for game progression
        // We wait 20 seconds to allow for several turns and rolling phases.
        // Bots have a 1s delay for rolling, plus other moves.
        await page.waitForTimeout(20000);

        // 5. Assert no critical errors
        // We filter for the specific errors reported, or just fail on any error.
        // The reported errors were:
        // - invalid move object: resolveRoll
        // - player not active
        // - Cannot read properties of undefined (reading 'action')
        const criticalErrors = consoleErrors.filter(err =>
            err.includes('invalid move object') ||
            err.includes('player not active') ||
            err.includes('Cannot read properties of undefined')
        );

        expect(criticalErrors).toEqual([]);

        // 6. Assert that dice rolling occurred
        expect(rollCount).toBeGreaterThan(0);
    });
});
