import { test, expect } from '@playwright/test';

test('coach panel renders and is interactable', async ({ page }) => {
  await page.goto('http://localhost:5173/catan-hex-mastery/');

  // Need to start a game first to see the coach panel
  const onePlayerBtn = page.getByRole('button', { name: '1 Player (Debug)' });
  await onePlayerBtn.waitFor({ state: 'visible' });
  await onePlayerBtn.click();

  // Fast forward to gameplay phase
  const endPhaseBtn = page.getByRole('button', { name: 'endPhase' }).first();
  await endPhaseBtn.waitFor({ state: 'visible' });
  await endPhaseBtn.click();

  // Need to open Coach panel on desktop
  const coachPanel = page.locator('#coach-bot-panel');
  // Usually the Coach panel starts closed
  if (!await coachPanel.isVisible()) {
     // Find the toggle by text
     const toggleBtn = page.getByRole('button', { name: 'Toggle Coach Bot' });
     if (await toggleBtn.isVisible()) {
        await toggleBtn.click();
     } else {
        // Try clicking the toggle button with aria-label Toggle Coach Panel
        const sideToggle = page.locator('[aria-label="Toggle Coach Panel"]');
        if (await sideToggle.isVisible()) {
            await sideToggle.click();
        }
     }
  }

  await expect(coachPanel).toBeVisible();

  // Verify Resource Distribution section exists
  const resourceDistTitle = page.getByText('Resource Distribution', { exact: true });
  await expect(resourceDistTitle).toBeVisible();
});
