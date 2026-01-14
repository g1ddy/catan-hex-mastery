import { test, expect } from '@playwright/test';

test('verify hex overlays rendering and setup flow', async ({ page }) => {
  // Go to the game page (using baseURL from config)
  await page.goto('./');

  // Check if we are on the setup page and click 3 Players (No Bots)
  const startButton = page.getByRole('button', { name: '3 Players (No Bots)' });
  if (await startButton.isVisible()) {
      await startButton.click();
  }

  // Wait for the board to render
  const layout = page.locator('[data-testid="game-layout"]');
  await expect(layout).toBeVisible({ timeout: 10000 });

  // Wait for board vertices to ensure SVG is fully loaded
  await page.waitForSelector('svg g circle', { state: 'visible' });

  // --- Verify Setup Phase Interactions ---

  // Click "Begin Placement" to enter placing mode
  const beginPlacementButton = page.getByRole('button', { name: 'Begin Placement' });
  await expect(beginPlacementButton).toBeVisible();
  await beginPlacementButton.click();

  // 1. Place Settlement
  // Find a ghost vertex (clickable).
  const ghostVertex = page.locator('[data-testid="ghost-vertex"]').first();
  await expect(ghostVertex).toBeVisible();
  await ghostVertex.click({ force: true });

  // 2. Verify Settlement Placed
  // Corrected selector: settlement-icon
  await expect(page.locator('svg [data-testid="settlement-icon"]')).toBeVisible();

  // 3. Place Road
  // After settlement, game advances to Place Road.
  // Find a ghost edge.
  const ghostEdge = page.locator('[data-testid="ghost-edge"]').first();
  await expect(ghostEdge).toBeVisible();
  await ghostEdge.click({ force: true });

  // 4. Verify Road Placed
  await expect(page.locator('svg [data-testid="occupied-edge"]')).toBeVisible();
});
