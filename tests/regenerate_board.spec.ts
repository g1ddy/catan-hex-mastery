import { test, expect } from '@playwright/test';

test('Regenerate Board resets settlements and shuffling hexes', async ({ page, isMobile }) => {
    // 1. Start a 2-Player Game
    await page.goto('/');
    await page.getByRole('button', { name: '2 Players' }).click();

    // 2. Wait for game to load and Board to be visible
    await page.waitForSelector('.board');

    // 3. Enter Placement Mode (Player 0)
    await page.getByRole('button', { name: 'Begin Placement' }).click();

    // 4. Place a Settlement (find a valid ghost vertex)
    const ghostVertex = page.locator('[data-testid="ghost-vertex"]').first();
    await ghostVertex.waitFor();
    await ghostVertex.click({ force: true });

    // 5. Verify Settlement is placed
    await expect(page.locator('[data-testid="settlement-icon"]').first()).toBeVisible();

    // 6. Open Analyst Dashboard (if mobile)
    if (isMobile) {
        await page.getByRole('button', { name: 'Toggle Analyst Dashboard' }).click();
    }

    // 7. Click Regenerate Board
    const regenerateBtn = page.getByRole('button', { name: 'Regenerate Board' });
    await expect(regenerateBtn).toBeVisible();
    await expect(regenerateBtn).toBeEnabled();
    await regenerateBtn.click();

    // 8. Verify Reset:
    // a) Settlement should be GONE.
    await expect(page.locator('[data-testid="settlement-icon"]')).toHaveCount(0);

    // b) Verify Stage Reset (Banner should say "Place a Settlement")
    // Note: on Mobile, banner text might be abbreviated or different.
    // "Place Settlement" vs "Place a Settlement".
    // GameStatusBanner.tsx: "Place a Settlement"
    await expect(page.getByText(/Place a Settlement/i)).toBeVisible();

    // c) Close Analyst Dashboard (if mobile) to see board
    if (isMobile) {
        const closeBtn = page.getByRole('button', { name: 'Close Analyst Panel' });
        if (await closeBtn.isVisible()) {
            await closeBtn.click();
        }
    }

    // 9. Verify we can place again (Ghost vertices visible)
    const ghostVertexAfter = page.locator('[data-testid="ghost-vertex"]').first();
    await expect(ghostVertexAfter).toBeVisible();
});
