# Maritime Compact Profile Experiment

## Goal

Use Catan as a local proving ground for what Maritime's compact architecture profile should become before moving the behavior upstream.

The target is the hierarchy and visual language of Catan's historical dependency-cruiser diagram while remaining derived from canonical Maritime evidence. Compact should remain a **file-level, local-only LR graph with nested folders**, not a collapsed summary.

## Reference inputs

- `docs/images/dependency-graph.reference.svg` — immutable historical target.
- `docs/images/dependency-graph.svg` — current Maritime beta.7 `compact-architecture` output.
- `.maritime/dependency-graph.json` — canonical dependency evidence used by every experiment.

The historical reference has 113 nodes, 351 edges, and 41 nested clusters. The current Maritime evidence contains 115 local modules and 357 unique local relationships.

## What earlier experiments established

The one-change-at-a-time pass found that omitting only the redundant outer `src` wrapper produced the closest overall silhouette to the historical reference. Its aspect ratio was nearly identical to the reference.

A later combined experiment added production filtering and historical `.16/.18` spacing on top of that. That combination became too tall, so the historical spacing is no longer part of the favored base geometry. Repeated dependency-cruiser-style cluster emission also did not materially improve the outer geometry.

The current focused pass therefore returns to the winning no-`src` geometry and tests visual semantics instead.

## Recovered historical visual semantics

The old graph used dependency-cruiser's semantic DOT theme rather than folder-based source coloring.

Important recovered rules include:

- orphan modules: `#ccffcc`;
- `.ts`, `.mts`, `.cts`, and `.d.ts`: `#ddfeff`;
- `.tsx`: `#bbfeff`;
- `.json`: `#ffee44`;
- `.jsx`: `#ffff77`;
- unmatched modules: `#ffffcc`;
- folder clusters: black 2pt borders, bold black Helvetica 9pt labels, rounded/bold/filled white styling;
- default edges: `#00000033`, 2pt;
- dynamic dependencies: dashed;
- type-only / pre-compilation-only dependencies: thinner, dashed gray edges with open arrowheads.

`src/vite-env.d.ts` is green in the reference because dependency-cruiser marks it as an orphan; the orphan rule takes precedence over its TypeScript extension color.

## Focused variants

The generated-artifacts workflow now renders exactly four candidates:

| Variant | Delta | Purpose |
| --- | --- | --- |
| `candidate-compact-no-src-reference-colors.svg` | no-`src` geometry + dependency-cruiser semantic node colors | Is semantic coloring itself the missing visual signal? |
| `candidate-compact-no-src-reference-theme.svg` | above + reference-like folder cluster styling | Does restoring border/title weight materially improve fidelity? |
| `candidate-compact-no-src-reference-theme-edges.svg` | above + reference-like edge styling | Closest overall candidate: geometry + semantic colors + cluster + edge language. |
| `candidate-compact-no-src-reference-theme-production.svg` | above + test/spec/`testUtils` filter | Does production-only content improve or hurt the historical match? |

All four intentionally retain current compact spacing (`nodesep=0.10`, `ranksep=0.12`, cluster margin `4`) and omit the redundant `src` wrapper.

## Validation

`npm run test:layout` verifies both graph structure and reference semantics. In particular it checks:

- local file nodes and recursive namespaces are retained;
- the outer `src` cluster is omitted;
- `vite-env.d.ts` renders orphan green;
- representative `.ts`, `.tsx`, and `.json` files use the recovered dependency-cruiser palette;
- reference-theme variants use black 2pt clusters with bold titles and white rounded fill;
- edge-theme variants use 2pt translucent edges and de-emphasize type-only relationships;
- the production variant removes test/spec/support-only presentation noise;
- rendered SVG node/edge/cluster counts remain consistent with canonical Maritime evidence.

## Local usage

With Graphviz `dot` on `PATH`:

```bash
node scripts/experiment-maritime-layout.mjs \
  .maritime/dependency-graph.json \
  docs/images/dependency-graph.candidate-compact-no-src-reference-theme-edges.svg \
  --layout-reference docs/images/dependency-graph.reference.svg \
  --variant compact-no-src-reference-theme-edges
```

Run tests with:

```bash
npm run test:layout
```

Render an equal-width visual comparison grid with:

```bash
node scripts/render-maritime-layout-previews.mjs
```

## Upstream interpretation

If the reference-theme-edge candidate wins, the likely Maritime compact-profile direction is:

- file-level local nodes;
- nested folder groups;
- LR direction;
- external packages omitted;
- redundant source-root cluster omitted when there is one obvious source root;
- semantic module coloring based on canonical graph metadata and file type;
- reference-like cluster/edge hierarchy built into the profile;
- source filtering configurable rather than hard-coded per repository.

Catan should remain a temporary proving ground only. Once the winning behavior is clear, move it into Dependency Maritime and return Catan to consuming the upstream profile.
