import { test, expect } from '@playwright/test';

test.describe('Bot Auto Play', () => {
    // Note: This test explicitly uses the 'fast-autoplay' bot scenario (Balanced, Aggressive, Defensive)
    // to keep Playwright execution fast. It is a browser smoke test validating the game lifecycle.
    // The real MCTS matchup (Balanced vs CatanMCTS vs MonteCatano) is validated at the bot/integration layer.
    test('Game runs with 3 bots without console errors', async ({ page }) => {
        const consoleErrors: string[] = [];
        const moveLogs: string[] = [];

        page.on('console', msg => {
            const text = msg.text();
            if (msg.type() === 'error') {
                consoleErrors.push(text);
            }
            if (text.includes('[Move]')) {
                moveLogs.push(text);
                console.log(`[Browser] ${text}`);
            }
        });

        // 1. Go to Setup Page
        await page.goto('/?bot_scenario=fast-autoplay');

        // 2. Select "0 Players (Auto Play)"
        await page.getByRole('button', { name: '0 Players (Auto Play)' }).click();

        // 3. Wait for Game Layout
        const gameLayout = page.getByTestId('game-layout');
        await expect(gameLayout).toBeVisible({ timeout: 10000 });

        // 4. Wait for game progression
        // We wait 15 seconds to allow for several turns and rolling phases.
        await page.waitForTimeout(15000);

        // 5. Assert no critical errors
        const criticalErrors = consoleErrors.filter(err =>
            err.includes('invalid move object') ||
            err.includes('player not active') ||
            err.includes('Cannot read properties of undefined')
        );

        if (criticalErrors.length > 0) {
            console.error('Critical Errors found:', criticalErrors);
        }
        expect(criticalErrors).toEqual([]);

        // 6. Verify rolls occurred
        const rollDiceCount = moveLogs.filter(l => l.includes('rollDice')).length;
        const resolveRollCount = moveLogs.filter(l => l.includes('resolveRoll')).length;

        console.log(`Roll Stats: rollDice=${rollDiceCount}, resolveRoll=${resolveRollCount}`);
        // Assert that game is progressing significantly (more than 1 turn)
        expect(rollDiceCount).toBeGreaterThan(2);
        expect(resolveRollCount).toBeGreaterThan(2);
    });
});
