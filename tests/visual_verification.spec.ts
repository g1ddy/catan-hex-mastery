import { test, expect } from '@playwright/test';

test('visual baseline desktop', async ({ page }) => {
  // Desktop Viewport
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:4173/catan-hex-mastery/#/');
  // Wait for loading
  await page.waitForTimeout(1000);
  // Start 2 Player Game
  await page.getByRole('button', { name: '2 Players' }).click();
  // Wait for board to load
  await page.getByRole('button', { name: 'Begin Placement' }).waitFor({ state: 'visible', timeout: 10000 });

  // Take screenshot
  await page.screenshot({ path: 'baseline_desktop.png' });
});

test('visual baseline mobile', async ({ page }) => {
  // Mobile Viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:4173/catan-hex-mastery/#/');
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: '2 Players' }).click();
  await page.getByRole('button', { name: 'Begin Placement' }).waitFor({ state: 'visible', timeout: 10000 });

  // Take screenshot
  await page.screenshot({ path: 'baseline_mobile.png' });
});
