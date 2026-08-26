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

- `complexity-metrics.json` is machine-readable evidence for tooling.
- `complexity-report.md` is the human-readable complexity and hotspot report.
- `analysis-bundle.json` is the validated combined analysis output.

Regenerate this evidence through [`.github/workflows/maritime-comparison.yml`](../.github/workflows/maritime-comparison.yml). The workflow builds and packs Dependency Maritime, installs that tarball with `npm install --no-save`, runs `npm run analyze:maritime`, and commits updated `.maritime/` outputs for same-repository pull requests. Do not edit those generated files manually.

`npm run analyze:maritime` is intentionally not available immediately after `./scripts/setup.sh`: Maritime is not a permanent Catan dependency.

### Local reproduction

When you need to reproduce the workflow locally, first build and pack Dependency Maritime, then install that tarball into this repository without saving it:

```bash
# In a Dependency Maritime checkout
npm ci
npm run build:cli
npm pack --pack-destination /tmp/maritime-package

# In this repository
npm install --no-save /tmp/maritime-package/dependency-maritime-cli-*.tgz
npm run analyze:maritime
```

---

## 🧭 Dependency Rules and Diagrams

These npm scripts remain the local source for architecture-rule verification and dependency diagrams:

```bash
npm run check:arch
npm run generate:json
npm run generate:dot
npm run generate:graph
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the architectural boundaries those checks enforce.
