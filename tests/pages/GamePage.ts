import { type Page, type Locator } from '@playwright/test';

export class GamePage {
  readonly page: Page;
  readonly setupButton: Locator;
  readonly gameLayout: Locator;
  readonly rollDiceButton: Locator;
  readonly ghostVertex: Locator;
  readonly ghostEdge: Locator;

  constructor(page: Page) {
    this.page = page;
    // Initial setup button (2 Players)
    this.setupButton = page.getByRole('button', { name: '2 Players' });

    // Layout verification locators
    this.gameLayout = page.getByTestId('game-layout');

    // Game controls
    // Updated to 'Roll' to match new UI
    this.rollDiceButton = page.getByRole('button', { name: 'Roll', exact: true });

    // Ghost elements for board interaction (Exception allowed for CSS selectors on SVG visual elements)
    this.ghostVertex = page.getByTestId('ghost-vertex');
    // Using robust data-testid instead of brittle CSS/attributes
    this.ghostEdge = page.getByTestId('ghost-edge');
  }

  async goto() {
    await this.page.goto('/');
  }

  async selectTwoPlayers() {
    await this.setupButton.click();
    // Wait for the game layout to load.
    await this.gameLayout.waitFor({ state: 'visible', timeout: 30000 });
  }

  async placeSettlement() {
    // Click "Begin Placement" to toggle mode
    // We use getByRole for better accessibility testing, or text if specific role is ambiguous
    await this.page.getByRole('button', { name: 'Begin Placement' }).click();

    // Wait for ghost vertices
    // Wait for ghost vertices and click the first one.
    // Use force: true because the Coach Mode heatmap overlay (r=4) might cover the hit target (r=3),
    // but the click event bubbles to the parent group anyway.
    await this.ghostVertex.first().click({ timeout: 5000, force: true });
  }

  async placeRoad() {
    // Road placement follows Settlement immediately in the new flow.
    // We do NOT click "Begin Placement" again because uiMode is already 'placing'.

    // Just wait for the ghost edge to appear and click it.
    await this.ghostEdge.first().click({ timeout: 5000, force: true });
  }

  async getRollButtonBoundingBox() {
    await this.rollDiceButton.waitFor({ state: 'visible', timeout: 10000 });
    return await this.rollDiceButton.boundingBox();
  }

  async getBoardSvgInfo() {
    // Helper specifically for the mobile test SVG verification
    return await this.page.evaluate(() => {
        const svg = document.querySelector('svg.grid');
        if (!svg) return null;

        const style = window.getComputedStyle(svg);
        const rect = svg.getBoundingClientRect();

        return {
            width: rect.width,
            height: rect.height,
            computedDisplay: style.display,
            computedPosition: style.position,
            computedHeight: style.height,
            className: svg.getAttribute('class')
        };
    });
  }
}
