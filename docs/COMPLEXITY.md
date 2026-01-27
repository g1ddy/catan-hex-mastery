# Code Complexity & Health Metrics

To maintain a maintainable and scalable codebase, we track code complexity using a **Compound Complexity Score**. This document defines how we measure complexity and provides a baseline for future comparisons.

## 📊 The 5 Dimensions of Complexity

We evaluate files based on these five dimensions:

| Dimension | Metric | Tool | Warning Threshold |
| :--- | :--- | :--- | :--- |
| **Length** | **LOC** (Lines of Code) | `wc -l` | > 300 LOC |
| **Coupling** | **Fan-Out** (Dependencies) | `dependency-cruiser` | > 10 Imports |
| **Stability** | **Instability (I)** | `dependency-cruiser` | 30% - 70% (The "Zone of Pain") |
| **Logic** | **Cyclomatic Complexity** | `eslint` | > 10 |
| **Testability** | **Test Coverage** | `jest` | < 80% |

### Definitions
*   **Instability (I)**: Calculated as $I = \frac{C_{efferent}}{C_{afferent} + C_{efferent}}$, where:
    *   $C_{efferent}$ (Fan-Out): Number of classes this file depends on.
    *   $C_{afferent}$ (Fan-In): Number of classes that depend on this file.
    *   $I=0$: Extremely stable (Foundation layer).
    *   $I=1$: Extremely volatile (Top-level logic).
    *   *Zone of Pain*: Middle values imply the file changes for many reasons AND breaks many things when it changes.

## 🛠️ How to Measure

### 1. Generate Metrics Report
Use `dependency-cruiser` to generate a comprehensive metrics report including Fan-In, Fan-Out, and Instability.

```bash
npx depcruise src --config config/dependency-cruiser.cjs --output-type metrics > complexity-report.txt
```

### 2. Check Line Counts (LOC)
Identify the largest files in the system.

```bash
find src -name "*.ts" -not -name "*.test.ts" | xargs wc -l | sort -n | tail -n 10
```

### 3. Check Cyclomatic Complexity
Run ESLint to find complex functions.

```bash
npx eslint src --rulesdir config/eslint-rules --no-eslintrc --rule 'complexity: ["warn", 10]'
```

---

## 📉 Complexity Baseline (Oct 2023 Refactor)

Following the "AI to Rules" refactor and "Split Coach" initiative, here are the current metrics.

### Significant Improvement (Coach Split)
| File | Metric | Before Split | After Split | Change |
| :--- | :--- | :--- | :--- | :--- |
| `src/game/analysis/coach.ts` | **LOC** | 355 | **160** | ▼ 55% |
| `src/game/analysis/coach.ts` | **Fan-Out** | 11 | **7** | ▼ 36% |
| `src/game/analysis/coach.ts` | **Instability** | 46% | **32%** | ▼ 14% |

### Refactoring Update (Namespace Restructure)
Following the "Namespace Restructure" refactor to align with directional layers (`Core`, `Geometry`, `Generation`):

| File | Metric | Value | Interpretation |
| :--- | :--- | :--- | :--- |
| `src/game/core/types.ts` | **Instability** | **0%** | Perfect Stability (Foundation). Referenced by 68 modules. |
| `src/game/geometry/math.ts` | **Instability** | **0%** | Perfect Stability. |
| `src/game/generation/boardGen.ts` | **Instability** | **57%** | Moderate. Depends on Core/Geometry, used by Game/Setup. |
| `src/game/rules/validator.ts` | **Instability** | **36%** | Healthy. Facade pattern successfully shields it. |

### Current Hotspots
| File | LOC | Responsibility | Risk |
| :--- | :--- | :--- | :--- |
| `src/bots/BotCoach.ts` | **266** | Bot Decision Weighting | **Medium**. Complex logic but focused scope. |
| `src/game/rules/queries.ts` | **245** | Availability Queries (Facade) | **Low**. High LOC but very low cyclomatic complexity. |
| `src/game/analysis/advisors/SpatialAdvisor.ts` | **209** | Spatial Scoring Logic | **Low**. Pure logic, well-encapsulated. |

### Structural Coupling (Dependency Cruiser)
| File | Fan-In | Fan-Out | Instability | Analysis |
| :--- | :--- | :--- | :--- | :--- |
| `src/game/analysis/coach.ts` | 15 | 7 | **32%** | **Stable**. Successfully refactored into a proper facade. |
| `src/game/rules/validator.ts` | 7 | 4 | 36% | **Healthy**. Refactor successfully reduced Fan-Out. |
| `src/game/Game.ts` | 5 | 17 | 77% | **Expected**. The entry point naturally has high Fan-Out. |

## 🎯 Future Targets

1.  **Monitor `BotCoach.ts`**:
    *   As bot personalities grow, this file risks becoming a monolith. Consider "Strategy Pattern" for personalities.
2.  **Monitor `SpatialAdvisor.ts`**:
    *   If this grows beyond 300 LOC, split into `SettlementScorer` and `CityScorer`.


## 🚨 Automated Complexity Report

**Last Updated:** 2026-01-27

### 🏥 Repository Health Score: **91.0 / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > 300, Complexity > 10, Fan-Out > 15).
*   **Total Files Scanned**: 98

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/features/board/components/HexOverlays.tsx` | **90.1** | 203 | 18 | 8 | 0.89 |
| `src/features/game/GameLayout.tsx` | **81.8** | 280 | 10 | 8 | 0.89 |
| `src/bots/BotCoach.ts` | **79.2** | 205 | 16 | 5 | 0.83 |
| `src/game/Game.ts` | **77.5** | 147 | 7 | 15 | 0.94 |
| `src/features/hud/hooks/useGameStatusMessage.ts` | **70.8** | 135 | 20 | 2 | 0.67 |
| `src/game/analysis/advisors/SpatialAdvisor.ts` | **66.5** | 210 | 7 | 7 | 0.88 |
| `src/game/rules/enumerator.ts` | **60.8** | 108 | 13 | 4 | 0.8 |
| `src/game/rules/queries.ts` | **60.3** | 234 | 7 | 6 | 0.55 |
| `src/features/hud/components/GameNotification.tsx` | **58.9** | 229 | 6 | 4 | 0.8 |
| `src/game/moves/setup.ts` | **58.9** | 89 | 7 | 9 | 0.9 |

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
| `src/features/hud/hooks/useGameStatusMessage.ts` | **20** | 135 |
| `src/bots/logic/MoveScorer.ts` | **18** | 72 |
| `src/features/board/components/HexOverlays.tsx` | **18** | 203 |
| `src/bots/BotCoach.ts` | **16** | 205 |
| `src/features/board/components/OverlayVertex.tsx` | **14** | 104 |
| `src/features/coach/hooks/useCoachData.ts` | **14** | 78 |
| `src/game/rules/enumerator.ts` | **13** | 108 |
| `src/features/hud/components/controls/TurnControls.tsx` | **11** | 77 |
| `src/features/hud/components/PlayerPanel.tsx` | **11** | 127 |
| `src/game/analysis/coach.ts` | **10** | 159 |
