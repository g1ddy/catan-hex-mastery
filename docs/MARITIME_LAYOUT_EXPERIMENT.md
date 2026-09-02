# Maritime Layout Compatibility Experiment

## Goal

Reproduce the information density and hierarchy of Catan's historical dependency diagram from canonical Maritime evidence, while using Maritime rather than repository-owned DOT generation.

This is a **layout compatibility** experiment. It must not reduce the graph to a small folder-only overview.

## Reference inputs

- `docs/images/dependency-graph.reference.svg` — immutable visual reference copied from Catan commit `3bbac70d2de6dd3590bcb2c1f2710e68f5f6a871`.
- `docs/images/dependency-graph.svg` — current beta.7 `compact-architecture` output. Keep it intact for side-by-side comparison.
- `.maritime/dependency-graph.json` — canonical dependency evidence. Derive the candidate only from this artifact; do not revive Catan-owned dependency scanning or maintain a hand-written DOT file.

The reference has 113 module nodes, 351 edges, 41 nested folder clusters, and a 1566 × 3537 pt portrait canvas. The beta.6 migration had approximately the same topology (115 nodes / 358 edges) but produced a 5416 × 1704 pt panoramic layout. Beta.7 reduced it to 20 folder nodes / 63 edges, which is too abstract for Catan's desired architecture map.

## Required deliverables

1. Check in a deterministic, locally runnable script under `scripts/` (for example, `scripts/experiment-maritime-layout.mjs`).
2. The script must read the Maritime artifact and invoke Graphviz `dot`; document its command and prerequisites in the script header.
3. Generate a candidate SVG at a clearly separate path, such as `docs/images/dependency-graph.candidate.svg`. Do not overwrite either reference SVG during the experiment.
4. Keep the script generic: no Catan folder names, module names, or hand-positioned nodes. It should be suitable to move upstream into Dependency Maritime.
5. Explain any Maritime renderer inputs or missing generic capability that the experiment exposes.

## Acceptance criteria

- Preserve module-level detail: candidate node and edge counts should closely track canonical local production evidence rather than beta.7's 20-folder-node aggregate.
- Preserve nested folder hierarchy: the SVG must include recursive folder clusters comparable to the reference's 41 clusters.
- Produce a readable portrait/TB architecture map. Aim to stay near the reference aspect ratio and avoid beta.6's very wide panoramic layout.
- Exclude external-package nodes and dependency-kind labels, as Catan's desired graph does.
- Use deterministic ordering and output: repeated runs on the same artifact must produce the same SVG.
- Preserve the canonical `.maritime/dependency-graph.json` unchanged.
- Do not change Catan production code, dependency rules, or manually recreate the original DOT graph.

## Evaluation

Compare these three files side by side:

1. `docs/images/dependency-graph.reference.svg` — historical target.
2. `docs/images/dependency-graph.svg` — current published beta.7 output.
3. `docs/images/dependency-graph.candidate.svg` — experimental compatibility result.

The success criterion is not an exact pixel match. It is a generic Maritime-driven graph that retains the reference diagram's module-level, nested-hierarchy readability without the beta.6 panoramic expansion.

## Local candidate renderer

With Graphviz `dot` on `PATH`, render the candidate from the already-generated evidence:

```bash
node scripts/experiment-maritime-layout.mjs \
  .maritime/dependency-graph.json \
  docs/images/dependency-graph.candidate.svg \
  --reference docs/images/dependency-graph.reference.svg
```

The renderer selects every non-`node_modules` module in the artifact, retains only edges whose resolved endpoints are in that local module set, and builds recursive clusters from path segments. Stable path sorting assigns opaque node and cluster IDs, so neither repository-specific names nor layout coordinates are encoded in the renderer. Dependency kinds are deliberately not emitted.

The `--reference` comparison is optional: omit it when moving the renderer upstream or using custom input and output paths. After Graphviz succeeds, the command inspects the generated SVG itself—not merely the DOT—and prints its point dimensions, aspect ratio, and rendered node, edge, and cluster counts. It rejects an SVG that loses retained-local edges, module nodes, or recursive clusters and writes the candidate atomically.

Then create the required equal-width visual comparison. This helper fails unless all three SVGs exist and both Inkscape and ImageMagick are installed:

```bash
node scripts/render-maritime-layout-previews.mjs
```

It writes individual PNGs plus `docs/images/layout-previews/comparison.png`, ordered reference, beta.7, candidate. Inspect that combined image for portrait orientation, label legibility, cluster nesting, edge congestion, and unused whitespace. A candidate is not accepted or described as layout-compatible until both the SVG metrics and this side-by-side preview have been reviewed.

The experiment uses `rankdir=TB` with tight `nodesep` and `ranksep`, but deliberately omits Graphviz's global `newrank=true`. The comparison exposes a missing Maritime profile capability: a supported module-detail renderer needs cluster-local rank controls (and tunable spacing) that do not flatten nested clusters into one global ranking problem. Those generic renderer inputs should move upstream before this becomes a production Maritime profile; the script remains an isolated compatibility experiment and does not replace `npm run generate:graph`.
