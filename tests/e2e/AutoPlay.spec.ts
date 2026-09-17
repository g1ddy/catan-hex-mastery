import { test, expect } from '@playwright/test';

test.describe('Auto Play Mode', () => {
  test('should allow 4 bots to play by themselves', async ({ page }) => {
    // Use the fast heuristic scenario so this browser smoke test does not invoke MCTS.
    await page.goto('/?bot_scenario=fast-autoplay');

    // 2. Click "0 Players (Auto Play)" button
    // It should be visible in production build too
    const autoPlayBtn = page.getByRole('button', { name: '0 Players (Auto Play)' });
    await expect(autoPlayBtn).toBeVisible();
    await autoPlayBtn.click();

    // 3. Verify navigation to Game Page and scenario propagation
    await expect(page).toHaveURL(/\/game\?bot_scenario=fast-autoplay/);

    // 4. Verify Game Board loads
    const gameBoard = page.locator('[data-testid="game-layout"]');
    await expect(gameBoard).toBeVisible();

    // 5. Verify Bots are Playing
    // Wait for at least one settlement to appear on the board.
    // The BuildingIcon component uses data-testid="settlement-icon"
    await expect(async () => {
        const settlements = page.getByTestId('settlement-icon');
        const count = await settlements.count();
        expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 30000 });
  });
});
