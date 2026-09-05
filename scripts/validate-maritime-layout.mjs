#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function decodeXml(value) {
  return value
    .replaceAll('&#45;', '-')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');
}

export function inspectSvg(svg) {
  const dimensions = svg.match(/<svg\s+width="([\d.]+)pt"\s+height="([\d.]+)pt"/u);
  if (!dimensions) throw new Error('Graphviz SVG is missing point dimensions');

  const namespaces = [...svg.matchAll(/<g\s+id="[^"]+"\s+class="cluster">\s*<title>cluster:([^<]+)<\/title>/gu)]
    .map((match) => decodeXml(match[1]))
    .sort();

  return {
    width: Number(dimensions[1]),
    height: Number(dimensions[2]),
    aspectRatio: Number(dimensions[1]) / Number(dimensions[2]),
    nodes: (svg.match(/<g\s+id="node\d+"\s+class="node">/gu) ?? []).length,
    edges: (svg.match(/<g\s+id="edge\d+"\s+class="edge">/gu) ?? []).length,
    clusters: (svg.match(/<g\s+id="[^"]+"\s+class="cluster">/gu) ?? []).length,
    namespaces,
  };
}

function expectedCompactTopology(graph, sourceRoot = 'src') {
  const modules = (graph.modules ?? [])
    .filter((module) => typeof module.source === 'string' && module.source.startsWith(`${sourceRoot}/`));
  const sources = new Set(modules.map((module) => module.source));
  const namespaces = new Set();
  const edges = new Set();

  for (const module of modules) {
    let directory = module.source.slice(0, module.source.lastIndexOf('/'));
    while (directory) {
      if (directory !== sourceRoot) namespaces.add(directory);
      const separator = directory.lastIndexOf('/');
      if (separator < 0) break;
      directory = directory.slice(0, separator);
    }

    for (const dependency of module.dependencies ?? []) {
      if (sources.has(dependency.resolved)) {
        edges.add(`${module.source}\0${dependency.resolved}`);
      }
    }
  }

  return {
    nodes: modules.length,
    edges: edges.size,
    namespaces: [...namespaces].sort(),
  };
}

export function validateCompactLayout({ graph, referenceSvg, candidateSvg, relativeTolerance = 0.1 }) {
  const reference = inspectSvg(referenceSvg);
  const candidate = inspectSvg(candidateSvg);
  const expected = expectedCompactTopology(graph);
  const errors = [];

  if (candidate.nodes !== expected.nodes) {
    errors.push(`candidate has ${candidate.nodes} nodes; canonical graph expects ${expected.nodes}`);
  }
  if (candidate.edges !== expected.edges) {
    errors.push(`candidate has ${candidate.edges} edges; canonical semantic pairs expect ${expected.edges}`);
  }
  if (candidate.clusters !== expected.namespaces.length) {
    errors.push(`candidate has ${candidate.clusters} clusters; canonical graph expects ${expected.namespaces.length}`);
  }
  if (JSON.stringify(candidate.namespaces) !== JSON.stringify(expected.namespaces)) {
    errors.push('candidate cluster namespaces do not match canonical recursive folders');
  }
  if (candidate.namespaces.includes('src')) {
    errors.push('compact profile must elide the redundant sole src source-root wrapper');
  }

  const aspectDifference = Math.abs(candidate.aspectRatio - reference.aspectRatio) / reference.aspectRatio;
  if (aspectDifference > relativeTolerance) {
    errors.push(`candidate aspect ${candidate.aspectRatio.toFixed(3)} differs from reference ${reference.aspectRatio.toFixed(3)} by ${(aspectDifference * 100).toFixed(1)}%`);
  }

  return { errors, reference, candidate, expected, aspectDifference };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const graph = JSON.parse(readFileSync('.maritime/dependency-graph.json', 'utf8'));
  const referenceSvg = readFileSync('docs/images/dependency-graph.reference.svg', 'utf8');
  const candidateSvg = readFileSync('docs/images/dependency-graph.svg', 'utf8');
  const result = validateCompactLayout({ graph, referenceSvg, candidateSvg });

  if (result.errors.length > 0) {
    throw new Error(`Maritime compact layout fidelity failed:\n- ${result.errors.join('\n- ')}`);
  }

  console.log(
    `Maritime compact layout verified: ${result.candidate.nodes} nodes, ${result.candidate.edges} edges, ${result.candidate.clusters} namespaces, aspect delta ${(result.aspectDifference * 100).toFixed(2)}%.`,
  );
}
