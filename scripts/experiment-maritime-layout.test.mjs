import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  LAYOUT_VARIANTS,
  assertSvgCompatibility,
  generateDot,
  inspectSvg,
  recursiveFolderNamespaces,
  renderCandidate,
  retainedLocalModulePaths,
} from './experiment-maritime-layout.mjs';

test('compact baseline renders sorted local modules, local edges, and recursive clusters', () => {
  const artifact = {
    modules: [
      { source: 'src/z.ts', dependencies: [{ resolved: 'src/deep/a.ts' }, { resolved: 'node_modules/pkg/index.js' }] },
      { source: 'node_modules/pkg/index.js', dependencies: [] },
      { source: 'src/deep/a.ts', dependencies: [] },
    ],
  };
  const dot = generateDot(artifact, 'compact');

  assert.match(dot, /rankdir=LR/);
  assert.match(dot, /nodesep=0\.1, ranksep=0\.12/);
  assert.match(dot, /subgraph "cluster_src" \{[\s\S]*tooltip="src";[\s\S]*subgraph "cluster_src\/deep" \{[\s\S]*tooltip="src\/deep";/);
  assert.match(dot, /module_0 \[label="a\.ts", tooltip="src\/deep\/a\.ts"/);
  assert.match(dot, /module_1 \[label="z\.ts", tooltip="src\/z\.ts"/);
  assert.match(dot, /module_1 -> module_0;/);
  assert.doesNotMatch(dot, /node_modules|pkg|newrank/);
  assert.equal(generateDot(artifact, 'compact'), dot);
});

test('rejects artifacts without a modules array', () => {
  assert.throws(() => generateDot({}), /modules array/);
});

test('compact-no-src-wrapper removes only the redundant source-root cluster', () => {
  const artifact = { modules: [
    { source: 'src/root.ts', dependencies: [] },
    { source: 'src/deep/a.ts', dependencies: [] },
  ] };
  const dot = generateDot(artifact, 'compact-no-src-wrapper');

  assert.doesNotMatch(dot, /subgraph "cluster_src" \{/u);
  assert.match(dot, /subgraph "cluster_src\/deep" \{/u);
  assert.match(dot, /tooltip="src\/deep"/u);
  assert.deepEqual(recursiveFolderNamespaces(artifact, 'compact-no-src-wrapper'), ['src/deep']);
});

test('compact-production-filter excludes tests, specs, __tests__, and the historical testUtils support utility', () => {
  const artifact = { modules: [
    { source: 'src/app.ts', dependencies: [] },
    { source: 'src/app.test.ts', dependencies: [] },
    { source: 'src/feature.spec.tsx', dependencies: [] },
    { source: 'src/__tests__/fixture.ts', dependencies: [] },
    { source: 'src/game/testUtils.ts', dependencies: [] },
  ] };

  assert.deepEqual(retainedLocalModulePaths(artifact, 'compact-production-filter'), ['src/app.ts']);
  const dot = generateDot(artifact, 'compact-production-filter');
  assert.match(dot, /app\.ts/u);
  assert.doesNotMatch(dot, /testUtils|\.test\.|\.spec\.|__tests__/u);
});

test('compact-edge-hierarchy de-emphasizes exclusively type-only edges but keeps runtime pairs primary', () => {
  const artifact = { modules: [
    { source: 'src/a.ts', dependencies: [
      { resolved: 'src/b.ts', dependencyTypes: ['local', 'type-only', 'import'] },
      { resolved: 'src/c.ts', dependencyTypes: ['local', 'import'] },
      { resolved: 'src/c.ts', dependencyTypes: ['local', 'type-only', 'export'] },
    ] },
    { source: 'src/b.ts', dependencies: [] },
    { source: 'src/c.ts', dependencies: [] },
  ] };
  const dot = generateDot(artifact, 'compact-edge-hierarchy');

  assert.match(dot, /module_0 -> module_1 \[style="dashed", color="#aaaaaa", penwidth=0\.8\];/u);
  assert.match(dot, /module_0 -> module_2;/u);
  assert.doesNotMatch(dot, /module_0 -> module_2 \[/u);
});

test('compact-cluster-packing repeats folder declarations per module like the historical dependency-cruiser DOT', () => {
  const artifact = { modules: [
    { source: 'src/a.ts', dependencies: [] },
    { source: 'src/b.ts', dependencies: [] },
  ] };
  const baseline = generateDot(artifact, 'compact');
  const packed = generateDot(artifact, 'compact-cluster-packing');

  assert.equal(baseline.match(/subgraph "cluster_src"/gu)?.length, 1);
  assert.equal(packed.match(/subgraph "cluster_src"/gu)?.length, 2);
});

test('compact-reference-spacing changes only spacing to the historical values', () => {
  const artifact = { modules: [] };
  const baseline = generateDot(artifact, 'compact');
  const spaced = generateDot(artifact, 'compact-reference-spacing');

  assert.match(baseline, /nodesep=0\.1, ranksep=0\.12/u);
  assert.match(spaced, /nodesep=0\.16, ranksep=0\.18/u);
});

test('exposes a compact baseline plus one-change-at-a-time variants', () => {
  assert.deepEqual(Object.keys(LAYOUT_VARIANTS), [
    'compact',
    'compact-no-src-wrapper',
    'compact-production-filter',
    'compact-edge-hierarchy',
    'compact-cluster-packing',
    'compact-reference-spacing',
  ]);
  for (const variant of Object.keys(LAYOUT_VARIANTS)) {
    const dot = generateDot({ modules: [] }, variant);
    assert.match(dot, /strict digraph dependencies/u);
    assert.match(dot, /rankdir=LR/u);
    assert.doesNotMatch(dot, /, size=|, ratio=/u);
  }
});

test('rejects a rendered SVG that loses a retained local edge', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'maritime-layout-'));
  try {
    const input = path.join(directory, 'input.json');
    const output = path.join(directory, 'candidate.svg');
    const fakeDot = path.join(directory, 'dot');
    writeFileSync(input, JSON.stringify({ modules: [
      { source: 'src/a.ts', dependencies: [{ resolved: 'src/b.ts' }] },
      { source: 'src/b.ts', dependencies: [] },
    ] }));
    writeFileSync(fakeDot, `#!/bin/sh\nprintf '%s' '<svg width="10pt" height="20pt"><g id="clust1" class="cluster"><title>cluster_src</title></g><g id="node1" class="node"></g><g id="node2" class="node"></g></svg>'\n`, { mode: 0o755 });

    assert.throws(() => renderCandidate(input, output, fakeDot, undefined, 'compact'), /lost graph elements.*0 edges/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('layout reference is optional and measurement-only', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'maritime-layout-'));
  try {
    const input = path.join(directory, 'input.json');
    const output = path.join(directory, 'candidate.svg');
    const fakeDot = path.join(directory, 'dot');
    writeFileSync(input, JSON.stringify({ modules: [{ source: 'src/a.ts', dependencies: [] }] }));
    writeFileSync(fakeDot, `#!/bin/sh\nprintf '%s' '<svg width="10pt" height="20pt"><g id="clust1" class="cluster"><title>cluster_src</title></g><g id="node1" class="node"></g></svg>'\n`, { mode: 0o755 });

    const result = renderCandidate(input, output, fakeDot, undefined, 'compact');
    assert.equal(result.reference, undefined);
    assert.deepEqual(
      { ...result.candidate, namespaces: undefined },
      { width: 10, height: 20, aspectRatio: 0.5, nodes: 1, edges: 0, clusters: 1, namespaces: undefined },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('retains the canonical compact artifact module, edge, and cluster detail', () => {
  const artifact = JSON.parse(readFileSync('.maritime/dependency-graph.json', 'utf8'));
  const dot = generateDot(artifact, 'compact');

  assert.equal(dot.match(/module_\d+ \[label=.*tooltip=/gu)?.length, 115);
  assert.equal(dot.match(/ -> /gu)?.length, 357);
  assert.equal(dot.match(/subgraph "cluster_/gu)?.length, 41);
});

test('the production-filter variant removes the remaining support utility from canonical evidence', () => {
  const artifact = JSON.parse(readFileSync('.maritime/dependency-graph.json', 'utf8'));
  assert.equal(retainedLocalModulePaths(artifact, 'compact-production-filter').length, 114);
  assert.doesNotMatch(generateDot(artifact, 'compact-production-filter'), /testUtils\.ts/u);
});

test('inspects the committed acceptance SVGs rather than inferring visual output from DOT', () => {
  const reference = inspectSvg(readFileSync('docs/images/dependency-graph.reference.svg', 'utf8'));
  const beta7 = inspectSvg(readFileSync('docs/images/dependency-graph.svg', 'utf8'));

  assert.deepEqual({ ...reference, namespaces: undefined }, { width: 1566, height: 3537, aspectRatio: 1566 / 3537, nodes: 113, edges: 351, clusters: 41, namespaces: undefined });
  assert.deepEqual({ ...beta7, namespaces: undefined }, { width: 1080, height: 666, aspectRatio: 1080 / 666, nodes: 20, edges: 63, clusters: 0, namespaces: undefined });
  assert.equal(reference.namespaces.length, 41);
});

test('uses the reference SVG as an executable self-compatible baseline', () => {
  const referenceSvg = readFileSync('docs/images/dependency-graph.reference.svg', 'utf8');
  const reference = inspectSvg(referenceSvg);
  assert.doesNotThrow(() => assertSvgCompatibility(referenceSvg, referenceSvg, {
    moduleCount: reference.nodes,
    namespaces: reference.namespaces,
  }));
});
