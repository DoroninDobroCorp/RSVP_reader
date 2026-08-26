const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { test } = require('node:test');

test('cache reset page refreshes only disposable app caches and preserves reader data', async () => {
  const source = await readFile(new URL('../../reset.html', `file://${__dirname}/`), 'utf8');

  assert.match(source, /navigator\.serviceWorker\.getRegistrations\(\)/u);
  assert.match(source, /registration\.unregister\(\)/u);
  assert.match(source, /caches\.keys\(\)/u);
  assert.match(source, /\^\(\?:hummingread\|paceflow\)-reader-/u);
  assert.match(source, /caches\.delete\(name\)/u);
  assert.match(source, /location\.replace\(target\.href\)/u);
  assert.doesNotMatch(source, /indexedDB\.deleteDatabase|localStorage\.clear|sessionStorage\.clear/u);
});

test('cache reset page is web-only and served as a public file', async () => {
  const [webBuild, nativeBuild, server] = await Promise.all([
    readFile(new URL('../../scripts/build-web.mjs', `file://${__dirname}/`), 'utf8'),
    readFile(new URL('../../scripts/build-native.mjs', `file://${__dirname}/`), 'utf8'),
    readFile(new URL('../../server.js', `file://${__dirname}/`), 'utf8')
  ]);

  assert.match(webBuild, /'reset\.html'/u);
  assert.match(nativeBuild, /'reset\.html'/u);
  assert.match(server, /'reset\.html'/u);
});
