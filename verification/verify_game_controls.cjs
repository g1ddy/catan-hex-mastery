const { chromium } = require('playwright');
const path = require('path');

(async () => {
    // 1. Launch Browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        // Important: Set base URL if needed, but we'll use absolute
    });
    const page = await context.newPage();

    // 2. Navigate to the app (assuming preview server is still running on 4173)
    const url = 'http://localhost:4173/catan-hex-mastery/';
    console.log('Navigating to:', url);
    await page.goto(url);

    // 3. Setup Game
    // Click 2 Players
    await page.getByRole('button', { name: '2 Players' }).click();

    // Wait for Game Page
    await page.getByRole('button', { name: 'Begin Placement' }).waitFor({ state: 'visible', timeout: 5000 });

    // Click Begin Placement
    await page.getByRole('button', { name: 'Begin Placement' }).click();

    // Now we are in Setup Phase. We need to complete setup to reach rolling stage?
    // Wait, the requirement is about Rolling vs Acting stage UI.
    // To verify this, we need to be in Gameplay phase.
    // The quickest way is probably to simulate setup completion or look at existing logic.
    // However, completing setup in UI takes many clicks.

    // Alternative: We can verify the "Begin Placement" button styling first.
    await page.screenshot({ path: 'verification/setup_placement.png' });
    console.log('Setup screenshot taken');

    // To verify Gameplay UI (Roll button etc), we need to finish setup.
    // Let's do a quick random placement loop.
    // 2 players: Snake draft. P1: Sett+Road, P2: Sett+Road, P2: Sett+Road, P1: Sett+Road.

    // We need to place on the board.
    // We can click random "Ghost Vertex".

    // Function to place settlement and road
    async function placeTurn(p) {
        console.log(`Placing for player ${p}...`);
        // Click a ghost vertex
        const vertex = page.getByTestId('ghost-vertex').first();
        if (await vertex.count() > 0) {
            await vertex.click({ force: true });
        } else {
            console.log("No ghost vertex found!");
        }
        await page.waitForTimeout(500); // Wait for road ghosts

        // Click a ghost edge
        const edge = page.getByTestId('ghost-edge').first();
        if (await edge.count() > 0) {
            await edge.click({ force: true });
        } else {
             console.log("No ghost edge found!");
        }
        await page.waitForTimeout(500); // Wait for turn change
    }

    // P1 Turn 1
    await placeTurn(1);
    // P2 Turn 1
    await placeTurn(2);
    // P2 Turn 2
    await placeTurn(2);
    // P1 Turn 2
    await placeTurn(1);

    // Now we should be in Gameplay Phase. P1 turn.
    // Check for "Roll" button.
    console.log('Waiting for Roll button...');
    try {
        await page.getByRole('button', { name: 'Roll', exact: true }).waitFor({ timeout: 5000 });
        await page.screenshot({ path: 'verification/rolling_stage.png' });
        console.log('Rolling stage screenshot taken');
    } catch (e) {
        console.log('Roll button not found', e);
        await page.screenshot({ path: 'verification/failed_state.png' });
    }

    // Click Roll
    const rollBtn = page.getByRole('button', { name: 'Roll', exact: true });
    if (await rollBtn.isVisible()) {
        await rollBtn.click();

        // Now should be Acting stage.
        // Check for Last Roll indicator (text with number)
        // And Build buttons (disabled if poor, enabled if rich)
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'verification/acting_stage.png' });
        console.log('Acting stage screenshot taken');
    }

    await browser.close();
})();
