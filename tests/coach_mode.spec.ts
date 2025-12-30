import { test, expect } from '@playwright/test';

test('Coach Mode Toggle and Visualization', async ({ page }) => {
  // 1. Navigate to the game (Setup Phase)
  await page.goto('http://localhost:4173/catan-hex-mastery/#/');
  await page.getByText('2 Players').click();

  // Wait for game to load
  await expect(page.getByText('5').first()).toBeVisible({ timeout: 10000 });

  // 2. Setup Phase: Click "Begin Placement" to enter placing mode
  await page.getByRole('button', { name: 'Begin Placement' }).click();

  // 3. Enable Coach Mode
  // Based on AnalystPanel.tsx:
  // <div ...>Coach Mode</span> <label ...><input type="checkbox" .../></label>
  // The label wraps the input, but the text "Coach Mode" is in a sibling span.
  // We can target the input inside a label that is a sibling of "Coach Mode" text,
  // OR just find the checkbox on the page (there's only one toggle).
  // But to be safe:
  const coachToggle = page.locator('input[type="checkbox"]').first();

  // Ensure it is checked (default is true in Board.tsx)
  await expect(coachToggle).toBeChecked();

  // 4. Verify Heatmap Elements
  const highlights = page.locator('.coach-highlight');

  // Wait for the first highlight to be visible.
  await expect(highlights.first()).toBeVisible();

  const count = await highlights.count();
  console.log(`Found ${count} coach highlights`);
  expect(count).toBeGreaterThan(10);

  // 5. Verify Top 3 Highlighting
  // Structure: <g class="coach-highlight"> <circle stroke="#FFD700" ... /> </g>
  const top3 = page.locator('.coach-highlight circle[stroke="#FFD700"]');
  const top3Count = await top3.count();
  console.log(`Found ${top3Count} top 3 highlights`);

  expect(top3Count).toBeGreaterThanOrEqual(1);
  expect(top3Count).toBeLessThanOrEqual(3);

  // 6. Test Toggle OFF
  // Playwright's `uncheck` works on inputs.
  // Since the input has `class="sr-only"`, Playwright might complain about actionability.
  // We should force click it or click the label.
  await coachToggle.evaluate(el => (el as HTMLInputElement).click());

  // Wait for render
  await page.waitForTimeout(500);

  const highlightsAfterOff = page.locator('.coach-highlight');
  expect(await highlightsAfterOff.count()).toBe(0);

  // 7. Test Toggle ON again
  await coachToggle.evaluate(el => (el as HTMLInputElement).click());
  await page.waitForTimeout(500);

  expect(await page.locator('.coach-highlight').count()).toBeGreaterThan(10);
});
