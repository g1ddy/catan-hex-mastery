const { readFileSync } = require('node:fs');

const EXPECTED_TOOL_VERSION = '0.1.0-beta.3';
const EXPECTED_SOURCE_ROOT = 'src';
const TEST_MODULE_PATTERN = /(^|[/])(__tests__[/]|.*\.(test|spec)\.[cm]?[jt]sx?$)/;

function validateMaritimeArtifactContent({ manifest, graph, metrics, svg }) {
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
    errors.push(`production evidence contains test/spec modules: ${testSources.slice(0, 3).join(', ')}`);
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

  if (typeof svg !== 'string' || !svg.includes('<svg')) {
    errors.push('dependency graph presentation is not SVG');
  } else if (!svg.includes('local:src/')) {
    errors.push('dependency graph SVG contains no local src/ module nodes');
  }

  return errors;
}

function validateMaritimeArtifacts(
  maritimeDirectory = '.maritime',
  svgPath = 'docs/images/dependency-graph.svg',
) {
  const manifest = JSON.parse(readFileSync(`${maritimeDirectory}/manifest.json`, 'utf8'));
  const graph = JSON.parse(readFileSync(`${maritimeDirectory}/dependency-graph.json`, 'utf8'));
  const metrics = JSON.parse(readFileSync(`${maritimeDirectory}/complexity-metrics.json`, 'utf8'));
  const svg = readFileSync(svgPath, 'utf8');
  const errors = validateMaritimeArtifactContent({ manifest, graph, metrics, svg });

  if (errors.length > 0) {
    throw new Error(`Invalid Maritime consumer artifacts:\n- ${errors.join('\n- ')}`);
  }

  return { manifest, graph, metrics, svg };
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
