import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const packageJsonPath = path.join(rootDir, 'package.json');

// Read version
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;
const outputZipName = `hex-mastery-v${version}.zip`;
const outputZipPath = path.join(rootDir, outputZipName);

console.log(`Packaging version ${version}...`);

// Run build
try {
  console.log('Running build...');
  execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

// Create Zip
const output = fs.createWriteStream(outputZipPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level.
});

output.on('close', function() {
  console.log(`\nArtifact created: ${outputZipName}`);
  console.log(archive.pointer() + ' total bytes');
});

archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn(err);
  } else {
    console.error(err);
  }
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Add the single file from dist
const indexHtmlPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
    archive.file(indexHtmlPath, { name: 'index.html' });
} else {
    console.error(`Error: ${indexHtmlPath} not found! Build might have failed or output changed.`);
    process.exit(1);
}

archive.finalize();
