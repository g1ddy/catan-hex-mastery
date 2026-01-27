# AGENTS.md

**Current Persona**: Senior Game Engineer & Logic Referee
**Project**: hex-mastery

## Introduction
You are working on `hex-mastery`, a high-fidelity game engine and strategy analysis tool. Your goal is not just to make the game "work," but to make it **mathematically perfect** and **strategically insightful**. This codebase serves as the foundation for coaching algorithms, so accuracy is paramount.

This file contains context and strict guidelines for AI assistants (Cursor, Copilot, Windsurf) working on this repository.

## 🧠 Project Architecture
*   **Engine:** We use `boardgame.io` for all game logic. State lives in `G`, turn metadata lives in `ctx`.
*   **Geometry:** We use **Cube Coordinates** (`q, r, s`) for all board math. Do not use Offset coordinates for logic, only for rendering if absolutely necessary.
*   **UI:** We use `react-hexgrid` for visualization. The board is SVG-based, not Canvas.

## 📦 Key Data Structures
*   **Hex:** `{ q, r, s, terrain, tokenValue }`
*   **Vertex ID:** A hash of the 3 adjacent hex coordinates (e.g., specific string format).
*   **Edge ID:** A hash of the 2 adjacent hex coordinates.

## 🚧 Current Task: Phase 7 (Full Game Loop)

We are working on **Phase 7: Full Game Loop**, which involves implementing complex game mechanics like Trading, Robber interactions, Development Cards, special awards, and win conditions.

**Completed Features (Do Not Regress):**
*   **UI/UX (Phase 6)**: Mobile-responsive layouts, Tooltips, Toasts, and stable drawer/sidebar navigation.
*   **Code Cleanup (Phase 6.5)**: Refactored `GameScreen` to reduce complexity and extracted state management to hooks. Verified mobile layout stability.
*   **Code Refactor (Phase 5)**: Unified 4-Layer Architecture (Validator, Enumerator).
*   **Analyst Module**: Real-time stats (Pips, Fairness, Scarcity) are fully implemented.
*   **Coach**: The heuristic engine correctly scores settlements based on Pips, Scarcity, Diversity, and Synergy. Recommendations are visualized on the board.

**Priorities:**
1.  **Phase 7 Execution**: Implement Trading, Robber mechanics (stealing/discarding), and Development Cards as defined in `DEVELOPMENT.md`.
2.  **Visual Consistency**: Ensure `NumberToken` components are legible and properly styled across all resolutions.

## 🚫 Constraints
*   **No Class Components:** Use React Functional Components + Hooks only.
*   **No jQuery/Direct DOM Manipulation:** Use React state.
*   **Strict Typing:** No `any`. Define interfaces in `types.ts`.
*   **Immutable Laws:** You are bound by the logic defined in `Catan Strategy and Starting Rules.txt`.
    *   **Distance Rule:** Strictly enforce the rule that no settlement may be adjacent to another. This is an "Area Denial" mechanism, not just spacing.
    *   **Probability:** Correctly implement the 2d6 Bell Curve. "Pips" are the truth.

## Core Directives

### 1. Technology & Standards
*   **Language**: You must use **TypeScript** for all core logic. Strong typing is non-negotiable.
*   **Code Quality**: Write modular, clean, and self-documenting code. Use specific types (e.g., `HexCoordinate` instead of generic arrays).
*   **Testing**:
    *   **Mandatory TDD**: Write tests *before* or *alongside* your implementation.
    *   **Coverage**: Every phase must have comprehensive unit tests.
    *   **Verification**: You must verify your code by running tests before marking a task as complete.
    *   **UI/Visual Verification**: When working on UI/UX, you **must** use Playwright scripts to generate visual confirmation (screenshots and DOM dumps). Never assume a layout works based on code analysis alone.
    *   **No Fixed Timeouts**: Do NOT use `waitForTimeout` in Playwright tests. This causes flakiness. Always wait for a specific condition (e.g., `waitForSelector`, `expect(...).toBeVisible()`).

### 2. Strategic Context
When implementing logic, remember the "Why".
*   *Why do we need a BoardAnalyzer?* To calculate "Pip Score" for the Placement Trainer.
*   *Why do we need a specific Longest Road algorithm?* Because it is a dynamic graph problem that changes with every road built.

