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

    // 1. Verify landing pages return HTTP 200
    for (const route of ['/', '/index.html', '/ru/', '/ru/index.html', '/es/', '/es/index.html', '/privacy.html', '/support.html', '/acknowledgements.html']) {
      const url = `${baseUrl}${route}`;
      const res = await fetch(url);
      assert.equal(res.status, 200, `Expected 200 for ${url}, got ${res.status}`);
      const text = await res.text();
      assert.ok(text.includes('<!doctype html>') || text.includes('<!DOCTYPE html>'), `${url} must be HTML`);
    }

    // 2. Verify static assets return HTTP 200
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

    // 3. Verify webmanifest files and PWA compliance
    for (const manifestRoute of ['/manifest.webmanifest', '/ru/manifest.webmanifest', '/es/manifest.webmanifest']) {
      const url = `${baseUrl}${manifestRoute}`;
      const res = await fetch(url);
      assert.equal(res.status, 200, `Expected 200 for ${url}`);
      const json = await res.json();
      assert.equal(json.id, 'hummingread-pwa-app', `Manifest id must be 'hummingread-pwa-app' at ${url}`);
      assert.ok(json.start_url.startsWith('./'), `Manifest start_url must be scope-relative at ${url}`);
    }

    // 4. Verify Service Worker precache list assets resolve relative to SW location
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

    console.log(`[PASS] Built-output tests passed for deployment path: '${mountPath || '/'}'`);
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}
