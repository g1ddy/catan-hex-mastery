import { test, expect } from '@playwright/test';
import path from 'path';

// Define output directory
const OUTPUT_DIR = path.join(__dirname, '../docs/images');

test.describe('Documentation Screenshots', () => {

  test('generate hero-board-desktop.png', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Select 4 players to start the game
    await page.getByRole('button', { name: 'Start game with 4 players' }).click();

    // Wait for board to load
    await expect(page.locator('[data-testid="game-layout"]')).toBeVisible();
    await page.waitForTimeout(1000); // Allow animations/layout to settle

    // Take screenshot
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'hero-board-desktop.png') });
  });

  test('generate coach-heatmap.png', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Start game with 4 players' }).click();

    // Open Analyst Panel
    await page.getByRole('button', { name: 'Toggle Analyst Dashboard' }).click();

    // Enable Coach Mode
    const coachToggle = page.getByRole('checkbox', { name: /coach mode/i });
    if (!(await coachToggle.isChecked())) {
        await coachToggle.check();
    }

    // Wait for Heatmap to be visible (Gold rings)
    // We look for the "ring" class or gold stroke color used in Coach Mode
    await expect(page.locator('[stroke="#FFD700"]').first()).toBeVisible();

    await page.waitForTimeout(500); // Wait for fade-ins

    // Take screenshot
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'coach-heatmap.png') });
  });

  test('generate coach-tooltip.png', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Start game with 4 players' }).click();

    // Open Analyst Panel & Enable Coach Mode
    await page.getByRole('button', { name: 'Toggle Analyst Dashboard' }).click();
    const coachToggle = page.getByRole('checkbox', { name: /coach mode/i });
    await coachToggle.check();

    // Find a best move (Gold Ring) and hover
    const goldRing = page.locator('[stroke="#FFD700"]').first();
    await expect(goldRing).toBeVisible();

    // Force hover to trigger tooltip
    await goldRing.hover({ force: true });

    // Wait for tooltip to appear
    const tooltip = page.locator('.react-tooltip-core');
    await expect(tooltip).toBeVisible();
    await page.waitForTimeout(500); // Wait for tooltip animation

    // Take screenshot (Capture the central area where the tooltip likely is)
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'coach-tooltip.png') });
  });

  test('generate mobile-production.png', async ({ page }) => {
    // Mobile Viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Start game with 4 players' }).click();

    // Wait for layout
    await expect(page.locator('[data-testid="game-layout"]')).toBeVisible();

    // Open the Analyst/Stats Drawer (Mobile toggle is usually visible)
    await page.getByRole('button', { name: 'Toggle Analyst Dashboard' }).click();

    // Wait for drawer to slide up
    await page.waitForTimeout(500);

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'mobile-production.png') });
  });

  test('generate analyst-panel.png', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Start game with 4 players' }).click();

    // Open Analyst Panel
    await page.getByRole('button', { name: 'Toggle Analyst Dashboard' }).click();

    // Wait for panel contents (e.g., Fairness Meter text)
    await expect(page.getByText('Fairness')).toBeVisible();
    await page.waitForTimeout(500);

    // Take screenshot of the whole page (showing the sidebar on the right/left)
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'analyst-panel.png') });
  });

});
