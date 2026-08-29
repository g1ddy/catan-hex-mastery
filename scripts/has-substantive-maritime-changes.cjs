const { execFileSync } = require('node:child_process');
const { readFileSync, readdirSync } = require('node:fs');
const { join, relative, sep } = require('node:path');

const MARITIME_DIRECTORY = '.maritime';

function normalizeMaritimeContent(filePath, content) {
  if (filePath === 'manifest.json') {
    const manifest = JSON.parse(content);
    delete manifest.generatedAt;
    return `${JSON.stringify(manifest, null, 2)}\n`;
  }

  if (filePath === 'complexity-report.md') {
    return content.replace(/^\*\*Last Updated:\*\* .*$/m, '**Last Updated:** <generated>');
  }

  return content;
}

function compareBundles(baseline, generated) {
  const baselineFiles = [...baseline.keys()].sort();
  const generatedFiles = [...generated.keys()].sort();

  if (JSON.stringify(baselineFiles) !== JSON.stringify(generatedFiles)) {
    return false;
  }

  return baselineFiles.every((filePath) => (
    normalizeMaritimeContent(filePath, baseline.get(filePath))
      === normalizeMaritimeContent(filePath, generated.get(filePath))
  ));
}

function readGeneratedBundle(directory = MARITIME_DIRECTORY) {
  const bundle = new Map();

  function visit(currentDirectory) {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      const absolutePath = join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile()) {
        const filePath = relative(directory, absolutePath).split(sep).join('/');
        bundle.set(filePath, readFileSync(absolutePath, 'utf8'));
      }
    }
  }

  visit(directory);
  return bundle;
}

function readBaselineBundle() {
  const output = execFileSync(
    'git',
    ['ls-tree', '-r', '--name-only', 'HEAD', '--', MARITIME_DIRECTORY],
    { encoding: 'utf8' },
  );
  const bundle = new Map();

  for (const repositoryPath of output.split('\n').filter(Boolean)) {
    const filePath = repositoryPath.slice(`${MARITIME_DIRECTORY}/`.length);
    const content = execFileSync('git', ['show', `HEAD:${repositoryPath}`], { encoding: 'utf8' });
    bundle.set(filePath, content);
  }

  return bundle;
}

if (require.main === module) {
  const unchanged = compareBundles(readBaselineBundle(), readGeneratedBundle());
  console.log(unchanged
    ? 'Maritime comparison outputs have no substantive changes.'
    : 'Maritime comparison outputs contain substantive changes.');
  process.exitCode = unchanged ? 0 : 1;
}

module.exports = { compareBundles, normalizeMaritimeContent };
