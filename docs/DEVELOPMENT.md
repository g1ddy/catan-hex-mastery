# Development Guide

This guide covers local environment setup, verification standards, generated evidence workflows, and contribution expectations for **Hex-Mastery**.

For architectural structure and file placement guidance, see [ARCHITECTURE.md](./ARCHITECTURE.md). For planned features and roadmap tasks, see [ROADMAP.md](./ROADMAP.md).

---

## 🛠 Tech Stack

The project is built on a modern React stack, leveraging `boardgame.io` for state management.

*   **Frontend**: React + TypeScript + Vite
*   **Game Engine**: [boardgame.io](https://boardgame.io/) (State Management, Move Validation, Multiplayer Networking)
*   **Visualization**: `react-hexgrid` (SVG-based board rendering)
*   **Styling**: Tailwind CSS
*   **Testing & Verification**: Jest (Unit/Logic), Playwright (E2E/Visual Verification)

---

## 🚀 Local Setup

### Prerequisites

*   Node.js (v20.19.0+ or >=22.12.0)
*   npm (included with Node.js)

### Installation & Environment Bootstrapping

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/hex-mastery.git
    cd hex-mastery
    ```

2.  **Bootstrap the environment:**
    ```bash
    ./scripts/setup.sh
    ```
    *Note: `./scripts/setup.sh` is the single source of truth for machine setup. It installs Node modules, Playwright browser dependencies, and Graphviz for local dependency-graph rendering when the platform package manager is supported.*

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` to view the app in Vite dev mode.

---

## 🧪 Testing & Verification Standards

We enforce rigorous test coverage and visual verification standards.

### 1. Unit & Logic Tests (Jest)

Unit tests focus on game engine logic, rules, move validation, bots, geometry, and repository integration contracts.

```bash
# Run all unit and integration tests
npm test

# Run a specific unit test file
npm test -- src/game/rules/moveValidation.test.ts
```

*Note on JSDOM*: The default Jest environment is `node`. Any React component or DOM-dependent test file must include `/** @jest-environment jsdom */` at the top of the file.

### 2. End-to-End & Visual Verification (Playwright)

UI/UX changes must be visually verified using Playwright.

```bash
# Run E2E test suite
npm run test:e2e

# Run with Playwright UI / Debugger
npm run test:debug
```

*Verification Rules:*
*   **No Fixed Timeouts**: Avoid `waitForTimeout` in E2E tests as it causes flakiness. Wait for explicit DOM elements or state conditions (e.g. `expect(locator).toBeVisible()`).
*   **Base URL**: E2E tests run against the preview/dev server configured in `config/playwright.config.ts`. Use relative paths for `page.goto('/')`.

---

## 📊 Generated Evidence & Quality Workflows

All architectural and complexity evidence is generated programmatically rather than maintained manually.

The **Generated Artifacts** workflow in [`.github/workflows/maritime-comparison.yml`](../.github/workflows/maritime-comparison.yml) is the single PR-branch writer for generated artifacts. It runs Maritime evidence generation and graph rendering before any commit, verifies the consumer contract, optionally generates documentation screenshots, and performs one final push. The generators retain separate artifact ownership; the orchestration prevents competing bot pushes to the same branch.

Documentation screenshots regenerate when UI or screenshot-generation inputs change, including `src/`, `public/`, the screenshot spec/config, package manifests, and relevant Vite/Tailwind/PostCSS entry configuration. Documentation prose changes alone do not regenerate application screenshots.

### 1. Layered Architecture Verification

Verify dependency rules (for example, that source code in MOVES does not import from BOTS):

```bash
npm run check:arch
```

This runs `depcruise src --config config/dependency-cruiser.cjs`. The same unfiltered policy is also run by `npm run build`.

### 2. Canonical Complexity & Hotspot Evidence

The tracked [`.maritime/`](../.maritime/) directory contains the canonical complexity and hotspot evidence. The **Generated Artifacts** workflow invokes Dependency Maritime's Action implementation at immutable commit `70b1882dbe37728bba511ea396645421170789f7`, explicitly acquires `@dependency-maritime/cli@0.1.0-beta.3`, analyzes `src/`, validates the bundle, and renders the SVG from that same run. Do not edit generated Maritime outputs manually.

For generated evidence, Catan passes `config/dependency-cruiser.maritime.cjs`. That file inherits all rules from `config/dependency-cruiser.cjs` and excludes test/spec helpers from the evidence graph so committed metrics and graph presentation describe production coupling. This does **not** relax `npm run check:arch`, `npm run build`, or `npm test`.

`docs/COMPLEXITY.md` is a stable guide to the generated artifacts. Current health and hotspot values are read directly from `.maritime/complexity-report.md`; there is no second Catan-owned complexity-report generator.

`npm run analyze:maritime` is intentionally not available immediately after `./scripts/setup.sh`, because Maritime is not a permanent Catan dependency. To reproduce the exact analysis locally, install the same published CLI prerelease without saving it as a Catan dependency, then run the repository command that mirrors the Action inputs:

```bash
npm install --no-save --package-lock=false @dependency-maritime/cli@0.1.0-beta.3
npm run analyze:maritime
npm run verify:maritime
```

See [COMPLEXITY.md](./COMPLEXITY.md) for metric definitions, thresholds, and artifact ownership.

### 3. Architecture & Dependency Diagrams

Dependency diagram presentation is derived directly from canonical Maritime evidence. `.maritime/dependency-graph.json` is the canonical machine evidence, and `docs/images/dependency-graph.svg` is the derived Maritime/Graphviz presentation. The SVG is not hand-edited; folder hierarchy and module relationships are derived recursively by Maritime from production module paths. Architecture policy and layer boundary rules remain governed by `config/dependency-cruiser.cjs`.

To render the visual dependency graph locally from already-generated canonical `.maritime` evidence:

```bash
npm run generate:graph
```

`generate:graph` is a thin, version-pinned wrapper around `@dependency-maritime/cli@0.1.0-beta.3 maritime graph`; it performs no dependency scan and does not require Maritime to be installed as a repository dependency. Graphviz's `dot` executable must be available; `./scripts/setup.sh` installs it on supported package managers.

### 4. Code Quality & Linting

Run ESLint checks:

```bash
npm run lint
```

---

## 🤝 Contribution Expectations

Before submitting a PR or marking a task complete:

1.  **Test-Driven Development**: Write tests alongside or before implementing game logic.
2.  **Verify Build & Architecture**: Ensure `npm run build && npm test` completes with 0 errors.
3.  **Generated Evidence Ownership**: Let the Generated Artifacts workflow update `.maritime/*` and the dependency SVG; do not hand-edit generated evidence.
4.  **No Stale History**: Update `docs/ROADMAP.md` when completing items. Do not commit temporary logs or manual complexity snapshot tables.
5.  **Strict Typing**: Ensure strict TypeScript compliance with no `any` types.

---
*For game theory and heuristics, see [STRATEGY_ENGINE.md](./STRATEGY_ENGINE.md).*
