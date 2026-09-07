## 🚨 Automated Complexity Report

**Last Updated:** 2026-09-07

### 🏥 Repository Health Score: **92.0 / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > 300, Complexity > 10, Fan-Out > 15).
*   **Total Graph Files**: 116
*   **Measured Files**: 116
*   **Unmeasured Files**: 0

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/features/board/components/HexOverlays.tsx` | **87.2** | 148 | 19 | 9 | 0.82 |
| `src/game/Game.ts` | **84** | 131 | 9 | 17 | 0.94 |
| `src/features/board/components/HexEdges.tsx` | **78.5** | 140 | 11 | 12 | 0.92 |
| `src/features/game/GameLayout.tsx` | **77.5** | 210 | 7 | 12 | 0.92 |
| `src/bots/logic/OptimalMoveFilter.ts` | **76.6** | 228 | 10 | 8 | 0.89 |
| `src/game/analysis/coach.ts` | **75.5** | 209 | 11 | 12 | 0.43 |
| `src/game/analysis/advisors/SpatialAdvisor.ts` | **71.8** | 211 | 7 | 10 | 0.83 |
| `src/pages/GamePage.tsx` | **69.6** | 94 | 11 | 10 | 0.91 |
| `src/game/rules/queries.ts` | **68.8** | 234 | 9 | 8 | 0.57 |
| `src/game/analysis/advisors/RoadAdvisor.ts` | **68.4** | 233 | 8 | 6 | 0.86 |

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
| `src/bots/logic/MoveScorer.ts` | **10** | 80 |
| `src/bots/logic/OptimalMoveFilter.ts` | **10** | 228 |
| `src/features/board/components/Port.tsx` | **10** | 102 |
