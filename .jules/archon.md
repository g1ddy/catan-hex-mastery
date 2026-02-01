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
