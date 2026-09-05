import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCompactLayout } from './validate-maritime-layout.mjs';

const graph = {
  modules: [
    { source: 'src/features/a.ts', dependencies: [{ resolved: 'src/game/b.ts' }] },
    { source: 'src/game/b.ts', dependencies: [] },
  ],
};

const svg = ({ width = 100, height = 200, clusters = ['src/features', 'src/game'], edges = 1 } = {}) => `
<svg width="${width}pt" height="${height}pt">
${clusters.map((cluster, index) => `<g id="clust${index + 1}" class="cluster"><title>cluster:${cluster}</title></g>`).join('')}
<g id="node1" class="node"></g><g id="node2" class="node"></g>
${Array.from({ length: edges }, (_, index) => `<g id="edge${index + 1}" class="edge"></g>`).join('')}
</svg>`;

test('accepts complete compact topology with matching recursive namespaces and aspect', () => {
  const result = validateCompactLayout({
    graph,
    referenceSvg: svg(),
    candidateSvg: svg(),
  });
  assert.deepEqual(result.errors, []);
});

test('rejects a redundant source-root wrapper', () => {
  const result = validateCompactLayout({
    graph,
    referenceSvg: svg(),
    candidateSvg: svg({ clusters: ['src', 'src/features', 'src/game'] }),
  });
  assert.ok(result.errors.some((error) => error.includes('sole src source-root wrapper')));
});

test('rejects missing semantic pairs and material aspect drift', () => {
  const result = validateCompactLayout({
    graph,
    referenceSvg: svg(),
    candidateSvg: svg({ width: 200, height: 100, edges: 0 }),
  });
  assert.ok(result.errors.some((error) => error.includes('semantic pairs expect 1')));
  assert.ok(result.errors.some((error) => error.includes('differs from reference')));
});
