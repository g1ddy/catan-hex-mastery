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

### Phase 2: The Setup Engine (Current Focus) 🚧
*   [ ] Implement "Snake Draft" turn order (1-2-3-4-4-3-2-1).
*   [ ] Enforce the "Distance Rule" validation.
*   [ ] Implement starting resource logic (based on 2nd settlement).

### Phase 3: The Analyst Module
*   [ ] Real-time "Pip" counting.
*   [ ] Resource scarcity calculation.
*   [ ] Board balance visualization.

### Phase 4: Coaching Layer
*   [ ] Heuristic engine to grade player placements.
*   [ ] "Best Move" suggestion overlay.

### Phase 5 & 6: Polish & Full Game Loop
*   [ ] Full resource production, trading, and building mechanics.

## 🚀 Getting Started

*   **Install dependencies:**
    ```bash
    npm install
    ```
*   **Run the development server:**
    ```bash
    npm run dev
    ```
