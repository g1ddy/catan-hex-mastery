import { type Page, type Locator, expect } from '@playwright/test';

export class GamePage {
  readonly page: Page;
  readonly setupButton: Locator;
  readonly gameLayoutDesktop: Locator;
  readonly gamePageMobile: Locator;
  readonly rollDiceButton: Locator;
  readonly ghostVertex: Locator;
  readonly ghostEdge: Locator;

  constructor(page: Page) {
    this.page = page;
    // Initial setup button (2 Players)
    this.setupButton = page.getByRole('button', { name: '2 Players' });

    // Layout verification locators
    this.gameLayoutDesktop = page.locator('.game-layout-desktop');
    this.gamePageMobile = page.locator('.game-page'); // From mobile_layout_test.py

    // Game controls
    this.rollDiceButton = page.getByRole('button', { name: 'Roll Dice' });

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
    // Wait for the game layout to load. We check for the one appropriate for the current view.
    // However, since both might exist in the DOM (just hidden/visible), we should wait for the one we expect to be visible.
    // The safest bet is to wait for one of them to be *visible* first.
    // To avoid strict mode violation (finding both), we can just wait for the first one that appears.
    await this.gameLayoutDesktop.or(this.gamePageMobile).first().waitFor({ state: 'visible', timeout: 30000 });
  }

  async placeSettlement() {
    // Click instruction to toggle mode (assuming text logic from python test)
    await this.page.getByText('Place a Settlement').click();

    // Wait for ghost vertices
    await this.ghostVertex.first().waitFor({ state: 'visible', timeout: 2000 });

    // Click the first available ghost vertex
    // Python test had a check for count > 0, Playwright auto-waits but we can be explicit
    const count = await this.ghostVertex.count();
    if (count > 0) {
        await this.ghostVertex.first().click();
    } else {
        throw new Error('No ghost vertices found for settlement placement');
    }
  }

  async placeRoad() {
    await this.page.getByText('Place a Road').click();

    await this.ghostEdge.first().waitFor({ state: 'visible', timeout: 2000 });

    const count = await this.ghostEdge.count();
    if (count > 0) {
        await this.ghostEdge.first().click();
    } else {
        throw new Error('No ghost edges found for road placement');
    }
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
