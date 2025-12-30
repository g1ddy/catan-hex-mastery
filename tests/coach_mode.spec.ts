import { test, expect } from '@playwright/test';

test('Coach Mode Toggle and Visualization', async ({ page }) => {
  // 1. Navigate to the game (Setup Phase)
  await page.goto('http://localhost:4173/catan-hex-mastery/#/');
  await page.getByText('2 Players').click();

  // Wait for game to load
  await expect(page.getByText('5').first()).toBeVisible({ timeout: 10000 });

  // 2. Setup Phase: Click "Begin Placement" to enter placing mode
  await page.getByRole('button', { name: 'Begin Placement' }).click();

  // 3. Verify Default State (Coach Mode OFF / Minimal View)
  // On Mobile, the Analyst Panel (dashboard) is hidden in a bottom sheet.
  // We need to open it to access the toggle.
  const openStatsBtn = page.getByLabel('Open Stats');
  if (await openStatsBtn.isVisible()) {
    await openStatsBtn.click();
    // Wait for animation/render
    await page.waitForTimeout(500);
  }

  // Now find the toggle. It's an input inside the dashboard.
  const coachToggle = page.locator('input[type="checkbox"]').first();
  await expect(coachToggle).not.toBeChecked();

  // 4. Verify Heatmap Classes
  const highlights = page.locator('.coach-highlight');
  await expect(highlights.first()).toBeAttached();
  const totalCount = await highlights.count();
  console.log(`Found ${totalCount} total coach highlights`);
  expect(totalCount).toBeGreaterThan(10);

  // Helper function to count classes
  const countClasses = async () => {
    let op100 = 0;
    let op0 = 0;
    for (let i = 0; i < totalCount; i++) {
      const el = highlights.nth(i);
      const classString = await el.getAttribute('class');
      const classList = classString ? classString.split(' ') : [];
      if (classList.includes('opacity-100')) op100++;
      if (classList.includes('opacity-0')) op0++;
    }
    return { op100, op0 };
  };

  let counts = await countClasses();
  console.log(`Default State - Opacity 100: ${counts.op100}, Opacity 0: ${counts.op0}`);

  // Default assertions
  expect(counts.op100).toBeGreaterThanOrEqual(1);
  expect(counts.op100).toBeLessThanOrEqual(5);
  expect(counts.op0).toBeGreaterThan(5);
  expect(counts.op0 + counts.op100).toBe(totalCount);

  // 5. Test Toggle ON (Full Mode)
  // Note: Toggle is inside the dashboard, which we ensured is open if needed.
  await coachToggle.evaluate(el => (el as HTMLInputElement).click());

  // Use built-in assertions to wait for state change
  await expect(page.locator('.coach-highlight.opacity-0')).toHaveCount(0);
  await expect(page.locator('.coach-highlight.opacity-100')).toHaveCount(totalCount);


  // 6. Test Toggle OFF again
  await coachToggle.evaluate(el => (el as HTMLInputElement).click());

  // Wait for state to revert
  await expect(page.locator('.coach-highlight.opacity-0')).not.toHaveCount(0);

  // Verify precise counts eventually match default expectations
  await expect(async () => {
    const hiddenCount = await page.locator('.coach-highlight.opacity-0').count();
    const visibleCount = await page.locator('.coach-highlight.opacity-100').count();

    expect(visibleCount).toBeGreaterThanOrEqual(1);
    expect(visibleCount).toBeLessThanOrEqual(5);
    expect(hiddenCount).toBeGreaterThan(5);
    expect(visibleCount + hiddenCount).toBe(totalCount);
  }).toPass();
});
