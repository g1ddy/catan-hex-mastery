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

  const coachToggle = page.locator('input[type="checkbox"]').first();

  if (await openStatsBtn.isVisible()) {
    await openStatsBtn.click();
    // Wait for the toggle to appear in the DOM/become visible
    await expect(coachToggle).toBeVisible();
  }

  // Now find the toggle. It's an input inside the dashboard.
  await expect(coachToggle).not.toBeChecked();

  // 4. Verify Heatmap Classes
  const highlights = page.locator('.coach-highlight');
  await expect(highlights.first()).toBeAttached();
  const totalCount = await highlights.count();
  console.log(`Found ${totalCount} total coach highlights`);
  expect(totalCount).toBeGreaterThan(10);

  // Helper function to count classes (Corrected to use page-level locators)
  const countClasses = async () => {
    // We target elements that have BOTH classes
    const op100 = await page.locator('.coach-highlight.opacity-100').count();
    const op0 = await page.locator('.coach-highlight.opacity-0').count();
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
  await coachToggle.click({ force: true });

  // Use built-in assertions to wait for state change
  await expect(page.locator('.coach-highlight.opacity-0')).toHaveCount(0);
  await expect(page.locator('.coach-highlight.opacity-100')).toHaveCount(totalCount);


  // 6. Test Toggle OFF again
  await coachToggle.click({ force: true });

  // Wait for state to revert
  await expect(page.locator('.coach-highlight.opacity-0')).not.toHaveCount(0);

  // Verify precise counts eventually match default expectations
  await expect(async () => {
    const op0 = await page.locator('.coach-highlight.opacity-0').count();
    const op100 = await page.locator('.coach-highlight.opacity-100').count();

    expect(op100).toBeGreaterThanOrEqual(1);
    expect(op100).toBeLessThanOrEqual(5);
    expect(op0).toBeGreaterThan(5);
    expect(op100 + op0).toBe(totalCount);
  }).toPass();
});
