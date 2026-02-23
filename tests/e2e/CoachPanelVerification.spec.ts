import { test, expect } from '@playwright/test';

test('Verify Coach Panel Rendering', async ({ page }) => {
  // 1. Navigate to game
  await page.goto('/');

  // Hide Debug Panel to prevent obstruction
  await page.addStyleTag({ content: '.debug-panel { display: none !important; }' });

  // 2. Setup Game (3 Players No Bots)
  const noBotsButton = page.getByRole('button', { name: '3 Players (No Bots)' });

  // Retry logic similar to the Python script
  try {
    await noBotsButton.click({ timeout: 5000 });
  } catch (e) {
    await page.reload();
    await page.addStyleTag({ content: '.debug-panel { display: none !important; }' });
    await noBotsButton.click({ timeout: 5000 });
  }

  // Wait for game layout
  await page.waitForSelector("[data-testid='game-layout']", { timeout: 10000 });

  // 3. Enter Placement (to make sure game is active)
  await page.getByRole('button', { name: 'Begin Placement' }).click();

  // 4. Open Coach Panel
  const toggleBtn = page.getByLabel('Toggle Coach Bot');
  const panelText = page.getByText('Player Production Potential');

  // Logic to open panel if not visible
  if (!(await panelText.isVisible())) {
    await toggleBtn.click();
  }

  // Wait for panel content
  await expect(panelText).toBeVisible({ timeout: 5000 });
});
