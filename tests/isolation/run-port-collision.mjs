import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const fake = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('UNRELATED_PORT_8081_SENTINEL');
});
let ownsFake = false;

try {
  await new Promise((resolve, reject) => {
    fake.once('error', (error) => {
      if (error.code === 'EADDRINUSE') resolve();
      else reject(error);
    });
    fake.listen(8081, '127.0.0.1', () => {
      ownsFake = true;
      resolve();
    });
  });
  const occupied = await fetch('http://127.0.0.1:8081/').catch(() => null);
  assert.ok(occupied, 'The old default port must be occupied during this regression.');
  if (ownsFake) assert.equal(await occupied.text(), 'UNRELATED_PORT_8081_SENTINEL');

  const binary = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
  const child = spawn(binary, [
    'test',
    'tests/test-owned-server.spec.js',
    '--project=chromium'
  ], {
    cwd: root,
    env: { ...process.env, HUMMINGREAD_TEST_PORT: '43181' },
    stdio: 'inherit'
  });
  const exitCode = await new Promise((resolve) => child.once('exit', resolve));
  assert.equal(exitCode, 0, 'Owned-server Playwright regression failed.');
  console.log('Verified an occupied port 8081 cannot be reused by the release test server.');
} finally {
  if (ownsFake) await new Promise((resolve) => fake.close(resolve));
}
