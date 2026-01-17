import { test, expect } from '@playwright/test';

test.describe('Player Name Truncation Verification', () => {
  test('Desktop: Player name is truncated and shows a tooltip', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Skip desktop test on mobile devices');

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.getByRole('button', { name: '3 Players (No Bots)' }).click();

    const beginButton = page.locator('button', { hasText: 'Begin Placement' });
    await expect(beginButton).toBeVisible({ timeout: 10000 });
    await beginButton.click();

    await expect(page.locator('text=Place Settlement')).toBeVisible();

    const playerPanel = page.locator('.player-panel');
    await expect(playerPanel).toBeVisible();

    const player1Name = playerPanel.locator('span[title="P1: Player 1"]');
    await expect(player1Name).toBeVisible();
    await expect(player1Name).toHaveClass(/truncate/);

    await playerPanel.screenshot({ path: 'tests/e2e/player-panel-truncation.png' });
  });
});
