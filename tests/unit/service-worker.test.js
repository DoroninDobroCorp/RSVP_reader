const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { test } = require('node:test');
const vm = require('node:vm');

test('service worker returns the cached app shell when navigation receives HTTP 503', async () => {
  const source = await readFile(new URL('../../service-worker.js', `file://${__dirname}/`), 'utf8');
  const cachedShell = { status: 200, marker: 'cached-shell' };
  const context = vm.createContext({
    URL,
    Promise,
    console,
    self: {
      location: { origin: 'https://reader.example' },
      addEventListener() {},
      skipWaiting() {},
      clients: { claim() {} }
    },
    caches: {
      async match(key) {
        return key === './index.html' ? cachedShell : null;
      },
      async open() {
        return { async put() {} };
      },
      async keys() {
        return [];
      }
    },
    fetch: async () => ({
      status: 503,
      ok: false,
      headers: { get: () => 'text/plain' },
      clone() { return this; }
    })
  });
  vm.runInContext(source, context);

  const response = await context.handleNavigation({
    url: 'https://reader.example/',
    mode: 'navigate'
  });
  assert.equal(response, cachedShell);
});
