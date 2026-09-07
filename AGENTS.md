# AGENTS.md

**Current Persona**: Senior Game Engineer & Logic Referee
**Project**: `hex-mastery`

## Introduction

This file is a concise operating contract and repository map for AI agents (Cursor, Copilot, Windsurf, Jules). It defines durable domain invariants, key verification entry points, and links to authoritative documentation.

---

## 🎲 Durable Game Invariants

All engine logic, UI features, and AI algorithms must obey these core invariants:

*   **Coordinate System**: Cube Coordinates (`q, r, s`) are mandatory for all board geometry and state logic. Do not use offset coordinates.
*   **Distance Rule**: Strictly enforce that no settlement or city may be adjacent to another vertex occupied by a settlement/city (1-edge distance rule).
*   **Probability & Pips**: Dice rolls follow standard 2d6 probability (36 outcomes). Pips (1 to 5 dots) measure production probability.
*   **Layer Boundaries**: Engine logic in MOVES (`src/game/moves/`) must never import from BOTS (`src/bots/`). UI components (`src/features/`) consume game state; logic must not bleed into component render trees.
*   **Strict Typing**: Always use strict TypeScript interfaces. Do not use `any`.
*   **Generated Artifact Contract**: `.maritime/*` evidence and generated dependency SVGs in `docs/images/` are produced by automated workflows. Never hand-edit generated artifacts.

---

## 🗺️ Authoritative Documentation Links

Do not duplicate procedures across documents. Refer to specific authoritative docs:

*   **[Development Guide](./docs/DEVELOPMENT.md)** — Canonical commands (`npm run build`, `npm test`, `npm run check:arch`, `npm run test:e2e`), local setup, documentation ownership matrix, and generated-artifact workflows.
*   **[Architecture Guide](./docs/ARCHITECTURE.md)** — Multi-layer architecture (Layers -1 to 3), responsibility boundaries, game/UI isolation, and conceptual vs. generated diagrams.
*   **[Roadmap](./docs/ROADMAP.md)** — Single authoritative home for active/unfinished work and intentional deferrals.
*   **[Complexity Guide](./docs/COMPLEXITY.md)** — Code health metrics, warning thresholds, and Maritime evidence interpretation.
*   **[Strategy Engine Deep Dive](./docs/STRATEGY_ENGINE.md)** — Implementation model for Coach/Analyst heuristics, pips, scarcity, and setup draft logic.

---

## ⚡ Canonical Verification Entry Points

Run these canonical commands to verify repository changes:

```bash
# Verify build, type-checking, and architecture policy
npm run build

# Run unit and integration tests
npm test

# Verify layered architecture rules specifically
npm run check:arch

# Run Playwright E2E test suite
npm run test:e2e
```

*Note: Avoid `waitForTimeout` in Playwright tests; wait for explicit DOM selectors or state conditions (see [DEVELOPMENT.md](./docs/DEVELOPMENT.md)).*

---

## 📂 Repository Map

```
├── AGENTS.md                 # Concise agent operating contract & repo map
├── README.md                 # Product-facing overview & documentation index
├── config/                   # Tooling configs (Jest, Playwright, Dependency-Cruiser)
├── docs/                     # Authoritative concern documentation
│   ├── ARCHITECTURE.md       # Conceptual layers & dependency direction rules
│   ├── COMPLEXITY.md         # Metrics definitions & Maritime evidence guide
│   ├── DEVELOPMENT.md        # Setup, canonical commands & doc ownership matrix
│   ├── ROADMAP.md            # Unfinished intent & explicit intentional deferrals
│   ├── STRATEGY_ENGINE.md    # Math, probability & Coach/Analyst implementation model
│   ├── Catan Strategy and Starting Rules.pdf # Rules/strategy reference corpus
│   ├── images/               # Screenshots and generated dependency SVGs
│   └── scripts/              # Screenshot generation spec
├── scripts/                  # Bootstrap & Maritime validation scripts
├── src/
│   ├── bots/                 # Decision Layer (Bot logic & profiles)
│   ├── features/             # Feature-isolated UI components & hooks
│   ├── game/                 # Pure game engine (Core, Geometry, Mechanics, Rules, Analysis, Moves)
│   ├── pages/                # Top-level page views (SetupPage, GamePage)
│   ├── shared/               # Generic UI primitives
│   └── styles/               # Global CSS / Tailwind styles
└── tests/                    # E2E (Playwright) & integration test suites
```
