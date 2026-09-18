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
        await expect(page.locator('body')).toContainText('P1: Balanced');
        await expect(page.locator('body')).toContainText('P2: Aggressive Bot');
        await expect(page.locator('body')).toContainText('P3: Defensive Bot');

        // Explicitly verify the slow bots are NOT present
        await expect(page.locator('body')).not.toContainText('CatanMCTS');
        await expect(page.locator('body')).not.toContainText('MonteCatano');
    });

    test('normal three-bot production autoplay produces Balanced, CatanMCTS, MonteCatano', async ({ page }) => {
        // Normal configuration without scenario override
        await page.goto('/');

        await page.getByRole('button', { name: '0 Players (Auto Play)' }).click();

        // Wait for Game Layout
        const gameLayout = page.getByTestId('game-layout');
        await expect(gameLayout).toBeVisible({ timeout: 10000 });

        // Normal autoplay config is Balanced, CatanMCTS, MonteCatano
        await expect(page.locator('body')).toContainText('P1: Balanced');
        await expect(page.locator('body')).toContainText('P2: CatanMCTS');
        await expect(page.locator('body')).toContainText('P3: MonteCatano');
    });
});
