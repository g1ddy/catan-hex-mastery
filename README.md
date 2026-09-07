# Hex-Mastery

**Live App:** [**https://g1ddy.github.io/catan-hex-mastery/**](https://g1ddy.github.io/catan-hex-mastery/)

---

### Catan Strategy Engine & Placement Trainer

**Hex-Mastery** is a specialized strategy engine and training interface focused on mastering Catan's initial settlement placement, probability math, and board evaluation.

![Desktop Game View](docs/images/hero-board-desktop.png)

## 🏆 Why Hex-Mastery?

Most Catan apps focus solely on full gameplay. **Hex-Mastery is built as a placement trainer.**

Initial settlement placement during the Snake Draft often dictates the trajectory of the match. Hex-Mastery integrates a real-time **Coach** and **Analyst** that evaluate board states using game-theoretic heuristics—measuring scarcity, pip distribution, and production synergy—to grade settlement choices in real time.

*Note: Hex-Mastery currently focuses on initial board setup and draft training. Full game-loop features (trade lifecycle, dev card deck, special awards) are in active development.*

## ✨ Key Features

### 🧠 Coach Mode
Don't just guess—know. The Coach analyzes every valid settlement spot on the board and visualizes top choices using a dynamic heatmap.

**Key Features:**
*   **Resource Heatmap**: See winning moves directly on the board with a color-coded overlay (red to green).
*   **Player Production Potential**: Compare your resource-generating power against your opponents at a glance.

**Heatmap Factors:**
The Coach evaluates moves based on:
*   **Production Probability (Pips)**
*   **Synergy** (Do you have the Brick to match your Wood?)
*   **Scarcity** (Are you securing rare resources?)

![Resource Heatmap in Coach Mode](docs/images/coach-heatmap.png)

### 📊 The Analyst Dashboard
A real-time sidebar that acts as your HUD.
*   **Fairness Meter**: See if random board generation favored one player position.
*   **Pip Distribution**: Analyze the abundance of each resource type on the board.
*   **Scarcity Warnings**: Instantly spot "Ore Droughts" or "Wheat Gluts" before they happen.

![The Analyst Panel, showing production potential](docs/images/analyst-panel.png)

### 🐍 The Setup Trainer
Practice the most critical phase of the game: The Snake Draft.
*   **Play against Smart Bots**: Test your strategies against AI opponents.
*   **Optimized for 3 Players**: Designed for balanced 3-player matches.
*   **Scenario Matrix Options**:
    *   **0 Players (Auto Play)**: Spectate mode with 3 smart bots.
    *   **1 Player vs 2 Bots**: Practice setup against AI.
    *   **2 Players vs 1 Bot**: Local multiplayer draft with 1 AI.
    *   **3 Players (Pass & Play)**: Local PvP draft.
    *   *1 Player (Debug)*: Development mode for testing move handlers.

![Setup Phase / Snake Draft](docs/images/setup-draft.png)

### 📱 Mobile-First Design
Play and train anywhere. The interface is fully responsive, and advanced Coach features are available on any device. Even on mobile, you get the same golden ring suggestions for top-tier moves and bottom drawers for board visibility.

![Mobile Coach Tooltip showing a recommendation](docs/images/mobile-coach-tooltip.png)

![Mobile view with Coach Panel open](docs/images/mobile-production.png)

## 🚀 Getting Started

1. **Launch the App**: Open the [live app](https://g1ddy.github.io/catan-hex-mastery/) or run `npm run dev` locally.
2. **Configure Scenario**: On the Setup page, select your match configuration (e.g. "1 Player vs 2 Bots").
3. **Enable Coach Mode**: Turn on the assistant and use the **Resource Heatmap** to visualize top settlement options.
4. **Master the Setup**: Analyze recommendations to learn *why* certain spots offer superior production potential and synergy.

## 📚 Documentation Index

For detailed guidelines, contracts, and technical specifications, refer to the authoritative documents:

*   **[Development Guide](./docs/DEVELOPMENT.md)** — Prerequisites, local setup, canonical commands, verification standards, generated evidence workflows, and documentation ownership matrix.
*   **[Architecture Guide](./docs/ARCHITECTURE.md)** — Multi-layer architecture (Layers -1 to 3), responsibility boundaries, dependency rules, project file placement guide, and conceptual vs. generated structure.
*   **[Roadmap](./docs/ROADMAP.md)** — Single source for unfinished product, engine, architecture, and maintenance work plus intentional deferrals.
*   **[Complexity & Code Health](./docs/COMPLEXITY.md)** — Metric definitions, warning thresholds, canonical `.maritime/` evidence profile, and interpretation rules.
*   **[Strategy Engine Deep Dive](./docs/STRATEGY_ENGINE.md)** — Hex-Mastery's implementation-facing strategy model, probability calculations, board invariants, and Coach/Analyst behavior.

---
*Built with React, TypeScript, and boardgame.io. Open Source and designed for the community.*
