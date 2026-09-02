import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assertLayoutCompatibility,
  assertSvgCompatibility,
  generateDot,
  inspectSvg,
  recursiveFolderNamespaces,
  renderCandidate,
} from './experiment-maritime-layout.mjs';

test('renders sorted local modules, local edges, and recursive clusters', () => {
  const artifact = {
    modules: [
      { source: 'src/z.ts', dependencies: [{ resolved: 'src/deep/a.ts' }, { resolved: 'node_modules/pkg/index.js' }] },
      { source: 'node_modules/pkg/index.js', dependencies: [] },
      { source: 'src/deep/a.ts', dependencies: [] },
    ],
  };
  const dot = generateDot(artifact);

  assert.match(dot, /rankdir=TB/);
  assert.match(dot, /subgraph "cluster_src" \{[\s\S]*tooltip="src";[\s\S]*subgraph "cluster_src\/deep" \{[\s\S]*tooltip="src\/deep";/);
  assert.match(dot, /module_0 \[label="a", tooltip="src\/deep\/a\.ts"\]/);
  assert.match(dot, /module_1 \[label="z", tooltip="src\/z\.ts"\]/);
  assert.match(dot, /module_1 -> module_0;/);
  assert.doesNotMatch(dot, /node_modules|pkg|dependencyTypes|newrank/);
  assert.equal(generateDot(artifact), dot);
});

test('rejects artifacts without a modules array', () => {
  assert.throws(() => generateDot({}), /modules array/);
});

test('retains the canonical artifact module, edge, and cluster detail', () => {
  const artifact = JSON.parse(readFileSync('.maritime/dependency-graph.json', 'utf8'));
  const dot = generateDot(artifact);

  assert.equal(dot.match(/module_\d+ \[label=.*tooltip=/gu)?.length, 115);
  assert.equal(dot.match(/ -> /gu)?.length, 358);
  assert.equal(dot.match(/subgraph "cluster_/gu)?.length, 41);
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

test('generates the canonical candidate and passes reference layout compatibility', () => {
  const artifact = JSON.parse(readFileSync('.maritime/dependency-graph.json', 'utf8'));
  const referencePath = 'docs/images/dependency-graph.reference.svg';
  const outputPath = 'docs/images/dependency-graph.candidate.svg';

  renderCandidate('.maritime/dependency-graph.json', outputPath, 'dot', referencePath);
  const result = assertLayoutCompatibility(
    readFileSync(referencePath, 'utf8'),
    readFileSync(outputPath, 'utf8'),
    artifact,
  );

  assert.equal(result.candidate.nodes, artifact.modules.filter(({ source }) => !source.startsWith('node_modules/')).length);
  assert.deepEqual(result.candidate.namespaces, recursiveFolderNamespaces(artifact));
  assert.ok(result.aspectDifference <= 0.1);
});

test('rejects a rendered SVG that loses a retained local edge', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'maritime-layout-'));
  try {
    const input = path.join(directory, 'input.json');
    const output = path.join(directory, 'candidate.svg');
    const reference = path.join(directory, 'reference.svg');
    const fakeDot = path.join(directory, 'dot');
    writeFileSync(input, JSON.stringify({ modules: [
      { source: 'src/a.ts', dependencies: [{ resolved: 'src/b.ts' }] },
      { source: 'src/b.ts', dependencies: [] },
    ] }));
    writeFileSync(fakeDot, `#!/bin/sh\nprintf '%s' '<svg width="10pt" height="20pt"><g id="clust1" class="cluster"></g><g id="node1" class="node"></g><g id="node2" class="node"></g></svg>'\n`, { mode: 0o755 });
    writeFileSync(reference, '<svg width="10pt" height="20pt"></svg>');

    assert.throws(() => renderCandidate(input, output, fakeDot, reference), /lost graph elements.*0 edges/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('derives target canvas constraints from the supplied layout reference', () => {
  const dot = generateDot({ modules: [] }, { width: 1566, height: 3537 });
  assert.match(dot, /size="21\.750,49\.125!", ratio=2\.258621/u);
});
