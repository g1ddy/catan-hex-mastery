# Roadmap

This document is the single authoritative source for unfinished product, engine, architecture, and maintenance work across **Hex-Mastery**.

*Note: Roadmap entries define high-level unfinished intent. Detailed execution scopes, task breakdown, and acceptance criteria are managed in GitHub issues.*

---

## 🎲 Phase 7: Full Game Loop

### 1. Trade System
- [ ] Player-to-player trade lifecycle (offer, counter-offer, accept, reject).
- [ ] Interactive trade interface and player notification state.

### 2. Robber Mechanics & Discarding
- [ ] Mandatory card discarding when holding > 7 cards on a 7 roll.
- [ ] Robber relocation and target player resource stealing.

### 3. Development Cards
- [ ] Development Card deck initialization and random draw pool.
- [ ] Development Card purchase and play move handlers (`buyDevCard`, `playDevCard`).
- [ ] Knight, Road Building, Year of Plenty, Monopoly, and Victory Point card effects.

### 4. Special Awards & Victory Conditions
- [ ] Continuous graph traversal algorithm for Longest Road (minimum 5 continuous segments).
- [ ] Largest Army tracking and award transfers (minimum 3 played Knights).
- [ ] Special award VP allocations and end-game win condition detection (10 Victory Points).

---

## 🎨 UI & UX Refinement

- [ ] High-contrast `NumberToken` legibility across all screen resolutions.
- [ ] Responsive mobile drawer interaction flows for Robber targeting and Trading.

---

## 🧹 Architecture & Quality Stewardship

- [ ] Preserve feature-isolated React component structure (`src/features/`).
- [ ] Maintain strict separation between decision logic, rule evaluation, and move execution (`docs/ARCHITECTURE.md`).
- [ ] Track and resolve complexity threshold breaches in `.maritime/complexity-report.md` as Phase 7 features land.

---

## ⏸️ Intentional Deferrals

The following architectural and structural proposals are deliberately postponed. Each states when it should be reconsidered:

*   **Replace `boardgame.io`**:
    *   *Status*: Deferred.
    *   *Rationale*: The existing framework adequately supports state management, move validation, turn flow, and local multiplayer.
    *   *Reconsideration Trigger*: Reevaluate if framework limitations materially block advanced networking, server persistence, or complex multi-stage turn flows.
*   **Replace `react-hexgrid`**:
    *   *Status*: Deferred.
    *   *Rationale*: Current SVG-based rendering provides stable hex layout and interactive overlays.
    *   *Reconsideration Trigger*: Reevaluate when custom canvas/SVG geometry rendering offers clear performance or interaction advantages.
*   **Test-Framework Migration (e.g., Jest to Vitest)**:
    *   *Status*: Deferred.
    *   *Rationale*: The current Jest setup (`ts-jest`, JSDOM) reliably tests core engine logic and components.
    *   *Reconsideration Trigger*: Reevaluate if Jest configuration creates major friction for Vite/TypeScript updates or execution speed.
