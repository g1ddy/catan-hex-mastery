## 🚨 Automated Complexity Report

### 📐 Architectural Folder Coupling & Instability Metrics
| Folder / Namespace | Modules | Afferent ($C_a$) | Efferent ($C_e$) | Instability ($I$) |
| :--- | :--- | :--- | :--- | :--- |
| `src` | 4 | 1 ($C_a$) | 7 ($C_e$) | **0.875** |
| `src/adapters` | 4 | 9 ($C_a$) | 3 ($C_e$) | **0.25** |
| `src/bots` | 12 | 2 ($C_a$) | 9 ($C_e$) | **0.818** |
| `src/features/board` | 13 | 1 ($C_a$) | 14 ($C_e$) | **0.933** |
| `src/features/coach` | 11 | 4 ($C_a$) | 10 ($C_e$) | **0.714** |
| `src/features/game` | 7 | 1 ($C_a$) | 19 ($C_e$) | **0.95** |
| `src/features/hud` | 18 | 3 ($C_a$) | 12 ($C_e$) | **0.8** |
| `src/features/shared` | 8 | 27 ($C_a$) | 1 ($C_e$) | **0.036** |
| `src/game` | 53 | 49 ($C_a$) | 1 ($C_e$) | **0.02** |
| `src/pages` | 2 | 1 ($C_a$) | 9 ($C_e$) | **0.9** |
| `src/styles` | 2 | 2 ($C_a$) | 0 ($C_e$) | **0** |


**Last Updated:** 2026-09-16

### 🏥 Repository Health Score: **91.0 / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > 300, Complexity > 10, Fan-Out > 15).
*   **Total Graph Files**: 131
*   **Measured Files**: 131
*   **Unmeasured Files**: 0

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/features/board/components/HexOverlays.tsx` | **87.2** | 148 | 19 | 9 | 0.82 |
| `src/game/Game.ts` | **85.9** | 130 | 9 | 18 | 0.95 |
| `src/game/moves/execution.ts` | **85.2** | 114 | 20 | 8 | 0.89 |
| `src/features/board/components/HexEdges.tsx` | **78.5** | 140 | 11 | 12 | 0.92 |
| `src/features/game/GameLayout.tsx` | **77.5** | 210 | 7 | 12 | 0.92 |
| `src/bots/logic/OptimalMoveFilter.ts` | **76.6** | 228 | 10 | 8 | 0.89 |
| `src/game/analysis/coach.ts` | **75.5** | 209 | 11 | 12 | 0.43 |
| `src/game/analysis/advisors/SpatialAdvisor.ts` | **71.8** | 211 | 7 | 10 | 0.83 |
| `src/game/ai/search/MctsEngine.ts` | **69.8** | 198 | 7 | 9 | 0.9 |
| `src/pages/GamePage.tsx` | **69.6** | 94 | 11 | 10 | 0.91 |

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
| `src/game/moves/execution.ts` | **20** | 114 |
| `src/features/board/components/HexOverlays.tsx` | **19** | 148 |
| `src/features/board/components/HexEdges.tsx` | **11** | 140 |
| `src/features/hud/components/GameNotification.tsx` | **11** | 73 |
| `src/game/analysis/coach.ts` | **11** | 209 |
| `src/game/core/utils/sanitize.ts` | **11** | 73 |
| `src/game/rules/validator.ts` | **11** | 75 |
| `src/pages/GamePage.tsx` | **11** | 94 |
| `src/bots/logic/MoveScorer.ts` | **10** | 80 |
| `src/bots/logic/OptimalMoveFilter.ts` | **10** | 228 |
