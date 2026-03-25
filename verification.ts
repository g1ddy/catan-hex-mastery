import { test, expect } from '@playwright/test';

test('coach panel renders and is interactable', async ({ page }) => {
  await page.goto('http://localhost:5173/catan-hex-mastery/');

  // Wait for board to load
  await page.waitForSelector('.catan-board', { state: 'attached' });

  // Look for the coach toggle using the icon
  const coachToggle = page.locator('button', { has: page.locator('svg.lucide-bot') });

  if (await coachToggle.isVisible()) {
     await coachToggle.click();
     await page.waitForTimeout(500); // Wait for animation
  }

  // Verify coach panel exists (either desktop or mobile)
  const coachPanel = page.locator('#coach-bot-panel, #coach-bot-panel-mobile');
  await expect(coachPanel.first()).toBeVisible();

  // Verify Resource Distribution section exists
  const resourceDistTitle = page.getByText('Resource Distribution', { exact: true });
  await expect(resourceDistTitle).toBeVisible();

  await page.screenshot({ path: 'verification.png' });
});
