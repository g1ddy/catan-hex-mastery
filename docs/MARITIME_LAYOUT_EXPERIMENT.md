# Maritime Compact Profile Experiment

## Goal

Use Catan as a local proving ground for what Maritime's compact architecture profile should become before moving the behavior upstream.

The target is the information density and hierarchy of Catan's historical dependency diagram, but the graph must remain derived from canonical Maritime evidence. Compact should be a **file-level, local-only LR architecture graph with nested folders and restrained spacing**, not a collapsed folder summary.

## Reference inputs

- `docs/images/dependency-graph.reference.svg` — immutable historical target copied from Catan commit `3bbac70d2de6dd3590bcb2c1f2710e68f5f6a871`.
- `docs/images/dependency-graph.svg` — current published beta.7 `compact-architecture` output. Keep it intact for comparison.
- `.maritime/dependency-graph.json` — canonical dependency evidence. Every local experiment must derive from this artifact; do not revive repository-owned dependency scanning or maintain a hand-written DOT file.

The reference has 113 module nodes, 351 rendered edges, and 41 nested folder clusters. The current Maritime evidence retains 115 local modules and 357 unique local source/target relationships. Beta.7's compact profile reduces that to 20 folder nodes and 63 edges, which is too abstract for Catan's intended architecture map.

## Historical behaviors worth recovering

Catan's old dependency-cruiser graph configuration provides concrete evidence for the desired profile:

- `rankdir=LR`.
- local `src` modules only; external packages were not part of the architecture map.
- tests/specs and `testUtils.ts` were excluded from the graph.
- TypeScript pre-compilation dependencies were de-emphasized with dashed gray edges.
- spacing used `nodesep=0.16` and `ranksep=0.18`.
- dependency-cruiser's DOT repeatedly reopened folder clusters around each file instead of emitting one complete folder tree in a single block. Graphviz therefore had different packing freedom even though the visible hierarchy resolved to the same folder namespaces.

Those are more useful experiments than arbitrary spline or whitespace presets.

## Compact baseline

`compact` is the control. It intentionally fixes the decisions that are already settled for this experiment:

- individual source-file nodes are retained;
- recursive folder groups are retained;
- direction is LR;
- external packages are excluded;
- Graphviz uses its natural canvas — the historical SVG is never used to force `size` or `ratio`;
- current compact spacing remains `nodesep=0.10`, `ranksep=0.12`, cluster margin `4`;
- current full-tree cluster emission and uniform edge styling remain unchanged.

The published beta.7 `docs/images/dependency-graph.svg` remains the summary-view comparator, so there is no value in creating another local “collapsed” variant.

## One-change-at-a-time variants

The generated-artifacts workflow renders and commits these files:

| Variant | Single delta from `compact` | Question it answers |
| --- | --- | --- |
| `candidate-compact.svg` | none | What does the current file-level compact baseline look like? |
| `candidate-compact-no-src-wrapper.svg` | omit only the redundant outer `src` cluster | Does exposing `bots`, `features`, `game`, etc. as the visual roots improve hierarchy and packing? |
| `candidate-compact-production-filter.svg` | apply the historical test/spec/`testUtils.ts` presentation filter | How much incidental support-code noise remains? |
| `candidate-compact-edge-hierarchy.svg` | render exclusively type-only relationships thin/dashed | Does emphasizing runtime imports make the architecture easier to read? |
| `candidate-compact-cluster-packing.svg` | emit repeated per-file folder clusters like the old dependency-cruiser DOT | Does historical cluster emission materially improve Graphviz routing/packing? |
| `candidate-compact-reference-spacing.svg` | use only the historical spacing: `.16` / `.18` / margin `6` | Is the old spacing a better density/readability tradeoff? |

The current Maritime evidence configuration already excludes `*.test.*`, `*.spec.*`, and `__tests__` modules before the renderer sees the artifact. Consequently, the production-filter variant currently demonstrates the remaining support-utility difference most visibly through `src/game/testUtils.ts`. A future Maritime source filter must be configurable rather than hard-coded to that filename.

The edge-hierarchy experiment uses the canonical dependency metadata already present in `.maritime/dependency-graph.json`. If a source/target pair has any runtime relationship, it remains primary; a pair is dashed only when all retained relationships between those files are `type-only`. This avoids turning duplicate type/runtime evidence into extra visual edges.

## Local usage

With Graphviz `dot` on `PATH`, render the baseline:

```bash
node scripts/experiment-maritime-layout.mjs \
  .maritime/dependency-graph.json \
  docs/images/dependency-graph.candidate-compact.svg \
  --variant compact
```

The historical reference is optional and measurement-only:

```bash
node scripts/experiment-maritime-layout.mjs \
  .maritime/dependency-graph.json \
  docs/images/dependency-graph.candidate-compact-reference-spacing.svg \
  --layout-reference docs/images/dependency-graph.reference.svg \
  --variant compact-reference-spacing
```

The renderer validates the generated SVG itself after Graphviz runs. Each variant must retain exactly the node, unique local edge, and visible folder-namespace counts implied by that variant's filtered canonical evidence. Repeated runs on the same evidence must remain deterministic.

Run the executable checks with:

```bash
npm run test:layout
```

Then render the visual comparison grid (requires Inkscape and ImageMagick):

```bash
node scripts/render-maritime-layout-previews.mjs
```

The grid is ordered reference, beta.7, compact baseline, no-src wrapper, production filter, edge hierarchy, cluster packing, and reference spacing. Review label legibility, folder hierarchy, edge congestion, routing length, and whitespace rather than raw pixel similarity.

## Upstream interpretation

The experiment should not turn Maritime into a bag of renderer knobs.

Reasonable profile/configuration inputs are:

- file-level folder grouping;
- LR direction as the compact architecture profile default;
- `includeExternal: false`;
- configurable presentation/source filters for tests, specs, generated files, and support utilities.

Renderer/profile implementation details should remain built in:

- de-emphasizing type-only/pre-compilation relationships while keeping runtime imports primary;
- the cluster-emission/packing strategy that produces a readable nested file graph;
- the profile's chosen compact spacing defaults.

Once the best local combination is clear, move those semantics into Dependency Maritime and return Catan to consuming the upstream compact profile rather than retaining this experiment as production graph code.
