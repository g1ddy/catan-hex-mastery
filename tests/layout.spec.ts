import { test, expect } from '@playwright/test';

/**
 * Validates the Unified Game Layout behavior on Desktop and Mobile.
 * Replaces the temporary visual verification script.
 */

test.describe('Game Layout and Navigation', () => {

  test('Desktop: Sidebar collapses and expands', async ({ page }) => {
    // 1. Setup Desktop Viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:4173/catan-hex-mastery/#/');
    await page.getByRole('button', { name: '2 Players' }).click();
    await page.getByRole('button', { name: 'Begin Placement' }).waitFor({ state: 'visible', timeout: 15000 });

    // 2. Verify Initial State (Sidebar Open)
    const collapseBtn = page.getByRole('button', { name: 'Collapse Sidebar' });
    await expect(collapseBtn).toBeVisible();
    await expect(page.getByText('Analyst Dashboard', { exact: true })).toBeVisible();

    // 3. Collapse Sidebar
    await collapseBtn.click();

    // 4. Verify Sidebar Closed State
    await expect(collapseBtn).not.toBeVisible();
    const toggleBtn = page.getByRole('button', { name: 'Toggle Analyst Dashboard' });
    await expect(toggleBtn).toBeVisible();

    // 5. Expand Sidebar
    // Use force: true as a robust fallback against any stacking context issues in headless mode
    // Wait for transition to stabilize
    await toggleBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // 6. Verify Sidebar Open Again
    await expect(collapseBtn).toBeVisible();
    await expect(toggleBtn).not.toBeVisible();
  });

  test('Mobile: Drawer opens and closes', async ({ page }) => {
    // 1. Setup Mobile Viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:4173/catan-hex-mastery/#/');
    await page.getByRole('button', { name: '2 Players' }).click();
    await page.getByRole('button', { name: 'Begin Placement' }).waitFor({ state: 'visible', timeout: 15000 });

    // 2. Verify Initial State (Drawer Closed)
    const toggleBtn = page.getByRole('button', { name: 'Toggle Analyst Dashboard' });
    await expect(toggleBtn).toBeVisible();

    // "Close Analyst Panel" button inside drawer should not be visible yet
    const closeBtn = page.getByRole('button', { name: 'Close Analyst Panel' });
    await expect(closeBtn).not.toBeVisible();

    // 3. Open Drawer
    // Use force: true to bypass potential SVG occlusion in headless mode
    await toggleBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // 4. Verify Drawer Open
    await expect(closeBtn).toBeVisible();
    await expect(page.getByText('Analyst Dashboard', { exact: true })).toBeVisible();

    // 5. Close Drawer
    await closeBtn.click();
    await page.waitForTimeout(1000);

    // 6. Verify Drawer Closed
    await expect(closeBtn).not.toBeVisible();
    await expect(toggleBtn).toBeVisible();
  });

});
