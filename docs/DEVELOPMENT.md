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
*   `pnpm` (or `npm`)

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
    *Note: `./scripts/setup.sh` is the single source of truth for machine setup and installs all node modules and Playwright browser binaries.*

3.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    Open `http://localhost:5173` to view the app in Vite dev mode.

---

## 🧪 Testing & Verification Standards

We enforce rigorous test coverage and visual verification standards.

### 1. Unit & Logic Tests (Jest)

Unit tests focus on game engine logic, rules, move validation, bots, and geometry.

```bash
# Run all unit tests
pnpm test

# Run a specific unit test file
pnpm test src/game/rules/moveValidation.test.ts
```

*Note on JSDOM*: The default Jest environment is `node`. Any React component or DOM-dependent test file must include `/** @jest-environment jsdom */` at the top of the file.

### 2. End-to-End & Visual Verification (Playwright)

UI/UX changes must be visually verified using Playwright.

```bash
# Run E2E test suite
pnpm test:e2e

# Run with Playwright UI / Debugger
pnpm test:debug
```

*Verification Rules:*
*   **No Fixed Timeouts**: Avoid `waitForTimeout` in E2E tests as it causes flakiness. Wait for explicit DOM elements or state conditions (e.g. `expect(locator).toBeVisible()`).
*   **Base URL**: E2E tests run against the preview/dev server configured in `config/playwright.config.ts`. Use relative paths for `page.goto('/')`.

---

## 📊 Generated Evidence & Quality Workflows

All architectural integrity and code complexity evidence is generated programmatically rather than maintained manually.

### 1. Layered Architecture Verification
Verify system dependency rules (e.g., source code in MOVES must not import from BOTS):
```bash
pnpm check:arch
```
*Runs `depcruise src --config config/dependency-cruiser.cjs`.*

### 2. Automated Complexity Metrics
Calculate file line counts, cyclomatic complexity, coupling, and repository health scores:
```bash
# Generate JSON dependency graph dependency artifact
pnpm generate:json

# Calculate and update docs/COMPLEXITY.md automated report
pnpm calculate:complexity
```

### 3. Architecture & Dependency Diagrams
Regenerate visual dependency graphs in `docs/images/`:
```bash
pnpm generate:dot
pnpm generate:graph
```

### 4. Code Quality & Linting
Run ESLint checks:
```bash
pnpm lint
```

---

## 🤝 Contribution Expectations

Before submitting a PR or marking a task complete:

1.  **Test-Driven Development**: Write tests alongside or before new game logic.
2.  **Verify Build & Architecture**: Ensure `pnpm build && pnpm test` completes with 0 errors.
3.  **No Stale History**: Update `docs/ROADMAP.md` when completing items. Do not commit temporary logs or manual complexity snapshot tables.
4.  **Strict Typing**: Ensure strict TypeScript compliance with no `any` types.

---
*For game theory and heuristics, see [STRATEGY_ENGINE.md](./STRATEGY_ENGINE.md).*
