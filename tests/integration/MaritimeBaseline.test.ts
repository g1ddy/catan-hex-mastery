import { compareBundles } from '../../scripts/has-substantive-maritime-changes.cjs';

type Bundle = Map<string, string>;

const createBundle = (): Bundle => new Map([
  ['complexity-metrics.json', '{"src/example.ts":{"complexity":1}}\n'],
  ['complexity-report.md', '**Last Updated:** 2026-08-28\n\nHealth: 100\n'],
  ['dependency-graph.json', '{"modules":[]}\n'],
  ['manifest.json', JSON.stringify({ schemaVersion: 1, generatedAt: '2026-08-28T00:00:00.000Z', toolVersion: '0.1.0-beta.2' }, null, 2)],
]);

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
