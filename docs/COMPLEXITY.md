# Code Complexity & Health Metrics

This document defines the repository's complexity measures and thresholds. The current, authoritative measurements are the generated Maritime evidence in [`.maritime/`](../.maritime/), not a hand-maintained report embedded in this guide.

---

## 📊 Complexity Dimensions & Warning Thresholds

The Maritime bundle evaluates source files in `src/` across four dimensions:

| Dimension | Metric | Warning Threshold | Description |
| :--- | :--- | :--- | :--- |
| **Length** | **LOC** (Lines of Code) | > 300 LOC | Total lines in a file. |
| **Coupling** | **Fan-Out** (Dependencies) | > 15 Imports | Number of measured local modules this file depends on. |
| **Stability** | **Instability (I)** | 0.30 – 0.70 | $I = \frac{\text{Fan-Out}}{\text{Fan-In} + \text{Fan-Out}}$. Modules in this range may change for many reasons while also affecting many dependents. |
| **Logic** | **Cyclomatic Complexity** | > 10 | Maximum cyclomatic complexity of functions within the file (ESLint). |

---

## 🛠️ Canonical Maritime Evidence

The tracked files in [`.maritime/`](../.maritime/) are the authoritative generated bundle:

- `complexity-metrics.json` is machine-readable per-file evidence for tooling.
- `complexity-report.md` is the human-readable complexity and hotspot report.
- `dependency-graph.json` is the machine-readable dependency graph used to derive structural metrics.
- `manifest.json` is the versioned bundle manifest and validation envelope.

For regeneration and local reproduction, follow the generated-evidence workflow in [DEVELOPMENT.md](./DEVELOPMENT.md). Do not edit these generated files manually.


## 🚨 Automated Complexity Report

**Last Updated:** 2026-08-29

### 🏥 Repository Health Score: **91.0 / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > 300, Complexity > 10, Fan-Out > 15).
*   **Total Files Scanned**: 114

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/features/board/components/HexOverlays.tsx` | **89.5** | 148 | 19 | 10 | 0.83 |
| `src/features/board/components/HexEdges.tsx` | **80.6** | 140 | 11 | 13 | 0.93 |
| `src/bots/logic/OptimalMoveFilter.ts` | **78.8** | 228 | 10 | 9 | 0.9 |
| `src/features/game/GameLayout.tsx` | **77.5** | 210 | 7 | 12 | 0.92 |
| `src/game/Game.ts` | **77.3** | 121 | 9 | 16 | 0.76 |
| `src/game/analysis/coach.ts` | **74.2** | 209 | 11 | 12 | 0.36 |
| `src/game/analysis/advisors/SpatialAdvisor.ts` | **70.5** | 211 | 7 | 10 | 0.77 |
| `src/pages/GamePage.tsx` | **69.6** | 94 | 11 | 10 | 0.91 |
| `src/game/rules/queries.ts` | **68.8** | 234 | 9 | 8 | 0.57 |
| `src/features/hud/components/GameControls.tsx` | **67.6** | 122 | 10 | 10 | 0.77 |

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
