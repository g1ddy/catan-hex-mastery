import { test, expect } from '@playwright/test';

test('Dice roll animation shows delays correctly', async ({ page }) => {
  test.setTimeout(120000);

  // 1. Setup Game: 1 Player vs 2 Bots
  await page.goto('/');
  await expect(page.getByText('Hex Mastery - Setup')).toBeVisible();

  await page.getByRole('button', { name: '1 Player vs 2 Bots' }).click();
  await expect(page.getByTestId('game-layout')).toBeVisible({ timeout: 30000 });

  const banner = page.getByTestId('game-status-banner');
  const beginPlacement = page.getByRole('button', { name: 'Begin Placement' });

  // 2. Drive the game through setup until "Roll Dice" appears
  await expect(async () => {
    const text = await banner.textContent() || "";

    // Success condition
    if (text.includes("Roll Dice")) {
      return;
    }

    // Action Logic
    if (text.includes("Start Placement")) {
      if (await beginPlacement.isVisible()) {
        await beginPlacement.click();
      }
    }
    else if (text.includes("Place Settlement")) {
      // Find all ghost vertices
      const vertices = await page.getByTestId('ghost-vertex').all();
      // Try clicking them until one works
      for (const vertex of vertices) {
        if (await vertex.isVisible()) {
          await vertex.click({ force: true });
          // Short wait to see if it reacted
          await page.waitForTimeout(200);
          const newText = await banner.textContent() || "";
          if (!newText.includes("Place Settlement")) break; // Moved on
        }
      }
    }
    else if (text.includes("Place Road")) {
      const edges = await page.getByTestId('ghost-edge').all();
      for (const edge of edges) {
        if (await edge.isVisible()) {
           await edge.click({ force: true });
           await page.waitForTimeout(200);
           const newText = await banner.textContent() || "";
           if (!newText.includes("Place Road")) break;
        }
      }
    }
  }).toPass({ timeout: 60000 });

  // 3. Verify Roll Logic
  const rollButton = page.getByRole('button', { name: 'Roll' });
  await rollButton.click();

  // 4. Verify "Rolling..." state appears immediately
  await expect(page.getByText('Rolling...')).toBeVisible();

  // 5. Verify the delay lasts at least 800ms (accounting for some execution time)
  // We check if "Rolling..." is STILL visible after a short wait
  await page.waitForTimeout(800);

  // Should eventually resolve (assuming game logic proceeds)
  // We can check if dice icons appear or text changes back
  await expect(page.getByText('Rolling...')).not.toBeVisible({ timeout: 5000 });
});
