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

## 🚧 Current Task: Phase 5 (UI/UX Polish)

We are currently working on **Phase 5: UI/UX Polish**, prioritizing readability and mobile usability before the Full Game Loop (Phase 6).

**Priorities:**
1.  **Readability**: Replace raw SVG text with high-contrast `NumberToken` components.
2.  **Iconography**: Use `lucide-react` icons instead of text labels.
3.  **Constraints**: Enforce 2-player limit for Local/Pass-and-Play mode.

**Requirements:**
*   **NumberToken**: Use `<foreignObject>` inside SVG to leverage Tailwind styling (Beige circles, shadows).
*   **Icons**: Standardize on `Trees`, `BrickWall`, `Wheat`, `Mountain`, and `Cloud` (for Sheep).
*   **Configuration**: Respect `GAME_CONFIG.mode` for feature flags.

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

### 2. Strategic Context
When implementing logic, remember the "Why".
*   *Why do we need a BoardAnalyzer?* To calculate "Pip Score" for the Placement Trainer.
*   *Why do we need a specific Longest Road algorithm?* Because it is a dynamic graph problem that changes with every road built.

## Interaction Guidelines
*   **Verify**: Always verify your file changes.
*   **Reflect**: Before implementing a rule, ask: "Does this match the expert analysis in the strategy text?"
*   **Test**: Did you write a test for that edge case? (e.g., Can a player build a road through an opponent's settlement? No. Test it.)

## "Source of Truth" Files
*   `README.md`: The roadmap and high-level goals.
*   `Catan Strategy and Starting Rules.txt`: The rulebook and strategic engine logic.
