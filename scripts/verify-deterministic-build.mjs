import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'dist');

async function build() {
  const child = spawn(process.execPath, ['scripts/build-web.mjs'], {
    cwd: root,
    env: process.env,
    stdio: ['ignore', 'ignore', 'pipe']
  });
  let standardError = '';
  child.stderr.on('data', (chunk) => { standardError += chunk; });
  const exitCode = await new Promise((resolve) => child.once('exit', resolve));
  if (exitCode !== 0) {
    throw new Error(`Web build failed (${exitCode}): ${standardError.trim()}`);
  }
}

async function filesIn(directory, base = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(absolute, base));
    if (entry.isFile()) files.push(relative(base, absolute).split('\\').join('/'));
  }
  return files.sort();
}

async function digestTree() {
  const hash = createHash('sha256');
  const files = await filesIn(output);
  for (const file of files) {
    const contents = await readFile(join(output, file));
    hash.update(`${file}\0${contents.length}\0`);
    hash.update(contents);
  }
  return { digest: hash.digest('hex'), count: files.length };
}

import { packageReleaseR4 } from './package-release-r4.mjs';

await build();
const first = await digestTree();
await build();
const second = await digestTree();

if (first.digest !== second.digest || first.count !== second.count) {
  throw new Error(`Build output changed across consecutive runs: ${first.digest} != ${second.digest}.`);
}

console.log(`Verified deterministic web/extension output: ${second.count} files, SHA-256 ${second.digest}.`);

console.log('Running reproducible remote-SHA build and packaging audit...');
await packageReleaseR4();

