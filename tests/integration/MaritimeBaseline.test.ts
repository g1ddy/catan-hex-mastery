import { compareBundles } from '../../scripts/has-substantive-maritime-changes.cjs';
import { validateMaritimeArtifactContent } from '../../scripts/validate-maritime-artifacts.cjs';

type Bundle = Map<string, string>;
type MaritimeModuleFixture = {
  source: string;
  dependencies: unknown[];
  dependents: unknown[];
};
type MaritimeMetricFixture = {
  scanned: boolean;
  complexity: number;
  loc: number;
  fanIn: number;
  fanOut: number;
};
type MaritimeArtifactsFixture = {
  manifest: {
    schemaVersion: string;
    toolVersion: string;
    sourceRoots: string[];
    summary: {
      totalFiles: number;
      scannedCount: number;
      skippedCount: number;
      healthScore: number;
    };
  };
  graph: { modules: MaritimeModuleFixture[] };
  metrics: Record<string, MaritimeMetricFixture>;
  svg: string;
};

const createBundle = (): Bundle => new Map([
  ['complexity-metrics.json', '{"src/example.ts":{"complexity":1}}\n'],
  ['complexity-report.md', '**Last Updated:** 2026-08-28\n\nHealth: 100\n'],
  ['dependency-graph.json', '{"modules":[]}\n'],
  ['manifest.json', JSON.stringify({ schemaVersion: 1, generatedAt: '2026-08-28T00:00:00.000Z', toolVersion: '0.1.0-beta.2' }, null, 2)],
]);

const createValidArtifacts = (): MaritimeArtifactsFixture => ({
  manifest: {
    schemaVersion: '1.0.0',
    toolVersion: '0.1.0-beta.3',
    sourceRoots: ['src'],
    summary: {
      totalFiles: 1,
      scannedCount: 1,
      skippedCount: 0,
      healthScore: 100,
    },
  },
  graph: {
    modules: [{ source: 'src/game/core/types.ts', dependencies: [], dependents: [] }],
  },
  metrics: {
    'src/game/core/types.ts': { scanned: true, complexity: 1, loc: 10, fanIn: 0, fanOut: 0 },
  },
  svg: '<svg><title>local:src/game/core/types.ts</title></svg>',
});

describe('Maritime substantive baseline comparison', () => {
  it('ignores a report date-only change', () => {
    const baseline = createBundle();
    const generated = createBundle();
    generated.set('complexity-report.md', '**Last Updated:** 2026-08-29\n\nHealth: 100\n');

    expect(compareBundles(baseline, generated)).toBe(true);
  });

  it('ignores a manifest generatedAt-only change', () => {
    const baseline = createBundle();
    const generated = createBundle();
    generated.set('manifest.json', JSON.stringify({ schemaVersion: 1, generatedAt: '2026-08-29T12:34:56.000Z', toolVersion: '0.1.0-beta.2' }, null, 2));

    expect(compareBundles(baseline, generated)).toBe(true);
  });

  it.each([
    ['metrics', 'complexity-metrics.json', '{"src/example.ts":{"complexity":2}}\n'],
    ['report', 'complexity-report.md', '**Last Updated:** 2026-08-29\n\nHealth: 90\n'],
    ['graph', 'dependency-graph.json', '{"modules":[{"source":"src/example.ts"}]}\n'],
    ['manifest', 'manifest.json', JSON.stringify({ schemaVersion: 2, generatedAt: '2026-08-29T12:34:56.000Z', toolVersion: '0.1.0-beta.2' }, null, 2)],
  ])('detects a substantive %s change', (_label, filePath, content) => {
    const baseline = createBundle();
    const generated = createBundle();
    generated.set(filePath, content);

    expect(compareBundles(baseline, generated)).toBe(false);
  });

  it('detects a generated file-set change', () => {
    const baseline = createBundle();
    const generated = createBundle();
    generated.set('new-evidence.json', '{}\n');

    expect(compareBundles(baseline, generated)).toBe(false);
  });
});

describe('Maritime consumer contract', () => {
  it('accepts a measured production bundle with a rendered local node', () => {
    expect(validateMaritimeArtifactContent(createValidArtifacts())).toEqual([]);
  });

  it('rejects an empty bundle even if it reports a perfect health score', () => {
    const artifacts = createValidArtifacts();
    artifacts.manifest.summary.totalFiles = 0;
    artifacts.manifest.summary.scannedCount = 0;
    artifacts.graph.modules = [];
    artifacts.metrics = {};
    artifacts.svg = '<svg></svg>';

    expect(validateMaritimeArtifactContent(artifacts)).toEqual(expect.arrayContaining([
      'manifest summary.totalFiles must be greater than zero',
      'manifest summary.scannedCount must be greater than zero',
      'dependency graph must contain local src/ modules',
      'dependency graph SVG contains no local src/ module nodes',
    ]));
  });

  it('rejects test-only modules in the production evidence graph', () => {
    const artifacts = createValidArtifacts();
    artifacts.graph.modules.push({ source: 'src/game/core/types.test.ts', dependencies: [], dependents: [] });

    expect(validateMaritimeArtifactContent(artifacts).some((error: string) => (
      error.startsWith('production evidence contains test-only modules:')
    ))).toBe(true);
  });

  it('rejects a metric that is not represented in the canonical graph', () => {
    const artifacts = createValidArtifacts();
    artifacts.manifest.summary.totalFiles = 2;
    artifacts.manifest.summary.scannedCount = 2;
    artifacts.metrics['src/game/core/constants.ts'] = { scanned: true, complexity: 1, loc: 10, fanIn: 0, fanOut: 0 };

    expect(validateMaritimeArtifactContent(artifacts)).toContain(
      'measured file is missing from dependency graph: src/game/core/constants.ts',
    );
  });
});
