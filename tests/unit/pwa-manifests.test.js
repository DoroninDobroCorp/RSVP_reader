import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// VAL-WEB-PWA-001: Localized Manifest Files for EN, RU, and ES
test('VAL-WEB-PWA-001: Localized manifest files generated for /, /ru/, and /es/', async (t) => {
    if (!existsSync(join(root, 'dist', 'manifest.webmanifest'))) {
        t.skip('Skipped: Requires dist/ build output (run npm run build:web)');
        return;
    }
    const enManifest = JSON.parse(await readFile(join(root, 'dist', 'manifest.webmanifest'), 'utf8'));
    const ruManifest = JSON.parse(await readFile(join(root, 'dist', 'ru', 'manifest.webmanifest'), 'utf8'));
    const esManifest = JSON.parse(await readFile(join(root, 'dist', 'es', 'manifest.webmanifest'), 'utf8'));

    assert.equal(enManifest.name, 'HummingRead: Speed Reader');
    assert.equal(enManifest.lang, 'en');
    assert.match(enManifest.description, /local-first focus pilot/i);

    assert.equal(ruManifest.name, 'HummingRead: Скорочиталка');
    assert.equal(ruManifest.lang, 'ru');
    assert.match(ruManifest.description, /RSVP-скорочиталка/i);

    assert.equal(esManifest.name, 'HummingRead: Lector de velocidad');
    assert.equal(esManifest.lang, 'es');
    assert.match(esManifest.description, /lector de velocidad RSVP/i);
});

// VAL-WEB-PWA-002 / VAL-R2-PWA-004: Stable PWA Application Identity (id) across all localized manifests
test('VAL-WEB-PWA-002 / VAL-R2-PWA-004: Stable PWA Application Identity (id) across all localized manifests', async (t) => {
    if (!existsSync(join(root, 'dist', 'manifest.webmanifest'))) {
        t.skip('Skipped: Requires dist/ build output (run npm run build:web)');
        return;
    }
    const enManifest = JSON.parse(await readFile(join(root, 'dist', 'manifest.webmanifest'), 'utf8'));
    const ruManifest = JSON.parse(await readFile(join(root, 'dist', 'ru', 'manifest.webmanifest'), 'utf8'));
    const esManifest = JSON.parse(await readFile(join(root, 'dist', 'es', 'manifest.webmanifest'), 'utf8'));

    assert.equal(enManifest.id, 'hummingread-pwa-app');
    assert.equal(ruManifest.id, 'hummingread-pwa-app');
    assert.equal(esManifest.id, 'hummingread-pwa-app');
    assert.equal(enManifest.id, ruManifest.id);
    assert.equal(ruManifest.id, esManifest.id);

    assert.equal(enManifest.start_url, './');
    assert.equal(ruManifest.start_url, './ru/');
    assert.equal(esManifest.start_url, './es/');
});

// VAL-WEB-PWA-003: HTML Manifest Link References per Locale Route
test('VAL-WEB-PWA-003: HTML landing pages link to corresponding localized webmanifest files', async (t) => {
    if (!existsSync(join(root, 'dist', 'index.html'))) {
        t.skip('Skipped: Requires dist/ build output (run npm run build:web)');
        return;
    }
    const enHtml = await readFile(join(root, 'dist', 'index.html'), 'utf8');
    const ruHtml = await readFile(join(root, 'dist', 'ru', 'index.html'), 'utf8');
    const esHtml = await readFile(join(root, 'dist', 'es', 'index.html'), 'utf8');

    assert.match(enHtml, /<link rel="manifest" href="manifest\.webmanifest">/);
    assert.match(ruHtml, /<link rel="manifest" href="manifest\.webmanifest">/);
    assert.match(esHtml, /<link rel="manifest" href="manifest\.webmanifest">/);
});

// VAL-WEB-PWA-004 / VAL-R2-PWA-003: Service Worker Offline Precache for Multilingual Routes & Assets
test('VAL-WEB-PWA-004 / VAL-R2-PWA-003: Service Worker precaches all static HTML locale routes and localized sample text files', async () => {
    const swContent = await readFile(join(root, 'service-worker.js'), 'utf8');

    const requiredShellAssets = [
        './',
        './index.html',
        './ru/',
        './ru/index.html',
        './es/',
        './es/index.html',
        './manifest.webmanifest',
        './ru/manifest.webmanifest',
        './es/manifest.webmanifest',
        './sample_text.txt',
        './sample_text_ru.txt',
        './sample_text_es.txt',
        './sample_text_en.txt'
    ];

    for (const asset of requiredShellAssets) {
        assert.ok(
            swContent.includes(`'${asset}'`),
            `Service Worker must include precache asset '${asset}'`
        );
    }
});

// VAL-WEB-PWA-005: Offline PWA Navigation & Locale Route Servicing
test('VAL-WEB-PWA-005: Service worker identifies all locale routes as app shell navigation', async () => {
    const swContent = await readFile(join(root, 'service-worker.js'), 'utf8');

    assert.ok(swContent.includes("'/ru/'"));
    assert.ok(swContent.includes("'/ru/index.html'"));
    assert.ok(swContent.includes("'/es/'"));
    assert.ok(swContent.includes("'/es/index.html'"));
});

// VAL-WEB-PWA-006: Service Worker Update & Cache Invalidation Boundary
test('VAL-WEB-PWA-006: Service worker defines cache versioning and invalidation regex boundary', async () => {
    const swContent = await readFile(join(root, 'service-worker.js'), 'utf8');

    assert.match(swContent, /const CACHE_NAME = 'hummingread-reader-v49'/);
    assert.match(swContent, /\/\^\(\?:paceflow\|hummingread\)-reader-\/u/);
});
