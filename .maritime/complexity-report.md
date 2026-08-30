## 🚨 Automated Complexity Report

**Last Updated:** 2026-08-30

### 🏥 Repository Health Score: **91.0 / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > 300, Complexity > 10, Fan-Out > 15).
*   **Total Graph Files**: 112
*   **Measured Files**: 112
*   **Unmeasured Files**: 0

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/features/board/components/HexOverlays.tsx` | **89.5** | 148 | 19 | 10 | 0.83 |
| `src/game/Game.ts` | **80.9** | 121 | 9 | 16 | 0.94 |
| `src/features/board/components/HexEdges.tsx` | **80.6** | 140 | 11 | 13 | 0.93 |
| `src/bots/logic/OptimalMoveFilter.ts` | **78.8** | 228 | 10 | 9 | 0.9 |
| `src/features/game/GameLayout.tsx` | **77.5** | 210 | 7 | 12 | 0.92 |
| `src/game/analysis/coach.ts` | **75.5** | 209 | 11 | 12 | 0.43 |
| `src/game/analysis/advisors/SpatialAdvisor.ts` | **71.8** | 211 | 7 | 10 | 0.83 |
| `src/pages/GamePage.tsx` | **69.6** | 94 | 11 | 10 | 0.91 |
| `src/features/hud/components/GameControls.tsx` | **68.9** | 122 | 10 | 10 | 0.83 |
| `src/game/rules/queries.ts` | **68.8** | 234 | 9 | 8 | 0.57 |

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
| `src/features/board/components/HexOverlays.tsx` | **19** | 148 |
| `src/features/board/components/HexEdges.tsx` | **11** | 140 |
| `src/features/hud/components/GameNotification.tsx` | **11** | 73 |
| `src/game/analysis/coach.ts` | **11** | 209 |
| `src/game/core/utils/sanitize.ts` | **11** | 73 |
| `src/game/rules/validator.ts` | **11** | 75 |
| `src/pages/GamePage.tsx` | **11** | 94 |
| `src/bots/CatanBot.ts` | **10** | 112 |
| `src/bots/logic/MoveScorer.ts` | **10** | 80 |
| `src/bots/logic/OptimalMoveFilter.ts` | **10** | 228 |
