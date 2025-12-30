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

## 🚧 Current Task: Phase 5 (UI/UX Polish) & Prep for Phase 6

We are currently finalizing **Phase 5: UI/UX Polish** and preparing for **Phase 6: Full Game Loop**.

**Completed Features (Do Not Regress):**
*   **Analyst Module**: Real-time stats (Pips, Fairness, Scarcity) are fully implemented.
*   **Coach**: The heuristic engine correctly scores settlements based on Pips, Scarcity, Diversity, and Synergy. Recommendations are visualized on the board.
*   **Mobile Layout**: The "Vertical Stack" layout and docked controls are stable.

**Priorities:**
1.  **Visual Consistency**: Ensure `NumberToken` components are legible and properly styled across all resolutions.
2.  **Code Cleanup**: Verify no unused CSS or "magic strings" remain before starting complex game logic.
3.  **Phase 6 Readiness**: Ensure the state machine in `Game.ts` is ready to handle Trade phases and Win conditions.

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
*   `Catan Strategy and Starting Rules.txt`: The rulebook and strategic engine logic.

## Verification
### Mobile Layout Verification
To verify the mobile layout rendering (and ensure the SVG board is visible and properly sized), use the Playwright script `tests/mobile_layout_test.py`.

```bash
# Ensure playwright is installed
pip install playwright
playwright install chromium

# Run the test (ensure dev server is running on :5173)
python3 tests/mobile_layout_test.py
```

This test checks:
1.  Background color (dark slate-900).
2.  Board visibility (SVG dimensions > 0 and `display: block`).
3.  Controls visibility.
