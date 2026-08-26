# Roadmap

This document is the single authoritative source for unfinished product, engine, and maintenance work across **Hex-Mastery**.

---

## 🎲 Phase 7: Full Game Loop

### 1. Trade System
- [ ] Implement the player-to-player trade lifecycle: offer, counter-offer, accept, and reject.
- [ ] Add the trade interface and player notifications.

### 2. Robber Mechanics & Discarding
- [ ] Implement discarding for players with > 7 cards when a 7 is rolled.
- [ ] Implement robber relocation and target player selection (stealing resources).

### 3. Development Cards
- [ ] Implement Development Card deck initialization and random shuffling.
- [ ] Add `buyDevCard` and `playDevCard` moves.
- [ ] Implement Knight, Road Building, Year of Plenty, Monopoly, and Victory Point cards.

### 4. Special Awards & Victory Conditions
- [ ] Implement continuous-path calculation algorithm for Longest Road (minimum 5 continuous segments).
- [ ] Track played Knight cards per player for Largest Army (minimum 3 Knights).
- [ ] Integrate special award VP allocations and end-game win detection (reaching 10 Victory Points).

---

## 🎨 UI & UX Refinement

- [ ] Ensure `NumberToken` components are legible and styled consistently across all resolutions.
- [ ] Enhance mobile drawer interactions for Robber target selection and Trading.

---

## 🧹 Code Quality & Complexity Stewardship

- [ ] Maintain modular feature-based UI design (`src/features/`) and avoid monolithic components.
- [ ] Keep decision logic and move execution separated according to multi-layer architecture guidelines in `docs/ARCHITECTURE.md`.
- [ ] Monitor complexity metrics reported in `docs/COMPLEXITY.md` and address threshold breaches as Phase 7 features are integrated.
