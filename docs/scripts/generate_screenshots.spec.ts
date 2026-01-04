import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// Define output directory (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// From docs/scripts/ to docs/images/ is ../images
const OUTPUT_DIR = path.join(__dirname, '../images');

test.describe('Documentation Screenshots', () => {

  test('generate hero-board-desktop.png', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Select 2 players (Enabled option)
    await page.getByRole('button', { name: 'Start game with 2 players' }).click();

    // Wait for board to load
    await expect(page.locator('[data-testid="game-layout"]')).toBeVisible();

    // Wait for the grid to be fully rendered before snapping
    await expect(page.locator('svg.grid')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'hero-board-desktop.png') });
  });

  test('generate coach-heatmap.png', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Start game with 2 players' }).click();

    // Open Analyst Panel
    await page.getByRole('button', { name: 'Toggle Analyst Dashboard' }).click();

    // Enable Coach Mode
    const coachToggle = page.getByRole('checkbox', { name: /coach mode/i });
    await coachToggle.check();

    // Wait for Heatmap to be visible (Gold rings indicate top moves)
    await expect(page.locator('[stroke="#FFD700"]').first()).toBeVisible();

    // Wait for opacity transition on non-optimal hexes (confirming heatmap logic applied)
    // We expect some elements to have opacity classes if Coach Mode is active
    await expect(page.locator('.opacity-40').first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'coach-heatmap.png') });
  });

  test('generate coach-tooltip.png', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Start game with 2 players' }).click();

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

    // Take screenshot
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'coach-tooltip.png') });
  });

  test('generate mobile-production.png', async ({ page }) => {
    // Mobile Viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Start game with 2 players' }).click();

    // Wait for layout
    await expect(page.locator('[data-testid="game-layout"]')).toBeVisible();

    // Open the Analyst/Stats Drawer
    await page.getByRole('button', { name: 'Toggle Analyst Dashboard' }).click();

    // Wait for drawer to slide up (check for visibility of content inside)
    await expect(page.getByText('Fairness')).toBeVisible();

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'mobile-production.png') });
  });

  test('generate analyst-panel.png', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Start game with 2 players' }).click();

    // Open Analyst Panel
    await page.getByRole('button', { name: 'Toggle Analyst Dashboard' }).click();

    // Wait for panel contents
    await expect(page.getByText('Fairness')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'analyst-panel.png') });
  });

  test('generate setup-draft.png', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Start game with 2 players' }).click();

    // Wait for load
    await expect(page.locator('[data-testid="game-layout"]')).toBeVisible();

    // Click "Begin Placement" directly (fail if not found)
    await page.getByRole('button', { name: 'Begin Placement' }).click();

    // Wait for the "Cancel Placement" button to confirm state change
    await expect(page.getByRole('button', { name: 'Cancel Placement' })).toBeVisible();

    // Also wait for ghost vertices
    await expect(page.locator('[data-testid="ghost-vertex"]').first()).toBeVisible();

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'setup-draft.png') });
  });

});
