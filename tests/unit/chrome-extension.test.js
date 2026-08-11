const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Core = require('../../chrome-extension/core.js');
const extensionRoot = path.join(__dirname, '..', '..', 'chrome-extension');

test('Chrome handoff normalizes text without broadening its source URL', () => {
  const payload = Core.normalizePayload({
    type: 'text',
    text: '\0  First paragraph.\n\nSecond paragraph.  ',
    title: '  Useful\nselection  ',
    sourceUrl: 'https://example.com/article#comments'
  });
  assert.deepEqual(payload, {
    type: 'text',
    text: 'First paragraph.\n\nSecond paragraph.',
    title: 'Useful selection',
    sourceUrl: 'https://example.com/article'
  });
  assert.throws(() => Core.normalizePayload({ type: 'text', text: '' }), /Select or paste/u);
  assert.throws(
    () => Core.normalizePayload({ type: 'text', text: 'x'.repeat(Core.MAX_TEXT_CHARACTERS + 1) }),
    /too large/u
  );
  assert.equal(Core.normalizePayload({ type: 'text', text: 'Copied safely', sourceUrl: 'chrome://newtab' }).sourceUrl, '');
});

test('Chrome article handoff accepts only credential-free HTTP(S) URLs', () => {
  assert.deepEqual(Core.normalizePayload({ type: 'url', url: 'https://example.com/story#footer' }), {
    type: 'url',
    url: 'https://example.com/story',
    title: 'example.com',
    sourceUrl: 'https://example.com/story'
  });
  assert.throws(() => Core.normalizePayload({ type: 'url', url: 'file:///etc/passwd' }), /HTTP and HTTPS/u);
  assert.throws(() => Core.normalizePayload({ type: 'url', url: 'https://user:pass@example.com/' }), /credential-free/u);
});

test('Chrome handoff and reader tokens are secure, scoped, and URL-safe', () => {
  const provider = {
    getRandomValues(bytes) {
      bytes.forEach((unused, index) => { bytes[index] = index; });
      return bytes;
    }
  };
  const nonce = Core.createNonce(provider);
  assert.equal(nonce, '000102030405060708090a0b0c0d0e0f');
  assert.equal(Core.handoffStorageKey(nonce), `hummingread-pending:${nonce}`);
  assert.equal(Core.readerStorageKey(nonce), `hummingread-reader:${nonce}`);
  const target = new URL(Core.buildHandoffUrl(nonce, 'https://preview.example/reader/'));
  assert.equal(target.origin, 'https://preview.example');
  assert.equal(target.pathname, '/reader/');
  assert.equal(target.searchParams.get(Core.HANDOFF_PARAM), nonce);
  assert.throws(() => Core.handoffStorageKey('../bad-token'), /Invalid extension token/u);
  assert.throws(() => Core.buildHandoffUrl(nonce), /not configured/u);
});

test('Manifest V3 standalone source uses minimal interaction permissions and no hard-coded host', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.service_worker, 'background.js');
  assert.equal(manifest.minimum_chrome_version, '102');
  assert.deepEqual(
    [...manifest.permissions].sort(),
    ['activeTab', 'alarms', 'contextMenus', 'scripting', 'storage'].sort()
  );
  assert.equal(manifest.permissions.includes('clipboardRead'), false);
  assert.equal(manifest.permissions.includes('tabs'), false);
  assert.equal(manifest.permissions.includes('history'), false);
  assert.equal(JSON.stringify(manifest).includes('<all_urls>'), false);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.match(manifest.content_security_policy.extension_pages, /script-src 'self'/u);
  assert.equal(fs.existsSync(path.join(extensionRoot, 'reader.html')), true);
  assert.equal(fs.existsSync(path.join(extensionRoot, 'reader.js')), true);
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(extensionRoot, '_locales/en/messages.json'), 'utf8')));
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(extensionRoot, '_locales/ru/messages.json'), 'utf8')));
});

test('standalone tokenization yields for large text, supports cancellation, and anchors the focus letter', async () => {
  let eventLoopReleased = false;
  setTimeout(() => { eventLoopReleased = true; }, 0);
  const text = Array.from({ length: 12_000 }, (unused, index) => `word${index}`).join(' ');
  const tokens = await Core.tokenizeTextAsync(text, { yieldEvery: 500 });
  assert.equal(tokens.length, 12_000);
  assert.equal(tokens[11_999], 'word11999');
  assert.equal(eventLoopReleased, true);
  assert.deepEqual(Core.focusSegments('reading'), { before: 're', focus: 'a', after: 'ding' });

  let checks = 0;
  await assert.rejects(
    Core.tokenizeTextAsync(text, { isCancelled: () => ++checks > 700 }),
    /cancelled/u
  );
});

test('protected URLs are rejected before scripting and local HTTP pages remain extractable', () => {
  assert.match(Core.isExtractablePageUrl('chrome://settings').reason, /protects/u);
  assert.match(Core.isExtractablePageUrl('https://example.com/report.pdf').reason, /PDF/u);
  assert.deepEqual(Core.isExtractablePageUrl('https://example.com/article'), {
    ok: true,
    url: 'https://example.com/article'
  });
});
