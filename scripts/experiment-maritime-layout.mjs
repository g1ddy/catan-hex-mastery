#!/usr/bin/env node
/* global console, process */

/**
 * Experimental module-level Maritime graph renderer.
 *
 * Prerequisite: Graphviz's `dot` executable must be on PATH.
 * Run: node scripts/experiment-maritime-layout.mjs
 *
 * The canonical input and separate candidate output can also be overridden:
 * node scripts/experiment-maritime-layout.mjs input.json output.svg
 */

import { readFileSync, writeFileSync } from 'node:fs';
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

export function generateDot(artifact) {
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

  const lines = [
    'digraph dependencies {',
    '  graph [rankdir=TB, compound=true, remincross=true, outputorder=edgesfirst, splines=polyline, nodesep=0.10, ranksep=0.28, pad=0.10, bgcolor="transparent"];',
    '  node [shape=box, style="rounded,filled", fillcolor="#ffffff", color="#8b95a5", fontname="Helvetica", fontsize=8, margin="0.06,0.035", height=0.20];',
    '  edge [color="#9aa3b2", penwidth=0.65, arrowsize=0.45];',
  ];

  const renderBranch = (branch, indentation) => {
    const prefix = ' '.repeat(indentation);
    for (const child of [...branch.children.values()].sort((a, b) => a.path.localeCompare(b.path))) {
      lines.push(`${prefix}subgraph ${clusterIds.get(child.path)} {`);
      lines.push(`${prefix}  label=${quote(path.posix.basename(child.path))}; color="#c8ced8"; fontcolor="#596273"; fontname="Helvetica"; fontsize=9; penwidth=0.8; margin=6;`);
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

export function renderCandidate(inputPath, outputPath, dotCommand = 'dot') {
  const artifact = JSON.parse(readFileSync(inputPath, 'utf8'));
  const dot = generateDot(artifact);
  const result = spawnSync(dotCommand, ['-Tsvg'], { input: dot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw new Error(`Unable to invoke Graphviz ${quote(dotCommand)}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Graphviz failed with status ${result.status}: ${result.stderr.trim()}`);
  writeFileSync(outputPath, result.stdout, 'utf8');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const inputPath = path.resolve(process.argv[2] ?? '.maritime/dependency-graph.json');
  const outputPath = path.resolve(process.argv[3] ?? 'docs/images/dependency-graph.candidate.svg');
  renderCandidate(inputPath, outputPath);
  console.log(`Rendered ${path.relative(process.cwd(), outputPath) || outputPath} from ${path.relative(process.cwd(), inputPath) || inputPath}`);
}
