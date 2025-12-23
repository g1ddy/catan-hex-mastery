# hex-mastery

> **A modular resource-trading game engine with integrated statistical analysis and strategy coaching tools.**

## Overview

**hex-mastery** is a robust, TypeScript-based game engine designed to simulate and analyze the mechanics of hex-grid resource trading games. Unlike a simple clone, this project emphasizes **mastery**, offering deep statistical insights, placement evaluation, and real-time strategic coaching.

The engine features a deterministic board generator for placement training and an extensible heuristic API for gameplay advice, all built on a rigorous implementation of "Cube Coordinates" for hexagonal geometry.

**Note:** This project is inspired by the mechanics of *The Settlers of Catan* but is a distinct engine focused on analysis and strategy. It is not affiliated with Catan GmbH or Catan Studio.

## Technology Stack

*   **Language**: TypeScript (Node.js)
*   **Testing**: Jest / Mocha (TBD) - **Mandatory**
*   **Architecture**: Modular, Phase-based implementation

## Project Roadmap

The development of `hex-mastery` is divided into strict phases. **Each phase must be fully implemented, tested, and verified before moving to the next.**

### Phase 1: The Geometry & Probability Core (The "Physics")
*Goal: Build the immutable laws of the game board.*

*   **Hex Grid Implementation**: Create the board using **Cube Coordinates (q, r, s)**. This simplifies math for distances, neighbors, and longest roads.
*   **The Probability Engine**: Implement a `Dice` class and a `BoardAnalyzer` that calculates the "Pip Score" (probability dots) for every intersection.
*   **Deliverable**: A console-based tool that generates a valid 19-hex board and allows querying any intersection for total probability dots and resource yield.

### Phase 2: The Rules Kernel (State Management)
*Goal: Implement strict rules to prevent illegal moves.*

*   **State Machine**: Define game states (`SetupPhase`, `ResourceProduction`, `Trading`, `Building`).
*   **Validation Logic**: Implement the **Distance Rule** (no settlement adjacent to another) and resource cost validation.
*   **Longest Road Algorithm**: Implement DFS or recursive pathfinding to calculate road length dynamically.
*   **Deliverable**: A "Hotseat" playable version where moves are validated, resources are tracked, and the game correctly identifies a winner.

### Phase 3: The "Analyst" Module (Metrics & Heuristics)
*Goal: Add the "brains" for coaching and practice features.*

*   **Placement Evaluator**: Algorithm that scores starting spots based on:
    *   **Pip Density**: Total production probability.
    *   **Resource Diversity**: Complementary resources (e.g., Ore + Wheat).
    *   **Scarcity Weighting**: High value for rare resources (Brick/Ore).
*   **Practice Mode Feature**: A mode where the user selects "optimal" spots, and the engine compares them to calculated "best" spots.
*   **Deliverable**: A "Placement Trainer" tool that gives the user a score (0-100%) on their starting position selection.

### Phase 4: The Coaching Layer (AI & Suggestions)
*Goal: Implement the "Assistant" that runs alongside the player.*

*   **Gamestate Evaluation Function**: AI heuristic assigning numerical value to the current state.
*   **Trade Analyzer**: Evaluates offered trades against current needs (e.g., warns if a trade helps an opponent take Longest Road).
*   **Deliverable**: A "Coaching Mode" overlay suggesting the statistically best move and warning against sub-optimal trades.

### Phase 5: Interface & Polish
*Goal: Connect logic to a frontend.*

*   **Visualization**: Web/React or Unity frontend to visualize the grid and tips.
*   **Deliverable**: The final playable application.

## Development & Testing

**Strict Test-Driven Development (TDD) is required.**
*   No feature is considered "done" until it has accompanying unit tests covering:
    *   Happy paths (valid moves).
    *   Edge cases (boundary conditions).
    *   Illegal states (verifying the rules engine blocks them).
*   Run tests frequently to ensure no regressions.

## Getting Started

1.  **Install Dependencies**: `npm install` (once initialized)
2.  **Run Tests**: `npm test`
3.  **Run Engine**: `npm start` (or specific phase script)

---
*Generated for the hex-mastery project.*
