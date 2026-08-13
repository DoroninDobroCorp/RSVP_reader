import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../../app-base-url.js';

const { getAppBaseUrl, resolveAppPath } = globalThis;
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('VAL-R2-PWA-001: Dynamic Base URL Path Resolution (getAppBaseUrl) across Root / and Subpath /rsvp/', () => {
    assert.equal(getAppBaseUrl('http://localhost:3100/'), '');
    assert.equal(getAppBaseUrl('http://localhost:3100/index.html'), '');
    assert.equal(getAppBaseUrl('http://localhost:3100/ru/'), '');
    assert.equal(getAppBaseUrl('http://localhost:3100/ru/index.html'), '');
    assert.equal(getAppBaseUrl('http://localhost:3100/es/'), '');
    assert.equal(getAppBaseUrl('http://localhost:3100/es/privacy.html'), '');
    assert.equal(getAppBaseUrl('http://localhost:3100/privacy.html'), '');

    // Nested base path deployment (/rsvp/)
    assert.equal(getAppBaseUrl('http://localhost:3100/rsvp/'), '/rsvp');
    assert.equal(getAppBaseUrl('http://localhost:3100/rsvp/index.html'), '/rsvp');
    assert.equal(getAppBaseUrl('http://localhost:3100/rsvp/ru/'), '/rsvp');
    assert.equal(getAppBaseUrl('http://localhost:3100/rsvp/ru/index.html'), '/rsvp');
    assert.equal(getAppBaseUrl('http://localhost:3100/rsvp/es/privacy.html'), '/rsvp');

    // Resolving relative paths against appBaseUrl
    assert.equal(resolveAppPath('sample_text_es.txt', 'http://localhost:3100/es/'), '/sample_text_es.txt');
    assert.equal(resolveAppPath('api/article', 'http://localhost:3100/ru/'), '/api/article');
    assert.equal(resolveAppPath('service-worker.js', 'http://localhost:3100/ru/'), '/service-worker.js');
    assert.equal(resolveAppPath('downloads/hummingread-tester.zip', 'http://localhost:3100/es/'), '/downloads/hummingread-tester.zip');

    // Resolving relative paths against nested base path (/rsvp/)
    assert.equal(resolveAppPath('sample_text_es.txt', 'http://localhost:3100/rsvp/es/'), '/rsvp/sample_text_es.txt');
    assert.equal(resolveAppPath('api/article', 'http://localhost:3100/rsvp/ru/'), '/rsvp/api/article');
    assert.equal(resolveAppPath('service-worker.js', 'http://localhost:3100/rsvp/ru/'), '/rsvp/service-worker.js');
});

test('VAL-R2-PWA-002: Base-Aware Service Worker Registration & Scope Invariance under / and /rsvp/', () => {
    const rootBase = getAppBaseUrl('http://localhost:3100/ru/');
    assert.equal(`${rootBase}/service-worker.js`, '/service-worker.js');
    const rootScope = rootBase ? (rootBase.endsWith('/') ? rootBase : `${rootBase}/`) : '/';
    assert.equal(rootScope, '/');
    assert.ok(rootScope.endsWith('/'), 'Root scope must end with a trailing slash');

    const subpathBase = getAppBaseUrl('http://localhost:3100/rsvp/ru/');
    assert.equal(`${subpathBase}/service-worker.js`, '/rsvp/service-worker.js');
    const subpathScope = subpathBase ? (subpathBase.endsWith('/') ? subpathBase : `${subpathBase}/`) : '/';
    assert.equal(subpathScope, '/rsvp/');
    assert.ok(subpathScope.endsWith('/'), 'Subpath scope under /rsvp/ must end with a trailing slash');
});

test('VAL-R2-SW-SCOPE-001: app.js Service Worker Scope Trailing Slash Compliance', async () => {
    const appJsContent = await readFile(join(root, 'app.js'), 'utf8');
    assert.match(appJsContent, /registerServiceWorker/);
    const scopeCalculationRegex = /swScope\s*=\s*(?:rawBase\s*\?\s*\(rawBase\.endsWith\(['"]\/['"]\)\s*\?\s*rawBase\s*:\s*`\${rawBase}\/`\)\s*:\s*['"]\/['"]|`\${getAppBaseUrl\(\)}\/`)/;
    assert.ok(
        scopeCalculationRegex.test(appJsContent) || appJsContent.includes('rawBase.endsWith(\'/\') ? rawBase : `${rawBase}/`'),
        'app.js must compute swScope with a trailing slash when getAppBaseUrl() returns a non-empty subpath'
    );
});
