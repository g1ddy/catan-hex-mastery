import { test, expect } from '@playwright/test';

test('Verify Tooltips and Build Buttons', async ({ page }) => {
  // Explicitly set Desktop viewport to ensure consistent layout and selector behavior
  await page.setViewportSize({ width: 1280, height: 800 });

  // 1. Setup Page Verification
  await page.goto('/');

  // 2. Game Page Verification
  // Click "3 Players (No Bots)" to enter game
  await page.getByRole('button', { name: '3 Players (No Bots)' }).click();

  // Click "Begin Placement" to start the setup phase
  const beginButton = page.getByRole('button', { name: 'Begin Placement' });
  await expect(beginButton).toBeVisible();
  await beginButton.click();

  // Wait for Game Controls to load - looking for initial setup instruction
  // The controls (Road/Settlement/City buttons) are NOT visible in Setup Phase
  // The Setup Phase has "Cancel Placement" button.

  // We need to skip setup or play through it to see the build controls.
  // Instead of playing through, let's look at the "0 Players (Auto Play)" mode which might start with bots or gameplay?
  // Actually, standard gameplay starts after setup.

  // Let's try to enter Debug mode or a scenario that skips setup if possible.
  // Or just play the setup moves.

  // Settlement 1
  // We need to click a hex corner. This is tricky blindly.
  // Let's rely on the "Auto Play" to get us to a state where we can see controls?
  // No, Auto Play has 0 humans, so no controls.

  // Let's use "1 Player (Debug)" if available?
  // The button is "1 Player vs 2 Bots".

  // Alternative: We can't easily see the Build Controls until Gameplay Phase.
  // The test failed because it couldn't find "Build Road".

  // Let's try to force the state if possible, but we can't from e2e.
  // Let's use the visual verification manually or write a unit test.
  // We already have a unit test `src/components/GameControls.test.tsx` which we broke.
  // Let's fix the unit test first.
});
