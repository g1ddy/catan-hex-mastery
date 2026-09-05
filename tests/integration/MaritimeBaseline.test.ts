import { readFileSync } from 'node:fs';
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
  compactSvg: string;
  overviewSvg: string;
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
    toolVersion: '0.1.0-beta.8',
    sourceRoots: ['src'],
    summary: {
      totalFiles: 1,
      scannedCount: 1,
      skippedCount: 0,
      healthScore: 100,
    },
  },
  graph: {
    modules: [{
      source: 'src/game/core/types.ts',
      dependencies: [{
        resolved: 'src/game/core/types.ts',
        preCompilationOnly: true,
        dependencyTypes: ['local', 'pre-compilation-only'],
      }],
      dependents: [],
    }],
  },
  metrics: {
    'src/game/core/types.ts': { scanned: true, complexity: 1, loc: 10, fanIn: 0, fanOut: 0 },
  },
  compactSvg: '<svg><title>local:src/game/core/types.ts</title></svg>',
  overviewSvg: '<svg><title>folder:src/game/core</title></svg>',
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

describe('Maritime released consumer contract', () => {
  it('pins compact and overview rendering to published beta.8 profiles', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const workflow = readFileSync('.github/workflows/maritime-comparison.yml', 'utf8');

    expect(packageJson.scripts?.['generate:graph']).toContain('@dependency-maritime/cli@0.1.0-beta.8');
    expect(packageJson.scripts?.['generate:graph']).toContain('--graph-profile compact-architecture');
    expect(workflow).toContain('npx --yes --package=@dependency-maritime/cli@0.1.0-beta.8 maritime graph');
    expect(workflow).toContain('--output docs/images/dependency-overview.svg');
    expect(workflow).toContain('--graph-profile architecture-overview');
  });
});

describe('Maritime consumer contract', () => {
  it('accepts one measured production bundle rendered as compact and overview presentations', () => {
    expect(validateMaritimeArtifactContent(createValidArtifacts())).toEqual([]);
  });

  it('rejects folder aggregation in compact-architecture because it is file-level', () => {
    const artifacts = createValidArtifacts();
    artifacts.compactSvg = '<svg><title>folder:src/game/core</title></svg>';

    expect(validateMaritimeArtifactContent(artifacts)).toEqual(expect.arrayContaining([
      'compact dependency graph SVG contains no local src/ file nodes',
    ]));
  });

  it('rejects individual file nodes in architecture-overview because it is folder-aggregated', () => {
    const artifacts = createValidArtifacts();
    artifacts.overviewSvg = '<svg><title>folder:src/game/core</title><title>local:src/game/core/types.ts</title></svg>';

    expect(validateMaritimeArtifactContent(artifacts)).toContain(
      'architecture overview must not retain individual local file nodes',
    );
  });

  it('rejects an empty bundle even if it reports a perfect health score', () => {
    const artifacts = createValidArtifacts();
    artifacts.manifest.summary.totalFiles = 0;
    artifacts.manifest.summary.scannedCount = 0;
    artifacts.graph.modules = [];
    artifacts.metrics = {};
    artifacts.compactSvg = '<svg></svg>';
    artifacts.overviewSvg = '<svg></svg>';

    expect(validateMaritimeArtifactContent(artifacts)).toEqual(expect.arrayContaining([
      'manifest summary.totalFiles must be greater than zero',
      'manifest summary.scannedCount must be greater than zero',
      'dependency graph must contain local src/ modules',
      'dependency graph must preserve explicit pre-compilation evidence for compact edge semantics',
      'compact dependency graph SVG contains no local src/ file nodes',
      'architecture overview must aggregate local files into folder nodes',
    ]));
  });

  it('rejects external package nodes in either local-only presentation', () => {
    const compactArtifacts = createValidArtifacts();
    compactArtifacts.compactSvg = '<svg><title>local:src/game/core/types.ts</title><title>external:react</title></svg>';
    expect(validateMaritimeArtifactContent(compactArtifacts)).toContain(
      'compact dependency graph SVG must omit external package nodes',
    );

    const overviewArtifacts = createValidArtifacts();
    overviewArtifacts.overviewSvg = '<svg><title>folder:src/game/core</title><title>external:react</title></svg>';
    expect(validateMaritimeArtifactContent(overviewArtifacts)).toContain(
      'architecture overview must omit external package nodes',
    );
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
