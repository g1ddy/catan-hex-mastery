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

test('no-src reference-colors baseline keeps the compact geometry decisions', () => {
  const artifact = {
    modules: [
      { source: 'src/z.ts', dependencies: [{ resolved: 'src/deep/a.ts' }, { resolved: 'node_modules/pkg/index.js' }] },
      { source: 'src/game/testUtils.ts', dependencies: [] },
      { source: 'node_modules/pkg/index.js', dependencies: [] },
      { source: 'src/deep/a.ts', dependencies: [] },
    ],
  };
  const dot = generateDot(artifact, 'compact-no-src-reference-colors');

  assert.match(dot, /rankdir=LR/u);
  assert.match(dot, /nodesep=0\.1, ranksep=0\.12/u);
  assert.doesNotMatch(dot, /subgraph "cluster_src" \{/u);
  assert.match(dot, /subgraph "cluster_src\/deep" \{/u);
  assert.match(dot, /testUtils\.ts/u);
  assert.doesNotMatch(dot, /node_modules/u);
});

test('rejects artifacts without a modules array', () => {
  assert.throws(() => generateDot({}), /modules array/u);
});

test('reference colors reproduce dependency-cruiser semantic module coloring', () => {
  const artifact = { modules: [
    { source: 'src/vite-env.d.ts', orphan: true, dependencies: [] },
    { source: 'src/plain.ts', orphan: false, dependencies: [] },
    { source: 'src/App.tsx', orphan: false, dependencies: [] },
    { source: 'src/data.json', orphan: false, dependencies: [] },
    { source: 'src/styles.css', orphan: false, dependencies: [] },
  ] };
  const dot = generateDot(artifact, 'compact-no-src-reference-colors');

  assert.match(dot, /tooltip="src\/vite-env\.d\.ts", fillcolor="#ccffcc"/u);
  assert.match(dot, /tooltip="src\/plain\.ts", fillcolor="#ddfeff"/u);
  assert.match(dot, /tooltip="src\/App\.tsx", fillcolor="#bbfeff"/u);
  assert.match(dot, /tooltip="src\/data\.json", fillcolor="#ffee44"/u);
  assert.match(dot, /tooltip="src\/styles\.css", fillcolor="#ffffcc"/u);
});

test('reference theme restores historical cluster weight and white rounded fill', () => {
  const dot = generateDot({ modules: [{ source: 'src/deep/a.ts', dependencies: [] }] }, 'compact-no-src-reference-theme');

  assert.match(dot, /color="black"; fontcolor="black"; fontname="Helvetica-Bold"; fontsize=9; penwidth=2; margin=4; style="rounded,bold,filled"; fillcolor="#ffffff";/u);
  assert.match(dot, /bgcolor="white"/u);
});

test('reference edge theme restores historical edge weight and de-emphasizes type-only relationships', () => {
  const artifact = { modules: [
    { source: 'src/a.ts', dependencies: [
      { resolved: 'src/b.ts', dependencyTypes: ['local', 'type-only', 'import'] },
      { resolved: 'src/c.ts', dependencyTypes: ['local', 'import'], dynamic: false },
      { resolved: 'src/d.ts', dependencyTypes: ['local', 'dynamic-import'], dynamic: true },
    ] },
    { source: 'src/b.ts', dependencies: [] },
    { source: 'src/c.ts', dependencies: [] },
    { source: 'src/d.ts', dependencies: [] },
  ] };
  const dot = generateDot(artifact, 'compact-no-src-reference-theme-edges');

  assert.match(dot, /edge \[arrowhead="normal", arrowsize=0\.6, penwidth=2, color="#00000033"/u);
  assert.match(dot, /module_0 -> module_1 \[arrowhead="onormal", style="dashed", color="#aaaaaa", penwidth=1\];/u);
  assert.match(dot, /module_0 -> module_2;/u);
  assert.match(dot, /module_0 -> module_3 \[style="dashed"\];/u);
});

test('runtime evidence keeps a source-target pair primary when duplicate type-only evidence also exists', () => {
  const artifact = { modules: [
    { source: 'src/a.ts', dependencies: [
      { resolved: 'src/b.ts', dependencyTypes: ['local', 'type-only'] },
      { resolved: 'src/b.ts', dependencyTypes: ['local', 'import'] },
    ] },
    { source: 'src/b.ts', dependencies: [] },
  ] };
  const dot = generateDot(artifact, 'compact-no-src-reference-theme-edges');

  assert.match(dot, /module_0 -> module_1;/u);
  assert.doesNotMatch(dot, /module_0 -> module_1 \[/u);
});

test('production variant excludes tests, specs, __tests__, and testUtils support utilities', () => {
  const artifact = { modules: [
    { source: 'src/app.ts', dependencies: [] },
    { source: 'src/app.test.ts', dependencies: [] },
    { source: 'src/feature.spec.tsx', dependencies: [] },
    { source: 'src/__tests__/fixture.ts', dependencies: [] },
    { source: 'src/game/testUtils.ts', dependencies: [] },
  ] };

  assert.deepEqual(retainedLocalModulePaths(artifact, 'compact-no-src-reference-theme-production'), ['src/app.ts']);
});

test('all four variants retain recursive namespaces without the redundant source-root cluster', () => {
  const artifact = { modules: [
    { source: 'src/root.ts', dependencies: [] },
    { source: 'src/deep/a.ts', dependencies: [] },
  ] };

  for (const variant of Object.keys(LAYOUT_VARIANTS)) {
    assert.deepEqual(recursiveFolderNamespaces(artifact, variant), ['src/deep']);
  }
});

test('exposes the focused no-src reference comparison family', () => {
  assert.deepEqual(Object.keys(LAYOUT_VARIANTS), [
    'compact-no-src-reference-colors',
    'compact-no-src-reference-theme',
    'compact-no-src-reference-theme-edges',
    'compact-no-src-reference-theme-production',
  ]);
  for (const variant of Object.keys(LAYOUT_VARIANTS)) {
    const dot = generateDot({ modules: [] }, variant);
    assert.match(dot, /strict digraph dependencies/u);
    assert.match(dot, /rankdir=LR/u);
    assert.match(dot, /nodesep=0\.1, ranksep=0\.12/u);
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

    assert.throws(() => renderCandidate(input, output, fakeDot, undefined, 'compact-no-src-reference-colors'), /lost graph elements.*0 edges/u);
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

    const result = renderCandidate(input, output, fakeDot, undefined, 'compact-no-src-reference-colors');
    assert.equal(result.reference, undefined);
    assert.deepEqual(
      { ...result.candidate, namespaces: undefined },
      { width: 10, height: 20, aspectRatio: 0.5, nodes: 1, edges: 0, clusters: 1, namespaces: undefined },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('canonical no-src evidence preserves file detail and reference semantic orphan coloring', () => {
  const artifact = JSON.parse(readFileSync('.maritime/dependency-graph.json', 'utf8'));
  const modules = retainedLocalModulePaths(artifact, 'compact-no-src-reference-colors');
  const namespaces = recursiveFolderNamespaces(artifact, 'compact-no-src-reference-colors');
  const dot = generateDot(artifact, 'compact-no-src-reference-colors');

  assert.equal(modules.length, 115);
  assert.equal(dot.match(/module_\d+ \[label=.*tooltip=/gu)?.length, 115);
  assert.equal(dot.match(/ -> /gu)?.length, 357);
  assert.equal(namespaces.length, 40);
  assert.ok(!namespaces.includes('src'));
  assert.match(dot, /tooltip="src\/vite-env\.d\.ts", fillcolor="#ccffcc"/u);
});

test('canonical production variant removes the remaining support utility', () => {
  const artifact = JSON.parse(readFileSync('.maritime/dependency-graph.json', 'utf8'));
  const modules = retainedLocalModulePaths(artifact, 'compact-no-src-reference-theme-production');
  const dot = generateDot(artifact, 'compact-no-src-reference-theme-production');

  assert.equal(modules.length, 114);
  assert.equal(dot.match(/ -> /gu)?.length, 355);
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
