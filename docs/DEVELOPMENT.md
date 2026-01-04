# Development Guide

This guide covers the technical architecture, setup instructions, and contribution guidelines for **Hex-Mastery**.

## 🛠 Tech Stack

The project is built on a modern React stack, leveraging `boardgame.io` for state management and networking.

*   **Frontend**: React + TypeScript + Vite
*   **Game Engine**: [boardgame.io](https://boardgame.io/) (State Management, Move Validation, Multiplayer Networking)
*   **Visualization**: `react-hexgrid` (SVG-based board rendering)
*   **Styling**: Tailwind CSS
*   **Testing**: Jest (Unit), Playwright (E2E)

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18+)
*   npm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/hex-mastery.git
    cd hex-mastery
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # OR run the setup script which also installs Playwright browsers
    ./scripts/setup.sh
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` to view the app.

## 🧪 Testing

We use a dual-layer testing strategy:

*   **Unit Tests (Jest)**: Focus on game logic (moves, scoring, geometry).
    ```bash
    npm test
    ```
*   **E2E Tests (Playwright)**: Focus on UI interactions, board rendering, and "Coach Mode" overlays.
    ```bash
    npm run test:e2e
    ```

## 📂 Project Structure

```
src/
├── bots/           # AI implementations (RandomBot, DebugBot)
├── components/     # React UI components (Board, GameControls)
├── game/           # Core Game Logic
│   ├── analysis/   # Coach & Scoring Heuristics
│   ├── mechanics/  # Rules (Resources, Building)
│   ├── moves/      # boardgame.io Move Definitions
│   ├── config.ts   # Global constants (Board size, Costs)
│   └── Game.ts     # Main boardgame.io Game Object
├── styles/         # CSS & Tailwind config
└── App.tsx         # Main entry point
```

## 🗺️ Development Roadmap

### Completed Phases ✅
*   **Phase 1: Geometry Core** (Cube Coordinates, Fairness Algorithms)
*   **Phase 2: Setup Engine** (Snake Draft, Distance Rules)
*   **Phase 3: Analyst Module** (Pip Counting, Scarcity Metrics)
*   **Phase 4: Coaching Layer** (Heuristic Scoring, Heatmaps)

### Current Focus: Phase 5 (UI/UX) 🚧
*   Refining Mobile Layouts (Drawer/Sidebar logic).
*   Polishing visual feedback (Tooltips, Toasts).

### Upcoming: Phase 6 (Full Loop) 🔮
*   Trade Phase implementation.
*   Robber mechanics.
*   Victory Point tracking & Win Conditions.

## 🤝 Contributing

1.  Create a feature branch (`git checkout -b feature/amazing-feature`).
2.  Ensure all tests pass (`npm test` & `npm run test:e2e`).
3.  Commit your changes.
4.  Open a Pull Request.

---
*For high-level strategy and game theory documentation, see [STRATEGY_ENGINE.md](./STRATEGY_ENGINE.md).*
