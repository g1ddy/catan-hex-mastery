# Refactoring Plan: Catan Hex Mastery

This document outlines the purpose of key architectural files and provides a method-by-method refactoring plan focused on **Code Hygiene**, **DRY (Don't Repeat Yourself)**, and **Extensibility**.

---

## 1. `src/game/analysis/coach.ts`

### **Current Purpose**
This class analyzes the game board to provide strategic recommendations for settlement placement. It calculates scores based on mathematical heuristics like pip counts, resource scarcity, and resource diversity.

### **Method-by-Method Refactoring Plan**

#### `constructor(G: GameState)`
- **Current**: Accepts specific `GameState`. Hardcodes internal logic dependencies.
- **Refactor**:
    - **Inject Configuration**: Accept a `CoachConfig` object (weights for scarcity, synergy, etc.). This allows for different "Bot Personalities" (e.g., an "Aggressive" coach vs. a "Balanced" coach).

#### `private getPips(num: number)`
- **Current**: hardcoded map of dice roll probabilities.
- **Refactor**:
    - **Move to Utils**: This is generic Catan math. Move to `src/game/mechanics/probability.ts` or similar. It is likely needed by bots, UI, and other logic.

#### `getAllSettlementScores(playerID: string)`
- **Current**: A massive monolithic method (~100 lines). Calculates scarcity, iterates board, checks validity, calculates pips, applies multipliers.
- **Refactor**:
    - **Extract Validators**: Move "is valid spot" logic (occupied check, distance rule) to `src/game/rules/placement.ts`.
    - **Extract Scorers**: Break down into smaller scoring functions: `scorePips()`, `scoreScarcity()`, `scoreSynergy()`.
    - **Use Constants/Config**: Replace magic numbers (`SCARCITY_THRESHOLD`, multipliers) with the injected configuration.

#### `getBestSettlementSpots(playerID: string)`
- **Current**: Sorts and slices top 3.
- **Refactor**:
    - Keep as is, but ensure it relies on the refactored `getAllSettlementScores`.

---

## 2. `src/bots/BotCoach.ts`

### **Current Purpose**
Acts as the bridge between the raw analysis (`Coach`) and the bot's actions. It interprets the game state to decide *what* move to make (City vs. Settlement vs. Road) and *where* to make it.

### **Method-by-Method Refactoring Plan**

#### `recommendSettlementPlacement(playerID: string)`
- **Current**: Simply calls `Coach.getBestSettlementSpots`.
- **Refactor**:
    - **Enhance**: Allow passing a "Strategy" override. If the bot is desperate for Ore, it might prioritize Ore spots over pure high-score spots.

#### `recommendRoadPlacement(playerID: string)`
- **Current**: Iterates edges connected to the *last placed settlement*. This logic is brittle and specific to the Setup phase (mostly).
- **Refactor**:
    - **Generalize**: Use a shared `RoadFinder` utility. The bot should be able to find road spots anywhere, not just near the last settlement.
    - **DRY**: Use the same `isValidRoadSpot` logic that the UI (`HexOverlays`) should use.

#### `recommendNextMove(playerID: string)`
- **Current**: Hardcoded priority chain: `City > Settlement > Road`.
- **Refactor**:
    - **Strategy Pattern**: Implement a `DecisionEngine` or `BotProfile`.
        - *Example*: `AggressiveBot` might prioritize Roads to cut off opponents. `BuilderBot` prioritizes Cities.
    - **Weighted Randomness**: Instead of strict `if/else`, calculate a "Desire Score" for each action and pick based on that.
    - **DRY**: The logic `getAffordableBuilds` is good, but the code determining *where* to build duplicates logic found elsewhere. Use `src/game/rules/placement.ts` to find all valid moves first, then score them.

---

## 3. `src/components/HexOverlays.tsx`

### **Current Purpose**
The visual logic layer. It renders interactive elements (vertices, edges) over the hex grid. It currently handles:
1.  Geometry (corner coordinates).
2.  Game Rule Validation (can I click this?).
3.  Ghost State (hover previews).
4.  Coach Visualizations (heatmaps).

### **Method-by-Method Refactoring Plan**

#### `HexOverlays` (Main Component)
- **Current**: Calculates `isTooClose`, `vertices`, `edges` inside the render body. Contains heavy logic for "Is this clickable?".
- **Refactor**:
    - **Custom Hooks**: Extract logic to `useBoardInteractions(G, ctx, playerID)`.
        - This hook should return: `{ validSettlements, validRoads, validCities }`.
    - **Strict Separation**: `HexOverlays` should **visualize**, not **decide**.
        - *Bad*: `if (!isOccupied && !isTooClose(vId))`
        - *Good*: `if (validSettlements.has(vId))`
    - **DRY**: The `validSettlements` set should come from the SAME logic source as the Bot. If the rule changes (e.g., "Distance Rule becomes 3 spots"), both Bot and UI update automatically.

#### `BuildingIcon`
- **Current**: Defined inside the file.
- **Refactor**:
    - **Extract**: Move to `src/components/board/BuildingIcon.tsx`. It's a presentational component that can be reused (e.g., in the Player Panel or Legend).

#### `arePropsEqual`
- **Current**: Manual prop comparison for `React.memo`.
- **Refactor**:
    - **Simplify**: If we extract the logic into hooks/selectors, the props passed to `HexOverlays` might become simpler, making this check less brittle.

#### Geometry Calculation (`React.useMemo` block)
- **Current**: Calculates corners and string splits (`id.split('::')`) inside the component.
- **Refactor**:
    - **Pre-calculation**: The grid geometry is static. Move `corner` and `edge` mapping to a static lookup table or a context initialized once at game start. Doing string splitting on every hex render is expensive and redundant.

---

## Summary of Architecture Changes

1.  **`src/game/rules/`**: New directory.
    - `placement.ts`: Pure functions determining if a move is valid (e.g., `isValidRoad(G, edgeId, playerID)`). Used by **Bot** and **UI**.
2.  **`src/game/mechanics/`**:
    - `scoring.ts`: Extracted logic from Coach for pips and resources.
3.  **`src/bots/profiles/`**:
    - Define `BotProfile` interface (weights for decisions).
    - `BotCoach` consumes a Profile.
