import { test, expect } from '@playwright/test';

test('Verify NumberToken SVG Structure', async ({ page }) => {
  await page.goto('/');

  // Enter game
  await page.click('button:has-text("2 Players")');

  // Begin placement to ensure stable state
  const beginBtn = page.locator('button:has-text("Begin Placement")');
  await expect(beginBtn).toBeVisible();
  await beginBtn.click();

  // Wait for board - using a generic SVG check inside the main content area
  await expect(page.locator('svg').first()).toBeVisible();

  // Find a token with value '6'
  // logic: find a <text> with "6", then get its parent <g> (which is the NumberToken)
  // We use xpath or locator filtering
  const tokenSixText = page.locator('text="6"').first();
  await expect(tokenSixText).toBeVisible();

  // In the SVG structure:
  // <g> (NumberToken)
  //   <circle> (Background)
  //   <text> (Number)
  //   <g> (Pips Group)
  //     <circle> (Pip) ...

  // So we need to go up from text.
  const tokenGroup = tokenSixText.locator('..');

  // Verify background circle
  const bgCircle = tokenGroup.locator('> circle').first();
  await expect(bgCircle).toHaveAttribute('fill', '#f3e5ab');

  // Verify Pips Group
  const pipsGroup = tokenGroup.locator('> g');
  await expect(pipsGroup).toBeVisible();

  // Verify pips count for 6 is 5
  const pips = pipsGroup.locator('circle');
  await expect(pips).toHaveCount(5);

  // Verify pip color for 6 is red
  // We need to fetch the fill attribute
  const fill = await pips.first().getAttribute('fill');
  // It might be #dc2626 or rgb(...) depending on browser, but in SVG DOM it usually keeps the attribute value.
  expect(fill).toBe('#dc2626');

  // Verify a non-red number, e.g., '4' (3 pips)
  const tokenFourText = page.locator('text="4"').first();
  const tokenFourGroup = tokenFourText.locator('..');
  const pipsFour = tokenFourGroup.locator('> g > circle');
  await expect(pipsFour).toHaveCount(3);
  // Color should be gray-900 (#111827)
  const fillFour = await pipsFour.first().getAttribute('fill');
  expect(fillFour).toBe('#111827');
});
