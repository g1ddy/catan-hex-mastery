import { test, expect } from '@playwright/test';

test('Verify NumberToken SVG Structure', async ({ page }) => {
  await page.goto('/');

  // Enter game
  await page.getByRole('button', { name: 'Start game with 2 players' }).click();

  // Begin placement to ensure stable state
  const beginBtn = page.locator('button:has-text("Begin Placement")');
  await expect(beginBtn).toBeVisible();
  await beginBtn.click();

  // Wait for board - using a generic SVG check inside the main content area
  await expect(page.locator('svg.grid').first()).toBeVisible();

  const verifyToken = async (value: number, pipsCount: number, color: string) => {
    // Find the text element with the value
    const tokenText = page.locator(`text="${value}"`).first();
    await expect(tokenText).toBeVisible();

    // Select the parent group (NumberToken) using XPath parent selector
    const tokenGroup = tokenText.locator('..');

    // Verify background circle
    const bgCircle = tokenGroup.locator('> circle').first();
    await expect(bgCircle).toHaveAttribute('fill', '#f3e5ab');

    // Verify Pips Group
    const pipsGroup = tokenGroup.locator('> g');
    await expect(pipsGroup).toBeVisible();

    // Verify pips count
    const pips = pipsGroup.locator('circle');
    await expect(pips).toHaveCount(pipsCount);

    // Verify pip color
    const fill = await pips.first().getAttribute('fill');
    expect(fill).toBe(color);
  };

  // Verify a red number token (6 has 5 pips)
  await verifyToken(6, 5, '#dc2626');

  // Verify a non-red number token (4 has 3 pips)
  await verifyToken(4, 3, '#111827');
});
