import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(root, 'dist');

try {
  await stat(distDir);
} catch (e) {
  throw new Error('dist/ directory does not exist. Run "npm run build:web" first.');
}

const { values } = parseArgs({
  options: {
    subpath: { type: 'string', default: '' }
  },
  strict: false
});

const subpathArg = values.subpath ? values.subpath.replace(/\/$/, '') : '';
const subpathsToTest = subpathArg ? [subpathArg] : ['', '/rsvp'];
const port = 3101;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.zip': 'application/zip'
};

const server = http.createServer(async (req, res) => {
  try {
    let reqPath = new URL(req.url, `http://localhost:${port}`).pathname;

    if (reqPath.startsWith('/rsvp/')) {
      reqPath = reqPath.slice(5);
    } else if (reqPath === '/rsvp') {
      reqPath = '';
    }

    if (!reqPath || reqPath.endsWith('/')) {
      reqPath += 'index.html';
    }

    const filePath = join(distDir, reqPath);
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    const mime = mimeTypes[ext] || 'application/octet-stream';

    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

await new Promise((resolve) => server.listen(port, resolve));

try {
  console.log(`Testing built-output web deployment under subpath(s): ${subpathsToTest.join(', ') || '/'}`);

  for (const subpath of subpathsToTest) {
    const mountPath = subpath || '';
    const baseUrl = `http://localhost:${port}${mountPath}`;

    // 1. Verify landing pages return HTTP 200 (VAL-R4-PWA-001)
    for (const route of ['/', '/index.html', '/ru/', '/ru/index.html', '/es/', '/es/index.html', '/privacy.html', '/support.html', '/acknowledgements.html']) {
      const url = `${baseUrl}${route}`;
      const res = await fetch(url);
      assert.equal(res.status, 200, `Expected 200 for ${url}, got ${res.status}`);
      const text = await res.text();
      assert.ok(text.includes('<!doctype html>') || text.includes('<!DOCTYPE html>'), `${url} must be HTML`);
    }

    // 2. Verify static assets return HTTP 200 (VAL-R4-PWA-001)
    const staticAssets = [
      '/style.css?v=49',
      '/app-base-url.js?v=49',
      '/i18n.js?v=49',
      '/app.js?v=49',
      '/epub-parser.js?v=49',
      '/vendor/jszip.min.js?v=49',
      '/assets/icons/app-icon-32.png',
      '/assets/icons/app-icon-64.png',
      '/assets/icons/app-icon-180.png',
      '/assets/icons/app-icon-192.png',
      '/assets/icons/app-icon-512.png',
      '/assets/brand/pico-hero-640.webp',
      '/assets/brand/pico-quick-send-640.webp',
      '/sample_text.txt',
      '/sample_text_ru.txt',
      '/sample_text_es.txt',
      '/sample_text_en.txt'
    ];

    for (const asset of staticAssets) {
      const url = `${baseUrl}${asset}`;
      const res = await fetch(url);
      assert.equal(res.status, 200, `Expected 200 for ${url}, got ${res.status}`);
    }

    // 3. Verify webmanifest files and PWA compliance (VAL-R4-PWA-004)
    for (const manifestRoute of ['/manifest.webmanifest', '/ru/manifest.webmanifest', '/es/manifest.webmanifest']) {
      const url = `${baseUrl}${manifestRoute}`;
      const res = await fetch(url);
      assert.equal(res.status, 200, `Expected 200 for ${url}`);
      const json = await res.json();
      assert.equal(json.id, 'hummingread-pwa-app', `Manifest id must be 'hummingread-pwa-app' at ${url}`);
      assert.ok(json.start_url.startsWith('./'), `Manifest start_url must be scope-relative at ${url}`);
    }

    // 4. Verify Service Worker precache list assets resolve relative to SW location (VAL-R4-PWA-001, VAL-R4-PWA-003)
    const swUrl = `${baseUrl}/service-worker.js`;
    const swRes = await fetch(swUrl);
    assert.equal(swRes.status, 200, `Service worker must return 200 at ${swUrl}`);
    const swCode = await swRes.text();

    const match = swCode.match(/const APP_SHELL = \[([\s\S]*?)\];/);
    assert.ok(match, 'service-worker.js must define APP_SHELL');
    const ASSET_VERSION = 'v=49';
    const precacheList = eval(`const ASSET_VERSION = 'v=49'; [${match[1]}]`);

    for (const relAsset of precacheList) {
      const resolvedUrl = new URL(relAsset, swUrl).href;
      const assetRes = await fetch(resolvedUrl);
      assert.equal(assetRes.status, 200, `SW Precache asset '${relAsset}' resolved to ${resolvedUrl} must return 200 (got ${assetRes.status})`);
    }

    // 5. Verify Service Worker subpath scope trailing slash compliance under /rsvp/ (VAL-R4-PWA-002)
    const swScope = mountPath ? (mountPath.endsWith('/') ? mountPath : `${mountPath}/`) : '/';
    assert.ok(swScope.endsWith('/'), `SW scope for path '${mountPath || '/'}' must end with trailing slash: '${swScope}'`);
    if (mountPath === '/rsvp') {
      assert.equal(swScope, '/rsvp/', 'Service Worker scope under subpath /rsvp must be /rsvp/');
    }

    const appJsUrl = `${baseUrl}/app.js?v=49`;
    const appJsRes = await fetch(appJsUrl);
    assert.equal(appJsRes.status, 200, `app.js must return 200 at ${appJsUrl}`);
    const appJsCode = await appJsRes.text();
    assert.ok(
      appJsCode.includes('swScope') && (appJsCode.includes('rawBase') || appJsCode.includes('getAppBaseUrl')),
      'app.js must calculate Service Worker scope'
    );
    if (mountPath === '/rsvp') {
      assert.ok(
        appJsCode.includes('rawBase.endsWith(\'/\') ? rawBase : `${rawBase}/`') || appJsCode.includes('`${getAppBaseUrl()}/`') || appJsCode.includes('swScope'),
        'app.js must handle trailing slash for Service Worker scope under subpath /rsvp/'
      );
    }

    console.log(`[PASS] Built-output tests passed for deployment path: '${mountPath || '/'}'`);
  }

  // 6. Verify dist-native/ built assets separately
  const distNativeAndroidDir = join(root, 'dist-native', 'android');
  try {
    await stat(distNativeAndroidDir);
  } catch (e) {
    throw new Error('dist-native/android directory does not exist. Run "npm run build:native" first.');
  }

  console.log('Testing built-output native deployment under dist-native/android...');
  const nativeIndexPath = join(distNativeAndroidDir, 'index.html');
  const nativeIndexHtml = await readFile(nativeIndexPath, 'utf8');
  assert.ok(nativeIndexHtml.includes('data-platform="native"'), 'Native index.html must set data-platform="native"');
  assert.ok(!nativeIndexHtml.includes('<!-- WEB_ONLY_START -->'), 'Native index.html must strip WEB_ONLY blocks');
  assert.ok(nativeIndexHtml.includes('Pico turns local books'), 'Native index.html must use native copy');

  const nativeLegalFiles = [
    { file: 'privacy.html', lang: 'en', back: 'index.html#settings' },
    { file: 'ru/privacy.html', lang: 'ru', back: '../index.html#settings' },
    { file: 'es/privacy.html', lang: 'es', back: '../index.html#settings' },
    { file: 'support.html', lang: 'en', back: 'index.html#settings' },
    { file: 'ru/support.html', lang: 'ru', back: '../index.html#settings' },
    { file: 'es/support.html', lang: 'es', back: '../index.html#settings' },
    { file: 'acknowledgements.html', lang: 'en', back: 'index.html#settings' },
    { file: 'ru/acknowledgements.html', lang: 'ru', back: '../index.html#settings' },
    { file: 'es/acknowledgements.html', lang: 'es', back: '../index.html#settings' }
  ];

  for (const item of nativeLegalFiles) {
    const filePath = join(distNativeAndroidDir, item.file);
    const content = await readFile(filePath, 'utf8');
    assert.ok(content.includes(`lang="${item.lang}"`), `${item.file} must have lang="${item.lang}"`);
    assert.ok(content.includes(`href="${item.back}"`), `${item.file} back button must point to ${item.back}`);
  }

  const nativeI18nPath = join(distNativeAndroidDir, 'i18n.js');
  const nativeI18nCode = await readFile(nativeI18nPath, 'utf8');
  assert.ok(nativeI18nCode.includes('Android keeps its volume buttons unchanged.'), 'Native i18n.js must contain Android volume copy');

  console.log('[PASS] Built-output native tests passed for dist-native/android');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
