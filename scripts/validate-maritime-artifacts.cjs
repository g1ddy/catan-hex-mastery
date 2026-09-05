const { readFileSync } = require('node:fs');

const EXPECTED_TOOL_VERSION = '0.1.0-beta.8';
const EXPECTED_SOURCE_ROOT = 'src';
const TEST_MODULE_PATTERN = /(^|[/])(__tests__[/]|.*\.(test|spec)\.[cm]?[jt]sx?$)/;

function validateMaritimeArtifactContent({ manifest, graph, metrics, compactSvg, overviewSvg }) {
  const errors = [];
  const summary = manifest?.summary ?? {};
  const modules = Array.isArray(graph?.modules) ? graph.modules : [];
  const metricEntries = metrics && typeof metrics === 'object' && !Array.isArray(metrics)
    ? Object.entries(metrics)
    : [];

  if (manifest?.toolVersion !== EXPECTED_TOOL_VERSION) {
    errors.push(`expected Maritime ${EXPECTED_TOOL_VERSION}, found ${manifest?.toolVersion ?? '<missing>'}`);
  }

  if (JSON.stringify(manifest?.sourceRoots) !== JSON.stringify([EXPECTED_SOURCE_ROOT])) {
    errors.push(`expected sourceRoots to be ["${EXPECTED_SOURCE_ROOT}"]`);
  }

  if (!Number.isInteger(summary.totalFiles) || summary.totalFiles <= 0) {
    errors.push('manifest summary.totalFiles must be greater than zero');
  }

  if (!Number.isInteger(summary.scannedCount) || summary.scannedCount <= 0) {
    errors.push('manifest summary.scannedCount must be greater than zero');
  }

  if (summary.scannedCount !== summary.totalFiles) {
    errors.push('all canonical Maritime files must be measured');
  }

  if (summary.skippedCount !== 0) {
    errors.push('manifest summary.skippedCount must be zero');
  }

  const localSources = modules
    .map((module) => module?.source)
    .filter((source) => typeof source === 'string' && source.startsWith(`${EXPECTED_SOURCE_ROOT}/`));

  if (localSources.length === 0) {
    errors.push('dependency graph must contain local src/ modules');
  }

  const testSources = localSources.filter((source) => TEST_MODULE_PATTERN.test(source));
  if (testSources.length > 0) {
    errors.push(`production evidence contains test-only modules: ${testSources.slice(0, 3).join(', ')}`);
  }

  const dependencies = modules.flatMap((module) => module?.dependencies ?? []);
  const hasPreCompilationEvidence = dependencies.some((dependency) => (
    dependency?.preCompilationOnly === true
    || (Array.isArray(dependency?.dependencyTypes) && dependency.dependencyTypes.includes('pre-compilation-only'))
  ));
  if (!hasPreCompilationEvidence) {
    errors.push('dependency graph must preserve explicit pre-compilation evidence for compact edge semantics');
  }

  if (metricEntries.length !== summary.totalFiles) {
    errors.push(`complexity metrics count (${metricEntries.length}) must match manifest totalFiles (${summary.totalFiles ?? '<missing>'})`);
  }

  const graphSources = new Set(localSources);
  for (const [filePath, metric] of metricEntries) {
    if (!metric || metric.scanned !== true) {
      errors.push(`complexity metric is not measured: ${filePath}`);
      break;
    }
    if (!graphSources.has(filePath)) {
      errors.push(`measured file is missing from dependency graph: ${filePath}`);
      break;
    }
  }

  if (typeof compactSvg !== 'string' || !compactSvg.includes('<svg')) {
    errors.push('compact dependency graph presentation is not SVG');
  } else if (!compactSvg.includes('local:src/')) {
    errors.push('compact dependency graph SVG contains no local src/ file nodes');
  } else if (compactSvg.includes('folder:src/')) {
    errors.push('compact dependency graph must remain file-level rather than folder-aggregated');
  } else if (compactSvg.includes('external:') || compactSvg.includes('External packages')) {
    errors.push('compact dependency graph SVG must omit external package nodes');
  }

  if (typeof overviewSvg !== 'string' || !overviewSvg.includes('<svg')) {
    errors.push('architecture overview presentation is not SVG');
  } else if (!overviewSvg.includes('folder:')) {
    errors.push('architecture overview must aggregate local files into folder nodes');
  } else if (overviewSvg.includes('local:src/')) {
    errors.push('architecture overview must not retain individual local file nodes');
  } else if (overviewSvg.includes('external:') || overviewSvg.includes('External packages')) {
    errors.push('architecture overview must omit external package nodes');
  }

  return errors;
}

function validateMaritimeArtifacts(
  maritimeDirectory = '.maritime',
  compactSvgPath = 'docs/images/dependency-graph.svg',
  overviewSvgPath = 'docs/images/dependency-overview.svg',
) {
  const manifest = JSON.parse(readFileSync(`${maritimeDirectory}/manifest.json`, 'utf8'));
  const graph = JSON.parse(readFileSync(`${maritimeDirectory}/dependency-graph.json`, 'utf8'));
  const metrics = JSON.parse(readFileSync(`${maritimeDirectory}/complexity-metrics.json`, 'utf8'));
  const compactSvg = readFileSync(compactSvgPath, 'utf8');
  const overviewSvg = readFileSync(overviewSvgPath, 'utf8');
  const errors = validateMaritimeArtifactContent({ manifest, graph, metrics, compactSvg, overviewSvg });

  if (errors.length > 0) {
    throw new Error(`Invalid Maritime consumer artifacts:\n- ${errors.join('\n- ')}`);
  }

  return { manifest, graph, metrics, compactSvg, overviewSvg };
}

if (require.main === module) {
  try {
    const { manifest } = validateMaritimeArtifacts();
    console.log(
      `Maritime consumer contract verified: ${manifest.summary.scannedCount} measured production files, health ${manifest.summary.healthScore}.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = { validateMaritimeArtifactContent, validateMaritimeArtifacts };
