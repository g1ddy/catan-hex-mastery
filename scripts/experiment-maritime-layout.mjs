#!/usr/bin/env node
/* global console, process */

/**
 * Experimental module-level Maritime graph renderer.
 *
 * Prerequisite: Graphviz's `dot` executable must be on PATH.
 * Run: node scripts/experiment-maritime-layout.mjs
 *
 * The canonical input, candidate output, and optional reference can be overridden:
 * node scripts/experiment-maritime-layout.mjs input.json output.svg --variant compact --layout-reference reference.svg
 */

import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const quote = (value) => `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
const normalize = (value) => value.replaceAll('\\', '/');

const COMPACT = Object.freeze({
  splines: 'true',
  overlap: 'false',
  nodesep: 0.10,
  ranksep: 0.12,
  clusterMargin: 4,
  omitSrcWrapper: false,
  productionFilter: false,
  edgeHierarchy: false,
  dependencyCruiserPacking: false,
});

export const LAYOUT_VARIANTS = Object.freeze({
  compact: COMPACT,
  'compact-no-src-wrapper': Object.freeze({ ...COMPACT, omitSrcWrapper: true }),
  'compact-production-filter': Object.freeze({ ...COMPACT, productionFilter: true }),
  'compact-edge-hierarchy': Object.freeze({ ...COMPACT, edgeHierarchy: true }),
  'compact-cluster-packing': Object.freeze({ ...COMPACT, dependencyCruiserPacking: true }),
  'compact-reference-spacing': Object.freeze({ ...COMPACT, nodesep: 0.16, ranksep: 0.18, clusterMargin: 6 }),
});

function resolveVariant(variant = 'compact') {
  const configuration = LAYOUT_VARIANTS[variant];
  if (!configuration) throw new Error(`Unknown layout variant: ${variant}`);
  return configuration;
}

function nodeFillColor(source) {
  if (source.startsWith('src/features/')) return '#bbfeff';
  if (source.startsWith('src/game/')) return '#ddfeff';
  if (source.startsWith('src/bots/')) return '#fff2b2';
  return '#ffffcc';
}

function directoryOf(modulePath) {
  const separator = modulePath.lastIndexOf('/');
  return separator < 0 ? '' : modulePath.slice(0, separator);
}

function displayName(modulePath) {
  return path.posix.basename(modulePath);
}

function isExternal(modulePath) {
  return modulePath === 'node_modules' || modulePath.startsWith('node_modules/');
}

function isProductionExcluded(modulePath) {
  return /(^|\/)(?:__tests__\/|.*\.(?:test|spec)\.[cm]?[jt]sx?$)/u.test(modulePath)
    || /(^|\/)testUtils\.[cm]?[jt]sx?$/u.test(modulePath);
}

function selectModules(artifact, layout) {
  if (!Array.isArray(artifact?.modules)) {
    throw new TypeError('Maritime artifact must contain a modules array');
  }

  return artifact.modules
    .filter(({ source }) => typeof source === 'string')
    .map((module) => ({ ...module, source: normalize(module.source) }))
    .filter(({ source }) => !isExternal(source))
    .filter(({ source }) => !layout.productionFilter || !isProductionExcluded(source))
    .sort((left, right) => left.source.localeCompare(right.source));
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

function collectDirectoryPaths(modules, layout) {
  const directories = new Set();
  for (const module of modules) {
    let directory = directoryOf(module.source);
    while (directory) {
      if (!(layout.omitSrcWrapper && directory === 'src')) directories.add(directory);
      directory = directoryOf(directory);
    }
  }
  return [...directories].sort();
}

function buildTree(modules) {
  const root = { path: '', children: new Map(), modules: [] };
  for (const module of modules) {
    addDirectory(root, directoryOf(module.source)).modules.push(module);
  }
  return root;
}

function dependencyIsTypeOnly(dependency) {
  return Array.isArray(dependency?.dependencyTypes) && dependency.dependencyTypes.includes('type-only');
}

function collectEdges(modules, moduleIds) {
  const edges = new Map();
  for (const module of modules) {
    for (const dependency of module.dependencies ?? []) {
      const target = typeof dependency.resolved === 'string' ? normalize(dependency.resolved) : '';
      if (!moduleIds.has(target)) continue;

      const key = `${module.source}\0${target}`;
      const previous = edges.get(key);
      const typeOnly = dependencyIsTypeOnly(dependency);
      edges.set(key, {
        typeOnly: previous ? previous.typeOnly && typeOnly : typeOnly,
      });
    }
  }
  return edges;
}

export function generateDot(artifact, variant = 'compact') {
  const layout = resolveVariant(variant);
  const modules = selectModules(artifact, layout);
  const moduleIds = new Map(modules.map((module, index) => [module.source, `module_${index}`]));
  const directories = collectDirectoryPaths(modules, layout);
  const clusterIds = new Map(directories.map((directory, index) => [directory, `cluster_${index}`]));
  const root = buildTree(modules);

  const lines = [
    'strict digraph dependencies {',
    `  graph [rankdir=LR, compound=true, splines=${layout.splines}, overlap=${layout.overlap}, nodesep=${layout.nodesep}, ranksep=${layout.ranksep}, pad=0.10, bgcolor="transparent", fontname="Helvetica-bold", fontsize=9, outputorder=edgesfirst];`,
    '  node [shape=box, style="rounded,filled", color="black", fillcolor="#ffffcc", fontcolor="black", fontname="Helvetica", fontsize=9, margin="0.06,0.035", height=0.20];',
    '  edge [arrowhead="normal", arrowsize=0.6, penwidth=1.2, color="#00000044"];',
  ];

  const pushClusterAttributes = (directory, indentation) => {
    const prefix = ' '.repeat(indentation);
    const id = clusterIds.get(directory);
    lines.push(`${prefix}id=${quote(id)}; label=${quote(path.posix.basename(directory))}; tooltip=${quote(directory)}; color="#c8ced8"; fontcolor="#596273"; fontname="Helvetica"; fontsize=9; penwidth=0.8; margin=${layout.clusterMargin};`);
  };

  const pushModule = (module, indentation) => {
    const prefix = ' '.repeat(indentation);
    lines.push(`${prefix}${moduleIds.get(module.source)} [label=${quote(displayName(module.source))}, tooltip=${quote(module.source)}, fillcolor=${quote(nodeFillColor(module.source))}];`);
  };

  const renderTree = (branch, indentation) => {
    const prefix = ' '.repeat(indentation);
    for (const child of [...branch.children.values()].sort((a, b) => a.path.localeCompare(b.path))) {
      if (layout.omitSrcWrapper && child.path === 'src') {
        renderTree(child, indentation);
        continue;
      }
      lines.push(`${prefix}subgraph ${quote(`cluster_${child.path}`)} {`);
      pushClusterAttributes(child.path, indentation + 2);
      renderTree(child, indentation + 2);
      lines.push(`${prefix}}`);
    }
    for (const module of branch.modules.sort((a, b) => a.source.localeCompare(b.source))) {
      pushModule(module, indentation);
    }
  };

  const renderDependencyCruiserClusters = () => {
    for (const module of modules) {
      const nestedDirectories = [];
      let directory = directoryOf(module.source);
      while (directory) {
        nestedDirectories.unshift(directory);
        directory = directoryOf(directory);
      }

      let indentation = 2;
      let opened = 0;
      for (const nestedDirectory of nestedDirectories) {
        if (layout.omitSrcWrapper && nestedDirectory === 'src') continue;
        const prefix = ' '.repeat(indentation);
        lines.push(`${prefix}subgraph ${quote(`cluster_${nestedDirectory}`)} {`);
        pushClusterAttributes(nestedDirectory, indentation + 2);
        indentation += 2;
        opened += 1;
      }
      pushModule(module, indentation);
      while (opened > 0) {
        indentation -= 2;
        lines.push(`${' '.repeat(indentation)}}`);
        opened -= 1;
      }
    }
  };

  if (layout.dependencyCruiserPacking) renderDependencyCruiserClusters();
  else renderTree(root, 2);

  const edges = collectEdges(modules, moduleIds);
  for (const [edgeKey, metadata] of [...edges.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const [source, target] = edgeKey.split('\0');
    const attributes = layout.edgeHierarchy && metadata.typeOnly
      ? ' [style="dashed", color="#aaaaaa", penwidth=0.8]'
      : '';
    lines.push(`  ${moduleIds.get(source)} -> ${moduleIds.get(target)}${attributes};`);
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

export function retainedLocalModulePaths(artifact, variant = 'compact') {
  return selectModules(artifact, resolveVariant(variant)).map(({ source }) => source);
}

export function recursiveFolderNamespaces(artifact, variant = 'compact') {
  return collectDirectoryPaths(selectModules(artifact, resolveVariant(variant)), resolveVariant(variant));
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

export function assertLayoutCompatibility(referenceSvg, candidateSvg, artifact, relativeTolerance = 0.1, variant = 'compact') {
  const expectedModules = retainedLocalModulePaths(artifact, variant);
  const expectedNamespaces = recursiveFolderNamespaces(artifact, variant);
  return assertSvgCompatibility(referenceSvg, candidateSvg, {
    moduleCount: expectedModules.length,
    namespaces: expectedNamespaces,
  }, relativeTolerance);
}

function expectedGraphCounts(artifact, variant) {
  const layout = resolveVariant(variant);
  const modules = selectModules(artifact, layout);
  const moduleIds = new Map(modules.map((module, index) => [module.source, `module_${index}`]));
  return {
    nodes: modules.length,
    edges: collectEdges(modules, moduleIds).size,
    clusters: collectDirectoryPaths(modules, layout).length,
  };
}

function formatMetrics(label, metrics) {
  return `${label}: ${metrics.width} × ${metrics.height} pt; ${metrics.nodes} nodes, ${metrics.edges} edges, ${metrics.clusters} clusters; aspect ${metrics.aspectRatio.toFixed(3)}`;
}

export function renderCandidate(inputPath, outputPath, dotCommand = 'dot', layoutReferencePath, variant = 'compact') {
  const artifact = JSON.parse(readFileSync(inputPath, 'utf8'));
  const reference = layoutReferencePath ? inspectSvg(readFileSync(layoutReferencePath, 'utf8')) : undefined;
  const dot = generateDot(artifact, variant);
  const result = spawnSync(dotCommand, ['-Tsvg'], { input: dot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw new Error(`Unable to invoke Graphviz ${quote(dotCommand)}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Graphviz failed with status ${result.status}: ${result.stderr.trim()}`);
  const metrics = inspectSvg(result.stdout);
  const expected = expectedGraphCounts(artifact, variant);
  if (metrics.nodes !== expected.nodes || metrics.edges !== expected.edges || metrics.clusters !== expected.clusters) {
    throw new Error(`Graphviz SVG lost graph elements: ${formatMetrics('candidate', metrics)}; expected ${expected.nodes} nodes, ${expected.edges} edges, ${expected.clusters} clusters`);
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

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arguments_ = process.argv.slice(2);
  const readFlag = (name) => {
    const index = arguments_.indexOf(name);
    if (index < 0) return undefined;
    const value = arguments_[index + 1];
    if (!value) throw new Error(`${name} requires a value`);
    arguments_.splice(index, 2);
    return value;
  };
  const referenceArgument = readFlag('--layout-reference');
  const variant = readFlag('--variant') ?? 'compact';
  if (arguments_.length > 2) throw new Error('Usage: experiment-maritime-layout.mjs [input.json] [output.svg] [--layout-reference reference.svg] [--variant name]');
  const inputPath = path.resolve(arguments_[0] ?? '.maritime/dependency-graph.json');
  const outputPath = path.resolve(arguments_[1] ?? 'docs/images/dependency-graph.candidate-compact.svg');
  const { candidate, reference } = renderCandidate(
    inputPath,
    outputPath,
    'dot',
    referenceArgument ? path.resolve(referenceArgument) : undefined,
    variant,
  );
  console.log(`Rendered ${path.relative(process.cwd(), outputPath) || outputPath} from ${path.relative(process.cwd(), inputPath) || inputPath}`);
  if (reference) console.log(formatMetrics('reference', reference));
  console.log(formatMetrics('candidate', candidate));
}
