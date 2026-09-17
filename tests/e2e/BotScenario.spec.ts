import { test, expect } from '@playwright/test';

test.describe('Bot Scenario Propagation', () => {
    test('propagates bot_scenario query param from setup to game page', async ({ page }) => {
        // 1. Go to Setup Page with the override
        await page.goto('/?bot_scenario=fast-autoplay');

        // 2. Select "0 Players (Auto Play)" to trigger navigation to /game
        await page.getByRole('button', { name: '0 Players (Auto Play)' }).click();

        // 3. Verify that the URL on the game page still contains the query parameter
        await expect(page).toHaveURL(/.*bot_scenario=fast-autoplay.*/);

        // 4. Wait for Game Layout
        const gameLayout = page.getByTestId('game-layout');
        await expect(gameLayout).toBeVisible({ timeout: 10000 });

        // 5. Verify the bots in the UI
        // In the fast-autoplay scenario, the bots should be Balanced, Aggressive, Defensive
        // Let's verify their names appear in the UI.
        // It's safer to just check that the page contains the text somewhere.
        await expect(page.locator('body')).toContainText('P1: Balanced');
        await expect(page.locator('body')).toContainText('P2: Aggressive Bot');
        await expect(page.locator('body')).toContainText('P3: Defensive Bot');
    });
});
