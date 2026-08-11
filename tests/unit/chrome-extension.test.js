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
  assert.throws(() => Core.normalizePayload({ type: 'text', text: '' }), /Select, copy, or paste/u);
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

test('Chrome handoff tokens are secure, scoped, and URL-safe', () => {
  const provider = {
    getRandomValues(bytes) {
      bytes.forEach((unused, index) => { bytes[index] = index; });
      return bytes;
    }
  };
  const nonce = Core.createNonce(provider);
  assert.equal(nonce, '000102030405060708090a0b0c0d0e0f');
  assert.equal(Core.storageKey(nonce), `paceflow-pending:${nonce}`);
  const target = new URL(Core.buildHandoffUrl(nonce));
  assert.equal(target.origin, 'https://145.239.82.124.sslip.io');
  assert.equal(target.pathname, '/rsvp/');
  assert.equal(target.searchParams.get(Core.HANDOFF_PARAM), nonce);
  assert.throws(() => Core.storageKey('../bad-token'), /Invalid handoff token/u);
});

test('Manifest V3 requests only explicit interaction and PaceFlow host access', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.service_worker, 'background.js');
  assert.equal(manifest.minimum_chrome_version, '102');
  assert.deepEqual(
    [...manifest.permissions].sort(),
    ['activeTab', 'alarms', 'clipboardRead', 'contextMenus', 'scripting', 'storage'].sort()
  );
  assert.equal(manifest.permissions.includes('tabs'), false);
  assert.equal(manifest.permissions.includes('history'), false);
  assert.equal(JSON.stringify(manifest).includes('<all_urls>'), false);
  assert.deepEqual(manifest.host_permissions, ['https://145.239.82.124.sslip.io/rsvp/*']);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://145.239.82.124.sslip.io/rsvp/*']);
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(extensionRoot, '_locales/en/messages.json'), 'utf8')));
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(extensionRoot, '_locales/ru/messages.json'), 'utf8')));
});
