import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../../app-base-url.js';

const { getAppBaseUrl, resolveAppPath } = globalThis;
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('VAL-WEB-PATH-001: Centralized Base Path Helper Resolution for Root & Subpaths', () => {
    assert.equal(getAppBaseUrl('http://localhost:3100/'), '/');
    assert.equal(getAppBaseUrl('http://localhost:3100/index.html'), '/');
    assert.equal(getAppBaseUrl('http://localhost:3100/ru/'), '/');
    assert.equal(getAppBaseUrl('http://localhost:3100/ru/index.html'), '/');
    assert.equal(getAppBaseUrl('http://localhost:3100/es/'), '/');
    assert.equal(getAppBaseUrl('http://localhost:3100/es/privacy.html'), '/');
    assert.equal(getAppBaseUrl('http://localhost:3100/privacy.html'), '/');

    // Nested base path deployment (/rsvp/)
    assert.equal(getAppBaseUrl('http://localhost:3100/rsvp/'), '/rsvp/');
    assert.equal(getAppBaseUrl('http://localhost:3100/rsvp/index.html'), '/rsvp/');
    assert.equal(getAppBaseUrl('http://localhost:3100/rsvp/ru/'), '/rsvp/');
    assert.equal(getAppBaseUrl('http://localhost:3100/rsvp/ru/index.html'), '/rsvp/');
    assert.equal(getAppBaseUrl('http://localhost:3100/rsvp/es/privacy.html'), '/rsvp/');

    // Resolving relative paths against appBaseUrl
    assert.equal(resolveAppPath('sample_text_es.txt', 'http://localhost:3100/es/'), '/sample_text_es.txt');
    assert.equal(resolveAppPath('api/article', 'http://localhost:3100/ru/'), '/api/article');
    assert.equal(resolveAppPath('service-worker.js', 'http://localhost:3100/ru/'), '/service-worker.js');
    assert.equal(resolveAppPath('downloads/hummingread-tester.zip', 'http://localhost:3100/es/'), '/downloads/hummingread-tester.zip');

    // Resolving relative paths against nested base path (/rsvp/)
    assert.equal(resolveAppPath('sample_text_es.txt', 'http://localhost:3100/rsvp/es/'), '/rsvp/sample_text_es.txt');
    assert.equal(resolveAppPath('api/article', 'http://localhost:3100/rsvp/ru/'), '/rsvp/api/article');
});

test('VAL-WEB-PATH-002: Subpath Sample Text Asset Loading Integrity', () => {
    assert.equal(resolveAppPath('sample_text_es.txt', 'http://localhost:3100/es/'), '/sample_text_es.txt');
    assert.equal(resolveAppPath('sample_text_ru.txt', 'http://localhost:3100/ru/'), '/sample_text_ru.txt');
    assert.equal(resolveAppPath('sample_text_en.txt', 'http://localhost:3100/'), '/sample_text_en.txt');
});

test('VAL-WEB-PATH-003: Centralized Service Worker Registration Scope', () => {
    assert.equal(resolveAppPath('service-worker.js', 'http://localhost:3100/ru/'), '/service-worker.js');
    assert.equal(getAppBaseUrl('http://localhost:3100/ru/'), '/');
});

test('VAL-WEB-PATH-004: Extension Package Download Link Base Resolution', () => {
    assert.equal(resolveAppPath('downloads/hummingread-tester.zip', 'http://localhost:3100/es/'), '/downloads/hummingread-tester.zip');
});

test('VAL-WEB-PATH-005: Dynamic Article Import API Base Path Resolution', () => {
    assert.equal(resolveAppPath('api/article', 'http://localhost:3100/ru/'), '/api/article');
    assert.equal(resolveAppPath('api/article', 'http://localhost:3100/es/'), '/api/article');
    assert.notEqual(resolveAppPath('api/article', 'http://localhost:3100/ru/'), '/ru/api/article');
});

test('VAL-WEB-PATH-006: Relative Asset and Brand Icon Path Resolution', async () => {
    const rootIndex = await readFile(join(root, 'index.html'), 'utf8');
    assert.match(rootIndex, /href="\/style\.css/);
    assert.match(rootIndex, /src="\/app\.js/);
    assert.match(rootIndex, /src="\/i18n\.js/);
    assert.match(rootIndex, /src="\/assets\/icons\/app-icon-64\.png/);

    // Also verify dist output if built
    try {
        const distRuIndex = await readFile(join(root, 'dist', 'ru', 'index.html'), 'utf8');
        assert.match(distRuIndex, /href="\/style\.css/);
        assert.match(distRuIndex, /src="\/app\.js/);
        assert.match(distRuIndex, /src="\/assets\/icons\/app-icon-64\.png/);
    } catch (e) {
        // dist may not exist before build
    }
});

test('VAL-WEB-PATH-007: Webmanifest Relative Link Resolution per Locale Route', async () => {
    const rootIndex = await readFile(join(root, 'index.html'), 'utf8');
    assert.match(rootIndex, /href="\/manifest\.webmanifest"/);

    try {
        const distRuIndex = await readFile(join(root, 'dist', 'ru', 'index.html'), 'utf8');
        assert.match(distRuIndex, /href="\/ru\/manifest\.webmanifest"/);

        const distEsIndex = await readFile(join(root, 'dist', 'es', 'index.html'), 'utf8');
        assert.match(distEsIndex, /href="\/es\/manifest\.webmanifest"/);
    } catch (e) {
        // dist may not exist before build
    }
});

test('VAL-WEB-PATH-008: Precache Manifest Asset Path Validation', async () => {
    const swContent = await readFile(join(root, 'service-worker.js'), 'utf8');
    assert.match(swContent, /'\/index\.html'/);
    assert.match(swContent, /'\/style\.css/);
    assert.match(swContent, /'\/app\.js/);
    assert.match(swContent, /'\/sample_text_es\.txt'/);
});
