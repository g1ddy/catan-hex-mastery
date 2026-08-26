# Code Complexity & Health Metrics

To maintain a maintainable and scalable codebase, we track code complexity using a **Compound Complexity Score**. This document defines our metric thresholds and how to locate or regenerate automated complexity evidence.

---

## 📊 Complexity Dimensions & Warning Thresholds

We evaluate source files in `src/` across five dimensions:

| Dimension | Metric | Warning Threshold | Description |
| :--- | :--- | :--- | :--- |
| **Length** | **LOC** (Lines of Code) | > 300 LOC | Total lines in a file. |
| **Coupling** | **Fan-Out** (Dependencies) | > 15 Imports | Number of modules this file depends on. |
| **Stability** | **Instability (I)** | 0.30 – 0.70 | $I = \frac{\text{Fan-Out}}{\text{Fan-In} + \text{Fan-Out}}$. The "Zone of Pain" represents modules with moderate stability that change for many reasons while impacting many dependents. |
| **Logic** | **Cyclomatic Complexity** | > 10 | Maximum cyclomatic complexity of functions within the file (ESLint). |
| **Testability** | **Test Coverage** | < 80% | Percentage of covered statements and paths. |

---

## 🛠️ How to Generate & Verify Canonical Evidence

Complexity and architectural evidence is generated programmatically to prevent stale manual documentation.

### 1. Calculate Automated Complexity Metrics
Run the script to analyze line count, cyclomatic complexity, coupling, and update the automated report at the bottom of this file:

```bash
# Ensure dependency graph artifact is generated first
pnpm generate:json

# Calculate metrics and update the automated section below
pnpm calculate:complexity
```

### 2. Verify Architecture Boundaries
Run `dependency-cruiser` to enforce directional architectural rules:

```bash
pnpm check:arch
```

### 3. Analyze Maritime Metrics
Run the maritime analysis suite for comprehensive structural measurement:

```bash
pnpm analyze:maritime
```

---


## 🚨 Automated Complexity Report

**Last Updated:** 2026-08-26

### 🏥 Repository Health Score: **93.0 / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > 300, Complexity > 10, Fan-Out > 15).
*   **Total Files Scanned**: 113

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/features/board/components/HexOverlays.tsx` | **82.4** | 148 | 19 | 7 | 0.78 |
| `src/game/Game.ts` | **76.8** | 121 | 9 | 14 | 0.93 |
| `src/bots/logic/OptimalMoveFilter.ts` | **76.6** | 228 | 10 | 8 | 0.89 |
| `src/features/board/components/HexEdges.tsx` | **76.3** | 140 | 11 | 11 | 0.92 |
| `src/game/analysis/coach.ts` | **73** | 209 | 11 | 11 | 0.41 |
| `src/game/analysis/advisors/SpatialAdvisor.ts` | **69.5** | 211 | 7 | 9 | 0.82 |
| `src/game/analysis/advisors/RoadAdvisor.ts` | **68.4** | 233 | 8 | 6 | 0.86 |
| `src/features/hud/components/GameControls.tsx` | **66.6** | 122 | 10 | 9 | 0.82 |
| `src/features/game/GameLayout.tsx` | **66.5** | 210 | 7 | 7 | 0.88 |
| `src/game/rules/queries.ts` | **66.2** | 234 | 9 | 7 | 0.54 |

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
| `src/features/board/components/HexOverlays.tsx` | **19** | 148 |
| `src/pages/GamePage.tsx` | **11** | 94 |
| `src/game/analysis/coach.ts` | **11** | 209 |
| `src/features/board/components/HexEdges.tsx` | **11** | 140 |
| `src/features/hud/components/GameNotification.tsx` | **11** | 73 |
| `src/game/core/utils/sanitize.ts` | **11** | 73 |
| `src/game/rules/validator.ts` | **11** | 75 |
| `src/bots/CatanBot.ts` | **10** | 112 |
| `src/bots/logic/MoveScorer.ts` | **10** | 80 |
| `src/bots/logic/OptimalMoveFilter.ts` | **10** | 228 |
