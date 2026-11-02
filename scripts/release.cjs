'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

async function main() {
  const root = path.resolve(__dirname, '..');
  const version = require('../std-lint/package.json').version;
  const directory = path.join(root, 'dist', `std-lint-${version}`);
  // Only our generated versioned output is replaced.
  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });
  await fs.cp(path.join(root, 'std-lint'), path.join(directory, 'std-lint'), { recursive: true });
  const archive = path.join(root, 'dist', `std-lint-${version}.tar.gz`);
  execFileSync('tar', ['-czf', archive, '-C', directory, 'std-lint']);
  console.log(directory);
  console.log(archive);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
