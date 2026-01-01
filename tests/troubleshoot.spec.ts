import { test, expect } from '@playwright/test';

/**
 * Captures screenshots for troubleshooting layout issues.
 */
test.describe('Layout Troubleshooting', () => {

  test('Capture Desktop Screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.getByRole('button', { name: '2 Players' }).click();
    await page.getByRole('button', { name: 'Begin Placement' }).waitFor({ state: 'visible', timeout: 15000 });

    // Screenshot 1: Desktop Sidebar Open (Default)
    await page.screenshot({ path: 'troubleshoot_desktop_open.png', fullPage: true });

    // Close Sidebar
    await page.getByRole('button', { name: 'Collapse Sidebar' }).click();
    await page.waitForTimeout(500); // Wait for transition
    // Screenshot 2: Desktop Sidebar Closed
    await page.screenshot({ path: 'troubleshoot_desktop_closed.png', fullPage: true });
  });

  test('Capture Mobile Screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.getByRole('button', { name: '2 Players' }).click();
    await page.getByRole('button', { name: 'Begin Placement' }).waitFor({ state: 'visible', timeout: 15000 });

    // Screenshot 3: Mobile Drawer Closed (Default)
    await page.screenshot({ path: 'troubleshoot_mobile_closed.png', fullPage: true });

    // Open Drawer
    // Use force: true as previous runs indicated interception by grid
    await page.getByRole('button', { name: 'Toggle Analyst Dashboard' }).click({ force: true });
    await page.waitForTimeout(500); // Wait for transition

    // Screenshot 4: Mobile Drawer Open
    await page.screenshot({ path: 'troubleshoot_mobile_open.png', fullPage: true });
  });

});
