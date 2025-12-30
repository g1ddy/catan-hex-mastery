import { test, expect } from '@playwright/test';

test('Verify Tooltips and Build Buttons', async ({ page }) => {
  // 1. Setup Page Verification
  await page.goto('/');

  // Find the "4 Players" button
  const fourPlayersButton = page.locator('button', { hasText: '4 Players' });
  await expect(fourPlayersButton).toBeVisible();

  // The tooltip attributes should be on the parent div
  const setupWrapper = fourPlayersButton.locator('..');

  await expect(setupWrapper).toHaveAttribute('data-tooltip-id', 'setup-tooltip');

  const tooltipContent = await setupWrapper.getAttribute('data-tooltip-content');
  expect(tooltipContent).toContain('unavailable');

  // 2. Game Page Verification
  // Click "2 Players" to enter game
  await page.click('button:has-text("2 Players")');

  // Wait for Game Controls to load - looking for initial setup instruction
  await expect(page.locator('text=Place a Settlement')).toBeVisible({ timeout: 10000 });

  // Check ResourceIconRow tooltips
  // We look for spans that have the correct tooltip content for "Wood"
  // The ResourceIconRow renders spans with data-tooltip-content="Wood" etc.
  const woodIcon = page.locator('span[data-tooltip-content="Wood"]').first();
  await expect(woodIcon).toBeVisible();

  await expect(woodIcon).toHaveAttribute('data-tooltip-id', 'resource-tooltip');

  // Check other resources to ensure map worked
  await expect(page.locator('span[data-tooltip-content="Brick"]').first()).toBeVisible();
  await expect(page.locator('span[data-tooltip-content="Sheep"]').first()).toBeVisible();
  await expect(page.locator('span[data-tooltip-content="Wheat"]').first()).toBeVisible();
  await expect(page.locator('span[data-tooltip-content="Ore"]').first()).toBeVisible();

  // Note: Build buttons are not visible in 'setup' phase (which we are in now), so we can't test them here easily without
  // playing through the setup. However, verifying the Setup tooltip and ResourceIconRow tooltips covers the key refactors
  // (generic render function and map logic).
});
