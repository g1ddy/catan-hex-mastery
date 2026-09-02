import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { generateDot } from './experiment-maritime-layout.mjs';

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
