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

test('combined compact baseline applies the three promising structural overrides', () => {
  const artifact = {
    modules: [
      { source: 'src/z.ts', dependencies: [{ resolved: 'src/deep/a.ts' }, { resolved: 'node_modules/pkg/index.js' }] },
      { source: 'src/game/testUtils.ts', dependencies: [] },
      { source: 'node_modules/pkg/index.js', dependencies: [] },
      { source: 'src/deep/a.ts', dependencies: [] },
    ],
  };
  const dot = generateDot(artifact, 'compact-combined');

  assert.match(dot, /rankdir=LR/);
  assert.match(dot, /nodesep=0\.16, ranksep=0\.18/);
  assert.doesNotMatch(dot, /subgraph "cluster_src" \{/u);
  assert.match(dot, /subgraph "cluster_src\/deep" \{/u);
  assert.match(dot, /module_0 \[label="a\.ts", tooltip="src\/deep\/a\.ts"/u);
  assert.match(dot, /module_1 \[label="z\.ts", tooltip="src\/z\.ts"/u);
  assert.match(dot, /module_1 -> module_0;/u);
  assert.doesNotMatch(dot, /node_modules|testUtils/u);
});

test('rejects artifacts without a modules array', () => {
  assert.throws(() => generateDot({}), /modules array/);
});

test('combined compact retains recursive namespaces without the redundant source root', () => {
  const artifact = { modules: [
    { source: 'src/root.ts', dependencies: [] },
    { source: 'src/deep/a.ts', dependencies: [] },
  ] };

  assert.deepEqual(recursiveFolderNamespaces(artifact, 'compact-combined'), ['src/deep']);
});

test('combined compact excludes tests, specs, __tests__, and the historical testUtils support utility', () => {
  const artifact = { modules: [
    { source: 'src/app.ts', dependencies: [] },
    { source: 'src/app.test.ts', dependencies: [] },
    { source: 'src/feature.spec.tsx', dependencies: [] },
    { source: 'src/__tests__/fixture.ts', dependencies: [] },
    { source: 'src/game/testUtils.ts', dependencies: [] },
  ] };

  assert.deepEqual(retainedLocalModulePaths(artifact, 'compact-combined'), ['src/app.ts']);
});

test('cluster-packing variants repeat folder declarations per module like historical dependency-cruiser DOT', () => {
  const artifact = { modules: [
    { source: 'src/deep/a.ts', dependencies: [] },
    { source: 'src/deep/b.ts', dependencies: [] },
  ] };
  const baseline = generateDot(artifact, 'compact-combined');
  const packed = generateDot(artifact, 'compact-combined-cluster-packing');

  assert.equal(baseline.match(/subgraph "cluster_src\/deep"/gu)?.length, 1);
  assert.equal(packed.match(/subgraph "cluster_src\/deep"/gu)?.length, 2);
});

test('bold-border variant matches the historical black 2pt cluster border', () => {
  const dot = generateDot({ modules: [{ source: 'src/deep/a.ts', dependencies: [] }] }, 'compact-combined-bold-border');
  assert.match(dot, /color="black"; fontcolor="#596273"; fontname="Helvetica"; fontsize=9; penwidth=2;/u);
});

test('bold-title variant matches the historical black bold Helvetica cluster title', () => {
  const dot = generateDot({ modules: [{ source: 'src/deep/a.ts', dependencies: [] }] }, 'compact-combined-bold-titles');
  assert.match(dot, /color="#c8ced8"; fontcolor="black"; fontname="Helvetica-Bold"; fontsize=9; penwidth=0\.8;/u);
});

test('combined bold variant applies both reference border and title weight', () => {
  const dot = generateDot({ modules: [{ source: 'src/deep/a.ts', dependencies: [] }] }, 'compact-combined-bold-border-and-titles');
  assert.match(dot, /color="black"; fontcolor="black"; fontname="Helvetica-Bold"; fontsize=9; penwidth=2;/u);
});

test('exposes six combined candidates for visual comparison', () => {
  assert.deepEqual(Object.keys(LAYOUT_VARIANTS), [
    'compact-combined',
    'compact-combined-cluster-packing',
    'compact-combined-bold-border',
    'compact-combined-bold-titles',
    'compact-combined-bold-border-and-titles',
    'compact-combined-bold-border-and-titles-cluster-packing',
  ]);
  for (const variant of Object.keys(LAYOUT_VARIANTS)) {
    const dot = generateDot({ modules: [] }, variant);
    assert.match(dot, /strict digraph dependencies/u);
    assert.match(dot, /rankdir=LR/u);
    assert.match(dot, /nodesep=0\.16, ranksep=0\.18/u);
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
      { source: 'src/deep/a.ts', dependencies: [{ resolved: 'src/deep/b.ts' }] },
      { source: 'src/deep/b.ts', dependencies: [] },
    ] }));
    writeFileSync(fakeDot, `#!/bin/sh\nprintf '%s' '<svg width="10pt" height="20pt"><g id="clust1" class="cluster"><title>cluster_src/deep</title></g><g id="node1" class="node"></g><g id="node2" class="node"></g></svg>'\n`, { mode: 0o755 });

    assert.throws(() => renderCandidate(input, output, fakeDot, undefined, 'compact-combined'), /lost graph elements.*0 edges/u);
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
    writeFileSync(input, JSON.stringify({ modules: [{ source: 'src/deep/a.ts', dependencies: [] }] }));
    writeFileSync(fakeDot, `#!/bin/sh\nprintf '%s' '<svg width="10pt" height="20pt"><g id="clust1" class="cluster"><title>cluster_src/deep</title></g><g id="node1" class="node"></g></svg>'\n`, { mode: 0o755 });

    const result = renderCandidate(input, output, fakeDot, undefined, 'compact-combined');
    assert.equal(result.reference, undefined);
    assert.deepEqual(
      { ...result.candidate, namespaces: undefined },
      { width: 10, height: 20, aspectRatio: 0.5, nodes: 1, edges: 0, clusters: 1, namespaces: undefined },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('combined compact canonical evidence keeps file detail while filtering test support and src wrapper', () => {
  const artifact = JSON.parse(readFileSync('.maritime/dependency-graph.json', 'utf8'));
  const modules = retainedLocalModulePaths(artifact, 'compact-combined');
  const namespaces = recursiveFolderNamespaces(artifact, 'compact-combined');
  const dot = generateDot(artifact, 'compact-combined');

  assert.equal(modules.length, 114);
  assert.equal(dot.match(/module_\d+ \[label=.*tooltip=/gu)?.length, 114);
  assert.ok((dot.match(/ -> /gu)?.length ?? 0) > 300);
  assert.equal(namespaces.length, 40);
  assert.ok(!namespaces.includes('src'));
  assert.doesNotMatch(dot, /testUtils\.ts/u);
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
