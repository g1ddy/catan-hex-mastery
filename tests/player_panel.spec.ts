import { test, expect } from '@playwright/test';

test.describe('Player Panel Tests', () => {
  test('Desktop: Player Panel is visible and tooltips work', async ({ page }) => {
    // Navigate to game with 2 players
    await page.goto('/');
    await page.click('button:has-text("2 Players")');

    // Wait for the "Begin Placement" button and click it to enter placement mode
    const beginButton = page.locator('button', { hasText: 'Begin Placement' });
    await expect(beginButton).toBeVisible({ timeout: 10000 });
    await beginButton.click();

    // Now wait for the instruction text
    await expect(page.locator('text=Place a Settlement')).toBeVisible();

    // Verify Player Panel is visible
    const playerPanel = page.locator('.player-panel');
    await expect(playerPanel).toBeVisible();

    // Verify Player 1 and Player 2 are listed
    await expect(playerPanel.locator('text=Player 1')).toBeVisible();
    await expect(playerPanel.locator('text=Player 2')).toBeVisible();

    // Find a resource icon (Wood) in the player panel
    // We target the span that has data-tooltip-content="Wood" inside the player panel
    const woodIcon = playerPanel.locator('span[data-tooltip-content="Wood"]').first();
    await expect(woodIcon).toBeVisible();

    // Hover over the icon to trigger the tooltip
    await woodIcon.hover();

    // Verify the tooltip is visible
    // react-tooltip usually renders a div with the id 'resource-tooltip'
    const tooltip = page.locator('#resource-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText('Wood');

    // Check z-index to be sure
    await expect(tooltip).toHaveClass(/z-\[1000\]/);
  });

  test('Mobile: Docked Player Panel works', async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to game
    await page.goto('/');
    await page.click('button:has-text("2 Players")');

    // Wait for "Begin Placement" and click
    const beginButton = page.locator('button', { hasText: 'Begin Placement' });
    await expect(beginButton).toBeVisible({ timeout: 10000 });
    await beginButton.click();

    // Wait for instruction
    await expect(page.locator('text=Place a Settlement')).toBeVisible();

    // In mobile, verify the summary row exists (Docked panel)
    const p1Label = page.locator('text=P1');
    await expect(p1Label).toBeVisible();

    // Verify resource icons for active player are visible immediately (as per code)
    // The active player block in mobile has bg-slate-800 and should show icons.
    const woodIcon = page.locator('span[data-tooltip-content="Wood"]').first();
    await expect(woodIcon).toBeVisible();
  });
});
