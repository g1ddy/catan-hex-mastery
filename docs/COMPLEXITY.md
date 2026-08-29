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

### 🏥 Repository Health Score: **100.0 / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > 300, Complexity > 10, Fan-Out > 15).
*   **Total Files Scanned**: 0

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |


### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
