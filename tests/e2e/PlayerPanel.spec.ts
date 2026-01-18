import { test, expect } from '@playwright/test';

test.describe('Player Panel Tests', () => {
  test('Desktop: Player Panel is visible and tooltips work', async ({ page, isMobile }) => {
    // Skip this test on mobile devices to prevent emulation conflicts
    test.skip(isMobile, 'Skip desktop test on mobile devices');

    // Explicitly set Desktop viewport to ensure responsive classes (md:) trigger correctly
    // regardless of the browser project configuration (e.g. Mobile Safari worker).
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to game with 3 players
    await page.goto('/');
    await page.getByRole('button', { name: '3 Players (No Bots)' }).click();

    // Wait for the "Begin Placement" button and click it to enter placement mode
    const beginButton = page.locator('button', { hasText: 'Begin Placement' });
    await expect(beginButton).toBeVisible({ timeout: 10000 });
    await beginButton.click();

    // Now wait for the instruction text
    await expect(page.locator('text=Place Settlement')).toBeVisible();

    // Verify Player Panel is visible
    const playerPanel = page.locator('.player-panel');
    await expect(playerPanel).toBeVisible();

    // Verify "Players" header is visible on Desktop
    await expect(playerPanel.locator('h3:has-text("Players")')).toBeVisible();

    // Verify Player 1 and Player 2 are listed
    // On desktop, "Player 1" text should be visible.
    await expect(playerPanel.locator('text=Player 1')).toBeVisible();
    await expect(playerPanel.locator('text=Player 2')).toBeVisible();

    // Find a resource icon (Wood) in the player panel
    // We explicitly target the desktop container (.hidden.md:block) to ensure we get the visible one.
    // The class structure in PlayerPanel.tsx is <div className="hidden md:block">...<ResourceIconRow>
    const desktopIconRow = playerPanel.locator('.hidden.md\\:block');
    const woodIcon = desktopIconRow.locator('span[data-tooltip-content="Wood"]').first();
    await expect(woodIcon).toBeVisible();

    // Hover over the icon to trigger the tooltip
    await woodIcon.hover();

    // Verify the tooltip is visible
    // react-tooltip usually renders a div with the id 'resource-tooltip'
    const tooltip = page.locator('#resource-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText('Wood');

    // Check z-index to be sure
    await expect(tooltip).toHaveCSS('z-index', '1000');
  });

  test('Mobile: Docked Player Panel works', async ({ page, isMobile: _isMobile }) => {
    // Ideally we should skip if !isMobile, but we allow checking mobile layout on Desktop via viewport resizing
    // So we don't skip here.

    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to game
    await page.goto('/');
    await page.getByRole('button', { name: '3 Players (No Bots)' }).click();

    // Wait for "Begin Placement" and click
    const beginButton = page.locator('button', { hasText: 'Begin Placement' });
    await expect(beginButton).toBeVisible({ timeout: 10000 });
    await beginButton.click();

    // Wait for instruction
    await expect(page.locator('text=Place Settlement')).toBeVisible();

    // In mobile, verify the summary row exists (Docked panel)
    // The "Players" header should be hidden
    const playerPanel = page.locator('.player-panel');
    await expect(playerPanel.locator('h3:has-text("Players")')).toBeHidden();

    // "Player 1" full text should be hidden, "P1" should be visible
    const p1Label = playerPanel.locator('span.md\\:hidden:has-text("P1")');
    await expect(p1Label).toBeVisible();
    // In mobile, the active player's VP count is visible in the mobile-only container.
    const mobileVPLocator = playerPanel.locator('.md\\:hidden').locator('text=/VP:? \\d+/');
    await expect(mobileVPLocator).toBeVisible();
    await expect(playerPanel.locator('text=Player 1')).toBeHidden();

    // Verify resource icons for active player are visible immediately.
    // In our refactor, mobile icons are in the `.md:hidden` container.
    // Since we are in mobile viewport, the desktop one is hidden via CSS.
    // The selector finds the first match, which happens to be the mobile one.
    const woodIcon = playerPanel.locator('span[data-tooltip-content="Wood"]').first();
    await expect(woodIcon).toBeVisible();

    // Trigger tooltip on mobile (tap/click)
    await woodIcon.click();

    // Verify the tooltip is visible on mobile
    const tooltip = page.locator('#resource-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText('Wood');

    // Check z-index on mobile as well
    await expect(tooltip).toHaveCSS('z-index', '1000');
  });
});
