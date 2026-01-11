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

    // Screenshot 1: Desktop Sidebar Open (Default - Analyst)
    await page.screenshot({ path: 'tests/screenshots/latest_desktop.png', fullPage: true });

    // Collapse Sidebar (Analyst Panel)
    const collapseBtn = page.getByRole('button', { name: 'Collapse Sidebar' });
    // Ensure button is visible before clicking
    await collapseBtn.waitFor({ state: 'visible' });
    await collapseBtn.click();

    const toggleAnalystBtn = page.getByRole('button', { name: 'Toggle Analyst Dashboard' });
    await toggleAnalystBtn.waitFor({ state: 'visible' });

    // Screenshot 2: Desktop Sidebar Closed
    await page.screenshot({ path: 'tests/screenshots/latest_desktop_closed.png', fullPage: true });
  });

  test('Capture Mobile Screenshots', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.getByRole('button', { name: '2 Players' }).click();
    await page.getByRole('button', { name: 'Begin Placement' }).waitFor({ state: 'visible', timeout: 15000 });

    // Screenshot 3: Mobile Drawer Closed (Default)
    await page.screenshot({ path: 'tests/screenshots/troubleshoot_mobile_closed.png', fullPage: true });

    // Open Drawer (Coach Panel now contains Potentials)
    // Use force: true as previous runs indicated interception by grid
    // We want to check Player Production Potential, so we open the Coach Panel
    await page.getByRole('button', { name: 'Toggle Coach Bot' }).click({ force: true });

    // Wait for the drawer content to be visible instead of using fixed timeout
    // Using text selector as class selector .analyst-panel is not present
    await page.getByText('Player Production Potential').waitFor({ state: 'visible' });

    // Screenshot 4: Mobile Drawer Open
    await page.screenshot({ path: 'tests/screenshots/troubleshoot_mobile_open.png', fullPage: true });
  });

});
