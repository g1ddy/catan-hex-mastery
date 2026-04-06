# Archon's Journal

This journal records critical architectural blockers and recurring anti-patterns found in Hex-Mastery.

## Format
`## YYYY-MM-DD - [Pattern Detected] **Observation:** [Detail] **Strategy:** [Action]`

## 2026-01-24 - [High Complexity Component]
**Observation:** `GameControls.tsx` was the highest complexity file (Score: 103.6, Complexity: 22) due to mixing multiple game phases (Setup, Robber, Gameplay) and button logic.
**Strategy:** Refactored into specialized sub-components (`SetupControls`, `RobberControls`, `BuildBar`, `TurnControls`). Reduced complexity significantly; file dropped out of Top 10.

## 2026-02-01 - [Monolithic Component]
**Observation:** `HexOverlays.tsx` had high complexity (Score 94.5) due to mixing vertex, edge, and port rendering logic.
**Strategy:** Extracted `HexVertices` and `HexEdges` components. Score reduced to 78.3.

## 2026-02-08 - [High Complexity Logic]
**Observation:** `RoadAdvisor.ts` had high complexity (Score 99.8, Max Complexity 23) due to monolithic `findSignificantTargets` method mixing BFS, scoring, and filtering.
**Strategy:** Refactored into specialized methods (`bfsFindTargets`, `scoreTargetVertex`, `filterParetoOptimalTargets`). Score reduced to 83.6, Max Complexity to 15.
## 2026-03-01 - [High Complexity Component] **Observation:** `BotCoach.ts` had high complexity (Score 97.1, Complexity 18) due to containing both the BotCoach class logic and optimal move filtering. **Strategy:** Refactored by extracting `filterOptimalMoves` and `refineTopMoves` logic into `OptimalMoveFilter.ts`. Reduced complexity significantly; file dropped out of Top 10.
## 2026-03-08 - [High Complexity File] **Observation:** `MoveScorer.ts` had high cyclomatic complexity (18) due to mixing base weight derivation (large switch statement) with dynamic logic multipliers. **Strategy:** Extracted `getBaseWeight` and `applyDynamicMultipliers` methods to lower cyclomatic complexity and improve readability. Dropped out of Top 10.
## 2026-03-15 - [High Complexity Logic] **Observation:** `HexOverlays.tsx` had high cyclomatic complexity (18) due to mixing multiple property checks in `arePropsEqual`. **Strategy:** Extracted `checkBasicPropsEqual`, `checkVerticesEqual`, and `checkEdgesEqual` helpers. Reduced cyclomatic complexity to below 10 and dropped out of top 10 most complex files.
## 2026-03-22 - [High Complexity Logic] **Observation:** `RoadAdvisor.ts` had high cyclomatic complexity (15) due to nested condition checking and complex inner loops within `bfsFindTargets`. **Strategy:** Extracted `evaluateVertex` and `expandVertex` helpers. Reduced cyclomatic complexity to below 10 and dropped out of top 10 most complex files.
## 2026-03-29 - [High Complexity Logic]
**Observation:** `OptimalMoveFilter.ts` had high cyclomatic complexity (17) due to a monolithic `filterOptimalMoves` method that combined validation, setup phase logic, and dynamic scoring logic.
**Strategy:** Extracted `validateContext`, `handleSetupSettlements`, and `refineCandidates` helpers, passing calculated `moveWeights` to avoid redundant O(N) recalculations. Reduced cyclomatic complexity below 10.
## 2026-04-05 - [High Complexity Logic]
**Observation:** `HexEdges.tsx` had high cyclomatic complexity (14) due to deeply nested inline conditional logic inside its `.map` rendering loop for determining interactive and ghost states.
**Strategy:** Extracted the state determination logic into a pure helper function `getEdgeInteractiveState`. This decoupled state derivation from React rendering, reducing cyclomatic complexity below 10 and removing the file from the top 10 most complex list.
