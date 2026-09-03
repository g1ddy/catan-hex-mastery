#!/usr/bin/env node
/* global console, process */

/**
 * Render the reference, current Maritime output, and compact experiments to equally wide PNGs.
 * Prerequisites: Inkscape and ImageMagick's `magick` executable on PATH.
 * Run: node scripts/render-maritime-layout-previews.mjs
 */

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outputDirectory = path.resolve(process.argv[2] ?? 'docs/images/layout-previews');
const inputs = [
  ['reference', 'docs/images/dependency-graph.reference.svg'],
  ['beta7', 'docs/images/dependency-graph.svg'],
  ['compact', 'docs/images/dependency-graph.candidate-compact.svg'],
  ['compact-no-src-wrapper', 'docs/images/dependency-graph.candidate-compact-no-src-wrapper.svg'],
  ['compact-production-filter', 'docs/images/dependency-graph.candidate-compact-production-filter.svg'],
  ['compact-edge-hierarchy', 'docs/images/dependency-graph.candidate-compact-edge-hierarchy.svg'],
  ['compact-cluster-packing', 'docs/images/dependency-graph.candidate-compact-cluster-packing.svg'],
  ['compact-reference-spacing', 'docs/images/dependency-graph.candidate-compact-reference-spacing.svg'],
];

function run(command, arguments_) {
  const result = spawnSync(command, arguments_, { encoding: 'utf8' });
  if (result.error) throw new Error(`Unable to invoke ${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} failed with status ${result.status}: ${result.stderr.trim()}`);
}

mkdirSync(outputDirectory, { recursive: true });
const previews = [];
for (const [name, input] of inputs) {
  const preview = path.join(outputDirectory, `${name}.png`);
  run('inkscape', [path.resolve(input), '--export-type=png', `--export-filename=${preview}`, '--export-width=1200', '--export-background=white']);
  previews.push(preview);
}
const comparison = path.join(outputDirectory, 'comparison.png');
run('magick', ['montage', ...previews, '-tile', '2x', '-geometry', '+24+24', comparison]);
console.log(`Rendered ${path.relative(process.cwd(), comparison)}`);
