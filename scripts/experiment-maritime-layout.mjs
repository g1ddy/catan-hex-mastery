#!/usr/bin/env node
/* global console, process */

/**
 * Experimental module-level Maritime graph renderer.
 *
 * Prerequisite: Graphviz's `dot` executable must be on PATH.
 * Run: node scripts/experiment-maritime-layout.mjs
 *
 * The canonical input and separate candidate output can also be overridden:
 * node scripts/experiment-maritime-layout.mjs input.json output.svg --layout-reference reference.svg
 */

import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const quote = (value) => `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
const normalize = (value) => value.replaceAll('\\', '/');

function directoryOf(modulePath) {
  const separator = modulePath.lastIndexOf('/');
  return separator < 0 ? '' : modulePath.slice(0, separator);
}

function displayName(modulePath) {
  return path.posix.basename(modulePath).replace(/\.(?:[cm]?[jt]sx?|css)$/u, '');
}

function isExternal(modulePath) {
  return modulePath === 'node_modules' || modulePath.startsWith('node_modules/');
}

function addDirectory(tree, directory) {
  let branch = tree;
  let current = '';
  for (const segment of directory.split('/').filter(Boolean)) {
    current = current ? `${current}/${segment}` : segment;
    branch.children.set(segment, branch.children.get(segment) ?? {
      path: current,
      children: new Map(),
      modules: [],
    });
    branch = branch.children.get(segment);
  }
  return branch;
}

export function generateDot(artifact, targetDimensions) {
  if (!Array.isArray(artifact?.modules)) {
    throw new TypeError('Maritime artifact must contain a modules array');
  }

  const modules = artifact.modules
    .filter(({ source }) => typeof source === 'string' && !isExternal(normalize(source)))
    .map((module) => ({ ...module, source: normalize(module.source) }))
    .sort((left, right) => left.source.localeCompare(right.source));
  const moduleIds = new Map(modules.map((module, index) => [module.source, `module_${index}`]));
  const root = { path: '', children: new Map(), modules: [] };

  for (const module of modules) {
    addDirectory(root, directoryOf(module.source)).modules.push(module);
  }

  const directories = [];
  const collectDirectories = (branch) => {
    for (const child of [...branch.children.values()].sort((a, b) => a.path.localeCompare(b.path))) {
      directories.push(child.path);
      collectDirectories(child);
    }
  };
  collectDirectories(root);
  const clusterIds = new Map(directories.map((directory, index) => [directory, `cluster_${index}`]));

  const targetLayout = targetDimensions
    ? `, size=${quote(`${(targetDimensions.width / 72).toFixed(3)},${(targetDimensions.height / 72).toFixed(3)}!`)}, ratio=${(targetDimensions.height / targetDimensions.width).toFixed(6)}`
    : '';
  const lines = [
    'digraph dependencies {',
    `  graph [rankdir=LR, compound=true, remincross=true, outputorder=edgesfirst, splines=polyline, nodesep=0.10, ranksep=0.28, pad=0.10, bgcolor="transparent"${targetLayout}];`,
    '  node [shape=box, style="rounded,filled", fillcolor="#ffffff", color="#8b95a5", fontname="Helvetica", fontsize=8, margin="0.06,0.035", height=0.20];',
    '  edge [color="#9aa3b2", penwidth=0.65, arrowsize=0.45];',
  ];

  const renderBranch = (branch, indentation) => {
    const prefix = ' '.repeat(indentation);
    for (const child of [...branch.children.values()].sort((a, b) => a.path.localeCompare(b.path))) {
      // The title Graphviz emits for this named subgraph is durable, non-visual
      // namespace metadata. Keep opaque DOM ids, but expose the complete path.
      lines.push(`${prefix}subgraph ${quote(`cluster_${child.path}`)} {`);
      lines.push(`${prefix}  id=${quote(clusterIds.get(child.path))}; label=${quote(path.posix.basename(child.path))}; tooltip=${quote(child.path)}; color="#c8ced8"; fontcolor="#596273"; fontname="Helvetica"; fontsize=9; penwidth=0.8; margin=6;`);
      renderBranch(child, indentation + 2);
      lines.push(`${prefix}}`);
    }
    for (const module of branch.modules.sort((a, b) => a.source.localeCompare(b.source))) {
      lines.push(`${prefix}${moduleIds.get(module.source)} [label=${quote(displayName(module.source))}, tooltip=${quote(module.source)}];`);
    }
  };
  renderBranch(root, 2);

  const edgeKeys = [];
  for (const module of modules) {
    for (const dependency of module.dependencies ?? []) {
      const target = typeof dependency.resolved === 'string' ? normalize(dependency.resolved) : '';
      if (moduleIds.has(target)) edgeKeys.push(`${module.source}\0${target}`);
    }
  }
  for (const edgeKey of edgeKeys.sort()) {
    const [source, target] = edgeKey.split('\0');
    lines.push(`  ${moduleIds.get(source)} -> ${moduleIds.get(target)};`);
  }
  lines.push('}');
  return `${lines.join('\n')}\n`;
}

export function inspectSvg(svg) {
  const dimensions = svg.match(/<svg\s+width="([\d.]+)pt"\s+height="([\d.]+)pt"/u);
  if (!dimensions) throw new Error('Graphviz SVG is missing point dimensions');
  const width = Number(dimensions[1]);
  const height = Number(dimensions[2]);
  const namespaces = [...svg.matchAll(/<g\s+id="[^"]+"\s+class="cluster">\s*<title>cluster_([^<]+)<\/title>/gu)]
    .map((match) => decodeXml(match[1]))
    .sort();
  return {
    width,
    height,
    aspectRatio: width / height,
    nodes: (svg.match(/<g\s+id="node\d+"\s+class="node">/gu) ?? []).length,
    edges: (svg.match(/<g\s+id="edge\d+"\s+class="edge">/gu) ?? []).length,
    clusters: (svg.match(/<g\s+id="[^"]+"\s+class="cluster">/gu) ?? []).length,
    namespaces,
  };
}

function decodeXml(value) {
  return value
    .replaceAll('&#45;', '-')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');
}

export function retainedLocalModulePaths(artifact) {
  if (!Array.isArray(artifact?.modules)) throw new TypeError('Maritime artifact must contain a modules array');
  return localSources(artifact).sort();
}

export function recursiveFolderNamespaces(artifact) {
  const directories = new Set();
  for (const source of retainedLocalModulePaths(artifact)) {
    let directory = directoryOf(source);
    while (directory) {
      directories.add(directory);
      directory = directoryOf(directory);
    }
  }
  return [...directories].sort();
}

export function assertSvgCompatibility(referenceSvg, candidateSvg, expectation, relativeTolerance = 0.1) {
  const reference = inspectSvg(referenceSvg);
  const candidate = inspectSvg(candidateSvg);
  const { moduleCount, namespaces: expectedNamespaces } = expectation;

  if (candidate.nodes < reference.nodes) throw new Error(`candidate has ${candidate.nodes} nodes; reference has ${reference.nodes}`);
  if (candidate.nodes !== moduleCount) throw new Error(`candidate has ${candidate.nodes} nodes; expected ${moduleCount} modules`);
  if (candidate.clusters !== expectedNamespaces.length || candidate.clusters !== reference.clusters) {
    throw new Error(`candidate has ${candidate.clusters} clusters; canonical artifact expects ${expectedNamespaces.length} and reference has ${reference.clusters}`);
  }
  if (JSON.stringify(candidate.namespaces) !== JSON.stringify(expectedNamespaces)) {
    throw new Error('candidate cluster namespace metadata does not match canonical recursive folders');
  }
  const aspectDifference = Math.abs(candidate.aspectRatio - reference.aspectRatio) / reference.aspectRatio;
  if (aspectDifference > relativeTolerance) {
    throw new Error(`candidate aspect ${candidate.aspectRatio.toFixed(3)} differs from reference ${reference.aspectRatio.toFixed(3)} by ${(aspectDifference * 100).toFixed(1)}%`);
  }
  return { reference, candidate, expectedNamespaces, aspectDifference };
}

export function assertLayoutCompatibility(referenceSvg, candidateSvg, artifact, relativeTolerance = 0.1) {
  const expectedModules = retainedLocalModulePaths(artifact);
  const expectedNamespaces = recursiveFolderNamespaces(artifact);
  return assertSvgCompatibility(referenceSvg, candidateSvg, {
    moduleCount: expectedModules.length,
    namespaces: expectedNamespaces,
  }, relativeTolerance);
}

function formatMetrics(label, metrics) {
  return `${label}: ${metrics.width} × ${metrics.height} pt; ${metrics.nodes} nodes, ${metrics.edges} edges, ${metrics.clusters} clusters; aspect ${metrics.aspectRatio.toFixed(3)}`;
}

export function renderCandidate(inputPath, outputPath, dotCommand = 'dot', layoutReferencePath) {
  const artifact = JSON.parse(readFileSync(inputPath, 'utf8'));
  if (!layoutReferencePath) throw new Error('A layout reference SVG path is required');
  const reference = inspectSvg(readFileSync(layoutReferencePath, 'utf8'));
  const dot = generateDot(artifact, reference);
  const result = spawnSync(dotCommand, ['-Tsvg'], { input: dot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw new Error(`Unable to invoke Graphviz ${quote(dotCommand)}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Graphviz failed with status ${result.status}: ${result.stderr.trim()}`);
  const metrics = inspectSvg(result.stdout);
  if (metrics.nodes !== modulesCount(artifact) || metrics.edges !== edgesCount(artifact) || metrics.clusters !== directoryCount(artifact)) {
    throw new Error(`Graphviz SVG lost graph elements: ${formatMetrics('candidate', metrics)}`);
  }
  const temporaryPath = `${outputPath}.tmp`;
  try {
    writeFileSync(temporaryPath, result.stdout, 'utf8');
    renameSync(temporaryPath, outputPath);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
  return { candidate: metrics, reference };
}

function localSources(artifact) {
  return artifact.modules
    .map(({ source }) => typeof source === 'string' ? normalize(source) : '')
    .filter((source) => source && !isExternal(source));
}

function modulesCount(artifact) {
  return localSources(artifact).length;
}

function edgesCount(artifact) {
  const sources = new Set(localSources(artifact));
  return artifact.modules.reduce((count, module) => count + (module.dependencies ?? []).filter(({ resolved }) => (
    typeof resolved === 'string' && sources.has(normalize(resolved))
  )).length, 0);
}

function directoryCount(artifact) {
  const directories = new Set();
  for (const source of localSources(artifact)) {
    let directory = directoryOf(source);
    while (directory) {
      directories.add(directory);
      directory = directoryOf(directory);
    }
  }
  return directories.size;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arguments_ = process.argv.slice(2);
  const referenceFlag = arguments_.indexOf('--layout-reference');
  const referenceArgument = referenceFlag < 0 ? undefined : arguments_[referenceFlag + 1];
  if (!referenceArgument) throw new Error('--layout-reference requires an SVG path');
  if (referenceFlag >= 0) arguments_.splice(referenceFlag, 2);
  if (arguments_.length > 2) throw new Error('Usage: experiment-maritime-layout.mjs [input.json] [output.svg] --layout-reference reference.svg');
  const inputPath = path.resolve(arguments_[0] ?? '.maritime/dependency-graph.json');
  const outputPath = path.resolve(arguments_[1] ?? 'docs/images/dependency-graph.candidate.svg');
  const { candidate, reference } = renderCandidate(inputPath, outputPath, 'dot', path.resolve(referenceArgument));
  console.log(`Rendered ${path.relative(process.cwd(), outputPath) || outputPath} from ${path.relative(process.cwd(), inputPath) || inputPath}`);
  console.log(formatMetrics('reference', reference));
  console.log(formatMetrics('candidate', candidate));
}
