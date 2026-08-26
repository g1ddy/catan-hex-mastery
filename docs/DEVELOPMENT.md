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

## 🗺️ Development Roadmap

### Completed Refactoring ✅
- [x] **Unified Move Architecture**: Separated Validation (Rules) from Execution (Moves).
- [x] **God Object Split**: `rules/validator.ts` split into `RuleEngine` (Validation) and `Queries` (Availability).
- [x] **Namespace Restructure**: Implemented the "Ideal Structure" (`Core`, `Geometry`, `Generation`) to separate concerns and stabilize the dependency graph.
- [x] **UI Migration**: Migrated `src/components` to `src/features` (Board, Coach, Game, HUD).
- [x] **GameScreen Refactor**: Extracted complex logic (Coach Data, Game Effects) from `GameScreen.tsx` into dedicated hooks (`useCoachData`, `useGameEffects`).

### Strategic Refactoring (Complexity Reduction) 📉
To improve the [Repo Health Score](./COMPLEXITY.md), we are targeting files with high coupling and complexity.

*   **Primary Target**: `src/features/game/components/GameScreen.tsx` (Formerly `Board.tsx`)
    *   **Issue**: Acts as the central hub, prone to "God Component" growth.
    *   **Strategy**: Continuously extract logic into `src/features/{feature}/hooks/` as new features (Trade, Dev Cards) are added.
*   **Secondary Target**: `src/features/hud/components/GameControls.tsx`
    *   **Issue**: High Cyclomatic Complexity (handling many move types).
    *   **Strategy**: Extract logic into custom hooks (e.g., `useBuildActions`, `useTurnActions`).

### Current Focus: Phase 7 (Full Game Loop) 🚧
- [x] **Robber Mechanics**:
    - [x] Resource Discarding (Players with >7 cards must discard half on roll of 7).
    - [x] Stealing (Active player steals 1 random resource from a player on the target hex).
- [ ] **Trade System**:
    - [ ] Player-to-Player trading (Offer, Counter-Offer, Accept/Reject).
    - [ ] Trade interface and notification system.
- [ ] **Development Cards**:
    - [ ] Deck management & random shuffling.
    - [ ] "Buy Dev Card" move.
    - [ ] Cards include: Knight (Move Robber), Road Building, Year of Plenty, Monopoly, Victory Point.
- [ ] **Special Awards**:
    - [ ] **Longest Road**: Dynamic pathfinding algorithm to track continuous road segments.
    - [ ] **Largest Army**: Tracking played Knight cards.
- [ ] **Win Conditions**:
    - [ ] Integrate Special Awards into VP calculation.

## 🤝 Contributing

1.  Create a feature branch (`git checkout -b feature/amazing-feature`).
2.  Ensure all tests pass (`npm test` & `npm run test:e2e`).
3.  Commit your changes.
4.  Open a Pull Request.

---
*For high-level strategy and game theory documentation, see [STRATEGY_ENGINE.md](./STRATEGY_ENGINE.md).*
