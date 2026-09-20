## 🚨 Automated Complexity Report

### 📐 Architectural Folder Coupling & Instability Metrics
| Folder / Namespace | Modules | Afferent ($C_a$) | Efferent ($C_e$) | Instability ($I$) |
| :--- | :--- | :--- | :--- | :--- |
| `src` | 4 | 1 ($C_a$) | 7 ($C_e$) | **0.875** |
| `src/adapters` | 5 | 9 ($C_a$) | 4 ($C_e$) | **0.308** |
| `src/bots` | 13 | 3 ($C_a$) | 16 ($C_e$) | **0.842** |
| `src/features/board` | 13 | 1 ($C_a$) | 14 ($C_e$) | **0.933** |
| `src/features/coach` | 11 | 4 ($C_a$) | 10 ($C_e$) | **0.714** |
| `src/features/game` | 7 | 1 ($C_a$) | 19 ($C_e$) | **0.95** |
| `src/features/hud` | 18 | 3 ($C_a$) | 12 ($C_e$) | **0.8** |
| `src/features/shared` | 8 | 27 ($C_a$) | 1 ($C_e$) | **0.036** |
| `src/game` | 60 | 50 ($C_a$) | 1 ($C_e$) | **0.02** |
| `src/pages` | 2 | 1 ($C_a$) | 4 ($C_e$) | **0.8** |
| `src/styles` | 2 | 2 ($C_a$) | 0 ($C_e$) | **0** |


**Last Updated:** 2026-09-20

### 🏥 Repository Health Score: **87.0 / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > 300, Complexity > 10, Fan-Out > 15).
*   **Total Graph Files**: 140
*   **Measured Files**: 140
*   **Unmeasured Files**: 0

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/bots/BotCoach.ts` | **92.1** | 194 | 13 | 14 | 0.93 |
| `src/features/board/components/HexOverlays.tsx` | **87.2** | 148 | 19 | 9 | 0.82 |
| `src/game/Game.ts` | **85.9** | 130 | 9 | 18 | 0.95 |
| `src/game/moves/execution.ts` | **85.2** | 114 | 20 | 8 | 0.89 |
| `src/game/analysis/spatialAnalysis.ts` | **79.4** | 271 | 14 | 5 | 0.71 |
| `src/features/board/components/HexEdges.tsx` | **78.5** | 140 | 11 | 12 | 0.92 |
| `src/features/game/GameLayout.tsx` | **77.5** | 210 | 7 | 12 | 0.92 |
| `src/bots/logic/OptimalMoveFilter.ts` | **76.6** | 228 | 10 | 8 | 0.89 |
| `src/game/analysis/coach.ts` | **75.5** | 209 | 11 | 12 | 0.43 |
| `src/game/analysis/probability.ts` | **72.1** | 188 | 16 | 4 | 0.67 |

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
| `src/game/moves/execution.ts` | **20** | 114 |
| `src/features/board/components/HexOverlays.tsx` | **19** | 148 |
| `src/game/analysis/probability.ts` | **16** | 188 |
| `src/game/analysis/spatialAnalysis.ts` | **14** | 271 |
| `src/bots/BotCoach.ts` | **13** | 194 |
| `src/game/ai/catan/CatanRolloutPolicy.ts` | **12** | 93 |
| `src/features/board/components/HexEdges.tsx` | **11** | 140 |
| `src/features/hud/components/GameNotification.tsx` | **11** | 73 |
| `src/game/analysis/coach.ts` | **11** | 209 |
| `src/game/core/utils/sanitize.ts` | **11** | 73 |
