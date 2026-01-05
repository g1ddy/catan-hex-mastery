import { test } from '@playwright/test';

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
    await page.screenshot({ path: 'tests/screenshots/latest_desktop.png', fullPage: true });
  });

  test('Capture Mobile Screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.getByRole('button', { name: '2 Players' }).click();
    await page.getByRole('button', { name: 'Begin Placement' }).waitFor({ state: 'visible', timeout: 15000 });

    // Screenshot 3: Mobile Drawer Closed (Default)
    await page.screenshot({ path: 'tests/screenshots/troubleshoot_mobile_closed.png', fullPage: true });

    // Open Drawer
    // Use force: true as previous runs indicated interception by grid
    await page.getByRole('button', { name: 'Toggle Analyst Dashboard' }).click({ force: true });

    // Wait for the drawer content to be visible instead of using fixed timeout
    // Using text selector as class selector .analyst-panel is not present
    await page.getByText('Player Production Potential').waitFor({ state: 'visible' });

    // Screenshot 4: Mobile Drawer Open
    await page.screenshot({ path: 'tests/screenshots/troubleshoot_mobile_open.png', fullPage: true });
  });

});
