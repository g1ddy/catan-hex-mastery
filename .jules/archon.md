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
