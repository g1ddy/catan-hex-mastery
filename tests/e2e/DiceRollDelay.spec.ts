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

          // Wait for the banner to update, indicating the action was successful.
          try {
            await expect(banner).not.toHaveText(/Place Settlement/, { timeout: 250 });
            break; // Action was successful, exit the loop.
          } catch (e) {
            // This click didn't change the state, continue to the next vertex.
          }
        }
      }
    }
    else if (text.includes("Place Road")) {
      const edges = await page.getByTestId('ghost-edge').all();
      for (const edge of edges) {
        if (await edge.isVisible()) {
           await edge.click({ force: true });

           // Wait for the banner to update, indicating the action was successful.
           try {
             await expect(banner).not.toHaveText(/Place Road/, { timeout: 250 });
             break; // Action was successful, exit the loop.
           } catch (e) {
             // This click didn't change the state, continue to the next edge.
           }
        }
      }
    }
  }).toPass({ timeout: 60000 });

  // 3. Verify Roll Logic
  const rollButton = page.getByRole('button', { name: 'Roll' });
  await rollButton.click();

  // 4. Verify "Rolling..." state appears immediately
  await expect(page.getByText('Rolling...')).toBeVisible();

  // 5. Verify the delay lasts at least 800ms
  // We check if "Rolling..." is STILL visible after a short wait
  await page.waitForTimeout(800);

  // Assert that the animation is still running
  await expect(page.getByText('Rolling...')).toBeVisible();

  // Should eventually resolve (assuming game logic proceeds)
  // We can check if dice icons appear or text changes back
  await expect(page.getByText('Rolling...')).not.toBeVisible({ timeout: 5000 });
});
