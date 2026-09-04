#!/usr/bin/env node
/* global console, process */

/**
 * Render the reference, current Maritime output, and focused no-src experiments to equally wide PNGs.
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
  ['no-src-reference-colors', 'docs/images/dependency-graph.candidate-compact-no-src-reference-colors.svg'],
  ['no-src-reference-theme', 'docs/images/dependency-graph.candidate-compact-no-src-reference-theme.svg'],
  ['no-src-reference-theme-edges', 'docs/images/dependency-graph.candidate-compact-no-src-reference-theme-edges.svg'],
  ['no-src-reference-theme-production', 'docs/images/dependency-graph.candidate-compact-no-src-reference-theme-production.svg'],
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
