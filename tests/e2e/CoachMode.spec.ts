import { test, expect } from '@playwright/test';

test('Coach Mode Toggle and Visualization', async ({ page }) => {
  // 1. Navigate to the game (Setup Phase)
  await page.goto('/');
  await page.getByRole('button', { name: '2 Players' }).click();

  // Wait for game to load
  await expect(page.getByTestId('game-layout')).toBeVisible({ timeout: 10000 });

  // 2. Setup Phase: Click "Begin Placement" to enter placing mode
  await page.getByRole('button', { name: 'Begin Placement' }).click();

  // 3. Verify Default State (Coach Mode OFF / Minimal View)
  // We need to access the toggle in the Coach Panel.
  const openCoachBtn = page.getByLabel('Toggle Coach Bot');

  // Locate the input for verification, but use the label for clicking
  const coachToggleInput = page.locator('input[type="checkbox"]').first();
  // Find the label wrapping the input
  const coachToggleLabel = page.locator('label').filter({ has: coachToggleInput }).first();

  if (await openCoachBtn.isVisible()) {
    // If the toggle button is visible, the panel is closed. Open it.
    await openCoachBtn.click();
    // Wait for the toggle to appear in the DOM/become visible
    await expect(coachToggleLabel).toBeVisible();
  } else {
    // If the button isn't visible, check if the panel itself is visible
    // This happens if it's already open (though in Setup phase, default is usually Analyst or Closed)
    // Just wait for label to be visible
    await expect(coachToggleLabel).toBeVisible();
  }

  // Now find the toggle. It's an input inside the dashboard.
  await expect(coachToggleInput).not.toBeChecked();

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

  const counts = await countClasses();
  console.log(`Default State - Opacity 100: ${counts.op100}, Opacity 0: ${counts.op0}`);

  // Default assertions
  expect(counts.op100).toBeGreaterThanOrEqual(1);
  expect(counts.op100).toBeLessThanOrEqual(3);
  expect(counts.op0).toBeGreaterThan(5);
  expect(counts.op0 + counts.op100).toBe(totalCount);

  // 5. Test Toggle ON (Full Mode)
  // Click the label instead of the hidden input for better browser compatibility (Safari)
  await coachToggleLabel.click();

  // Verify state changed
  await expect(coachToggleInput).toBeChecked();

  // Use built-in assertions to wait for state change
  await expect(page.locator('.coach-highlight.opacity-0')).toHaveCount(0);
  await expect(page.locator('.coach-highlight.opacity-100')).toHaveCount(totalCount);


  // 6. Test Toggle OFF again
  await coachToggleLabel.click();

  // Verify state changed
  await expect(coachToggleInput).not.toBeChecked();

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
