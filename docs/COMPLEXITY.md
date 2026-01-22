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
