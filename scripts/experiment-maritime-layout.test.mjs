import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { generateDot, inspectSvg, renderCandidate } from './experiment-maritime-layout.mjs';

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
  assert.match(dot, /subgraph cluster_0 \{[\s\S]*label="src";[\s\S]*subgraph cluster_1 \{[\s\S]*label="deep";/);
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

  assert.equal(dot.match(/tooltip=/gu)?.length, 115);
  assert.equal(dot.match(/ -> /gu)?.length, 358);
  assert.equal(dot.match(/subgraph cluster_/gu)?.length, 41);
});

test('inspects the committed acceptance SVGs rather than inferring visual output from DOT', () => {
  const reference = inspectSvg(readFileSync('docs/images/dependency-graph.reference.svg', 'utf8'));
  const beta7 = inspectSvg(readFileSync('docs/images/dependency-graph.svg', 'utf8'));

  assert.deepEqual(reference, { width: 1566, height: 3537, aspectRatio: 1566 / 3537, nodes: 113, edges: 351, clusters: 41 });
  assert.deepEqual(beta7, { width: 1080, height: 666, aspectRatio: 1080 / 666, nodes: 20, edges: 63, clusters: 0 });
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
    writeFileSync(fakeDot, `#!/bin/sh\nprintf '%s' '<svg width="10pt" height="20pt"><g id="clust1" class="cluster"></g><g id="node1" class="node"></g><g id="node2" class="node"></g></svg>'\n`, { mode: 0o755 });

    assert.throws(() => renderCandidate(input, output, fakeDot), /lost graph elements.*0 edges/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
