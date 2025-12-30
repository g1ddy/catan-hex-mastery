# Hex-Mastery: Catan Strategy Engine & Trainer

Hex-Mastery is a modular resource-trading game engine designed to train players in high-level strategy. Unlike typical clones, this project prioritizes statistical analysis and placement heuristics to function as a coaching tool.

## 🎯 Project Goals

*   **The "Physics" Core**: A mathematically rigorous board implementation using Cube Coordinates.
*   **The Trainer**: A specialized "Setup Phase" simulator to practice the crucial "Snake Draft" of initial settlements.
*   **The Analyst**: Real-time evaluation of board fairness, resource scarcity, and pip distribution.
*   **The Game**: A fully playable multiplayer implementation (Phase 6).

## 🛠 Tech Stack

*   **Frontend**: React + TypeScript + Vite
*   **State Management**: boardgame.io (Game Engine & Multiplayer Networking)
*   **Visualization**: react-hexgrid (SVG-based board rendering)
*   **Styling**: Tailwind CSS

## 🗺️ Development Roadmap

### Phase 1: The Geometry Core ✅
*   [x] Implementation of Cube Coordinate system (q, r, s).
*   [x] Valid 19-hex board generation.
*   [x] "Fairness" algorithms (preventing adjacent 6s/8s).

### Phase 2: The Setup Engine (Trainer) ✅
*   [x] Implement "Snake Draft" turn order (1-2-3-4-4-3-2-1).
*   [x] Enforce the "Distance Rule" validation.
*   [x] Implement starting resource logic (based on 2nd settlement).

### Phase 3: The Analyst Module ✅
*   [x] Real-time "Pip" counting.
*   [x] Resource scarcity calculation.
*   [x] Board balance visualization.

### Phase 4: Coaching Layer ✅
*   [x] Heuristic engine to grade player placements (Pips + Synergy + Scarcity).
*   [x] "Coach Recommendations" visualizer (Gold Rings).
*   [x] Goal: Smart assistant for board evaluation.

### Phase 5: UI/UX Polish (Current Focus)
*   [x] Iconography: Integrate lucide-react icons.
*   [x] Mobile Layout refinements.
*   [ ] Visual Overhaul: Final polish on NumberToken components.

### Phase 6: Full Game Loop & Rules
*   [ ] Turn Phases (Trade vs Build).
*   [ ] Robber and Win Conditions.
*   [ ] Victory Point tracking and End Game state.

## 🚀 Getting Started

*   **Install dependencies:**
    ```bash
    npm install
    ```
*   **Run the development server:**
    ```bash
    npm run dev
    ```
