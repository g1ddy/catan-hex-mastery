import { test, expect } from '@playwright/test';

test('verify setup phase road placement logic', async ({ page }) => {
  // 1. Navigate to the game (Setup Phase)
  await page.goto('/');
  await page.getByRole('button', { name: '2 Players' }).click();

  // Wait for board to load
  await expect(page.getByTestId('game-layout')).toBeVisible();

  // 2. Setup Phase: Click "Begin Placement" to enter placing mode
  await page.getByRole('button', { name: 'Begin Placement' }).click();

  // 3. Find and click a valid vertex for a settlement
  // Valid moves are rendered as "ghost vertices"
  const validVertex = page.getByTestId('ghost-vertex').first();
  await expect(validVertex).toBeVisible();

  // Click the vertex
  await validVertex.click({ force: true });

  // 4. Assert that the settlement appears on the board
  // Settlements use the BuildingIcon component which has data-testid="settlement-icon"
  await expect(page.getByTestId('settlement-icon')).toHaveCount(1);

  // After placing a settlement, the game should prompt for a road.
  // We can verify this by checking that valid road ghosts are now visible.
  await expect(page.getByTestId('ghost-edge').first()).toBeVisible();

  // 5. Test a negative case: Click an invalid edge
  // We'll try to click an area that definitely doesn't have a ghost edge.
  // Since we can't easily "click an invalid edge" (as they aren't interactive),
  // we can assert that clicking the background or a non-ghost area doesn't add a road.
  // A better negative test in this context is to ensure NO road exists yet.
  await expect(page.getByTestId('occupied-edge')).toHaveCount(0);

  // 6. Find and click a valid edge connected to the new settlement
  const validEdge = page.getByTestId('ghost-edge').first();
  await validEdge.click({ force: true });

  // 7. Assert that the road is placed
  await expect(page.getByTestId('occupied-edge')).toHaveCount(1);
});