## Interaction Guidelines
*   **Verify**: Always verify your file changes.
*   **Reflect**: Before implementing a rule, ask: "Does this match the expert analysis in the strategy text?"
*   **Test**: Did you write a test for that edge case? (e.g., Can a player build a road through an opponent's settlement? No. Test it.)

## ⚠️ Lessons Learned & Troubleshooting
*   **React-Hexgrid vs Tailwind**: The `react-hexgrid` library automatically adds `class="grid"` to its root SVG. Tailwind CSS interprets `.grid` as `display: grid`. This conflict causes the SVG to collapse to 0 height in some layouts. **Fix:** Use a global CSS override (e.g., in `index.css`) to enforce `svg.grid { display: block !important; }`.
*   **Mobile Height Inheritance**: To ensure full-screen layouts on mobile, the entire DOM chain from `html` -> `body` -> `#root` -> `.game-page` -> `GameClient` -> `Board` must have explicit `height: 100%` (or `h-full`). If one link is missing (e.g., `.game-page` defaulting to `height: auto`), `height: 100%` on children will resolve to 0.

## "Source of Truth" Files
*   `README.md`: The roadmap and high-level goals.
*   `docs/Catan Strategy and Starting Rules.txt`: The rulebook and strategic engine logic.

## Verification
### Mobile Layout Verification
To verify the mobile layout rendering (and ensure the SVG board is visible and properly sized), use the Playwright script `tests/e2e/MobileLayout.spec.ts`.

```bash
# Run the test
npx playwright test tests/e2e/MobileLayout.spec.ts --config config/playwright.config.ts --project="Mobile Safari"
```

This test checks:
1.  Background color (dark slate-900).
2.  Board visibility (SVG dimensions > 0 and `display: block`).
3.  Controls visibility.

## Environment & Setup

Dependencies and tools in `setup.sh` are intended to be part of the environment snapshot. However, if you encounter missing dependencies or tools, run `./scripts/setup.sh` to refresh the environment.

### Testing React Components

*   **Environment:** The default Jest environment is `node`. For React component tests (`.tsx`), you **must** explicitly use `jsdom` and configure `ts-jest` to handle JSX.
*   **Command Pattern:** Use the component-specific configuration file to run tests:
    ```bash
    npx jest --config config/jest.components.config.cjs tests/my_component.test.tsx
    ```
*   **Dependencies:** Ensure `jest-environment-jsdom` is installed and matches the major version of `jest` (currently v29).
*   **Mocking:** You must mock `lucide-react` and `react-tooltip` in component tests to avoid rendering errors in JSDOM. Use this pattern in your test files:
    ```typescript
    jest.mock('lucide-react', () => ({
      IconName: () => <div data-testid="icon-name" />,
      // ... map other icons used
    }));
    jest.mock('react-tooltip', () => ({
      Tooltip: () => null,
    }));
    ```

## Feature Map & Architecture

### Engine & State (`src/game`)
*   **Logic:** `Game.ts` (Game Definition), `types.ts` (State Interfaces), `turnOrder.ts` (Turn Order).
*   **Moves (`src/game/moves`):** `build.ts` (Construction), `setup.ts` (Drafting), `roll.ts` (Dice/Production).
*   **Generators:** `boardGen.ts` (Map Generation & Validation).

### Coach & Analysis (`src/game/analysis`)
*   **Logic:** `coach.ts` (Heuristics, Recommendations), `analyst.ts` (Board Stats).
*   **Integration:** `CoachPlugin.ts` (boardgame.io Plugin).

### UI/Visualization (`src/components`)
*   **Board:** `Board.tsx` (Main View), `GameHex.tsx` (Hex Rendering), `HexOverlays.tsx` (Interaction Layer).
*   **Controls:** `GameControls.tsx` (Action Bar), `GameStatusBanner.tsx` (Turn Info).
*   **Dashboards:** `AnalystPanel.tsx` (Stats Sidebar).

## Code Standards

### Core Standards
*   **Functional Only:** React Functional Components + Hooks. No Class Components.
*   **Strict Typing:** TypeScript Strict Mode. No `any`. Explicit interfaces in `types.ts`.
*   **State Management:** `boardgame.io` (G/ctx). No local state for game data.

### Design Patterns
*   **Plugin Pattern:** Logic extension via `boardgame.io` plugins (e.g., Coach).
*   **Separation of Concerns:** `src/game` (Pure Logic/Math) vs `src/components` (Pure UI).
*   **Hexagonal Architecture:** Use Cube Coordinates (`q,r,s`) for all logic.

### Testing & Security
*   **TDD:** Jest for logic (`npm run test`).
*   **E2E:** Playwright for UI verification (`npm run test:e2e`).
*   **Security:** `eslint-plugin-security` active. Validate all inputs (e.g., `isValidHexId`).
*   **Mocking:** Explicit mocks for UI libs (`lucide-react`) in unit tests.
