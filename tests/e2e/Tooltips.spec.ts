import { test, expect } from '@playwright/test';

test('Verify Tooltips and Build Buttons', async ({ page }) => {
  // Explicitly set Desktop viewport to ensure consistent layout and selector behavior
  await page.setViewportSize({ width: 1280, height: 800 });

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
  await page.getByRole('button', { name: 'Start game with 2 players' }).click();

  // Click "Begin Placement" to start the setup phase
  const beginButton = page.getByRole('button', { name: 'Begin Placement' });
  await expect(beginButton).toBeVisible();
  await beginButton.click();

  // Wait for Game Controls to load - looking for initial setup instruction
  await expect(page.locator('text=Place Settlement')).toBeVisible({ timeout: 10000 });

  // Check ResourceIconRow tooltips
  // We explicitly target the desktop container (.hidden.md:block) to ensure we get the visible one.
  // The Mobile one (md:hidden) comes first in DOM but is hidden on desktop viewports.
  const desktopIconRow = page.locator('.hidden.md\\:block');

  const woodIcon = desktopIconRow.locator('span[data-tooltip-content="Wood"]').first();
  await expect(woodIcon).toBeVisible();
  await expect(woodIcon).toHaveAttribute('data-tooltip-id', 'resource-tooltip');

  // Check other resources to ensure map worked, using the same robust selector
  await expect(desktopIconRow.locator('span[data-tooltip-content="Brick"]').first()).toBeVisible();
  await expect(desktopIconRow.locator('span[data-tooltip-content="Sheep"]').first()).toBeVisible();
  await expect(desktopIconRow.locator('span[data-tooltip-content="Wheat"]').first()).toBeVisible();
  await expect(desktopIconRow.locator('span[data-tooltip-content="Ore"]').first()).toBeVisible();
});
