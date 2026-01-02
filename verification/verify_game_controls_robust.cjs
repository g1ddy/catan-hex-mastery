const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    const url = 'http://localhost:4173/catan-hex-mastery/';
    await page.goto(url);
    await page.getByRole('button', { name: '2 Players' }).click();
    await page.getByRole('button', { name: 'Begin Placement' }).waitFor();
    await page.getByRole('button', { name: 'Begin Placement' }).click();

    // Loop to finish setup
    // We need 4 turns of setup (2 players * 2 rounds)
    for (let i = 0; i < 4; i++) {
        // Wait for ghost vertices to appear
        console.log(`Turn ${i + 1}: Waiting for ghost vertex...`);

        // Sometimes animations delay availability
        await page.waitForTimeout(1000);

        // Click centrally to avoid edge cases
        const ghostVertices = page.getByTestId('ghost-vertex');
        // We will force click the 10th one to avoid clicking the same spot if overlay issues
        const count = await ghostVertices.count();
        if (count > 0) {
             const index = Math.min(10, count - 1);
             await ghostVertices.nth(index).click({ force: true });
        } else {
             console.log("No ghost vertices found!");
             await page.screenshot({ path: 'verification/debug_no_ghosts_' + i + '.png' });
             throw new Error("No ghost vertices found");
        }

        // Wait for ghost edges
        console.log(`Turn ${i + 1}: Waiting for ghost edge...`);
        await page.waitForTimeout(1000);

        const ghostEdges = page.getByTestId('ghost-edge');
        const edgeCount = await ghostEdges.count();
        if (edgeCount > 0) {
             // Click first valid one
             await ghostEdges.first().click({ force: true });
        } else {
             console.log("No ghost edges found!");
             await page.screenshot({ path: 'verification/debug_no_edges_' + i + '.png' });
             throw new Error("No ghost edges found");
        }

        // Short wait to allow turn transition
        await page.waitForTimeout(500);
    }

    // Now in Rolling Stage
    console.log('Setup complete. Checking Rolling Stage UI...');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'verification/rolling_stage.png' });

    // Verify "Roll" button exists (exact text)
    const rollBtn = page.getByRole('button', { name: 'Roll', exact: true });
    if (await rollBtn.isVisible()) {
        console.log('SUCCESS: Roll button visible');
    } else {
        console.log('FAILURE: Roll button NOT visible');
    }

    // Verify Build Buttons are visible but disabled (or enabled? logic says disabled if poor)
    // Actually, in rolling stage, buttons should be visible but disabled?
    // My logic: disabled={!isActingStage || !affordable}
    // So in rolling stage, isActingStage is false -> Disabled.

    // Check Road button
    const roadBtn = page.getByRole('button', { name: /Road/i });
    if (await roadBtn.isVisible()) {
        console.log('SUCCESS: Road button visible');
        if (await roadBtn.isDisabled()) {
             console.log('SUCCESS: Road button is disabled in Rolling Stage');
        } else {
             console.log('FAILURE: Road button is ENABLED in Rolling Stage');
        }
    }

    // Click Roll
    console.log('Clicking Roll...');
    await rollBtn.click();
    await page.waitForTimeout(2000); // Wait for animation

    // Now in Acting Stage
    console.log('Checking Acting Stage UI...');
    await page.screenshot({ path: 'verification/acting_stage.png' });

    // Verify Last Roll is visible
    // It's a div with text, not a button.
    // We can look for the number.
    // Since we can't predict the number easily without reading it, we can verify the Roll button is GONE.
    if (!await rollBtn.isVisible()) {
        console.log('SUCCESS: Roll button hidden in Acting Stage');
    } else {
         console.log('FAILURE: Roll button still visible in Acting Stage');
    }

    // Verify End Turn button is enabled
    const endBtn = page.getByRole('button', { name: /End Turn/i });
    if (await endBtn.isEnabled()) {
        console.log('SUCCESS: End Turn button enabled in Acting Stage');
    } else {
        console.log('FAILURE: End Turn button disabled in Acting Stage');
    }

    await browser.close();
})();
