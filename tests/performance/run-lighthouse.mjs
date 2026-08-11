import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { configureFinalSeoText } from '../../scripts/product-config.mjs';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const artifactRoot = join(root, 'artifacts');
const port = Number(process.env.HUMMINGREAD_LIGHTHOUSE_PORT || 43184);
const origin = `http://127.0.0.1:${port}`;
const publicRoot = await mkdtemp(join(tmpdir(), 'hummingread-lighthouse-final-'));
await cp(join(root, 'dist'), publicRoot, { recursive: true });
await Promise.all([
  writeFile(
    join(publicRoot, 'index.html'),
    configureFinalSeoText(await readFile(join(root, 'index.html'), 'utf8'), `${origin}/`)
  ),
  writeFile(
    join(publicRoot, 'robots.txt'),
    configureFinalSeoText(await readFile(join(root, 'robots.txt'), 'utf8'), `${origin}/`)
  ),
  writeFile(
    join(publicRoot, 'sitemap.xml'),
    configureFinalSeoText(await readFile(join(root, 'sitemap.xml'), 'utf8'), `${origin}/`)
  )
]);
const mime = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.zip', 'application/zip']
]);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, origin);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const candidate = normalize(join(publicRoot, pathname));
    const contained = relative(publicRoot, candidate);
    if (contained.startsWith('..') || contained.split(sep).includes('..')) {
      response.writeHead(403).end();
      return;
    }
    const info = await stat(candidate).catch(() => null);
    const file = info?.isFile() ? candidate : join(publicRoot, 'index.html');
    const body = await readFile(file);
    const contentType = mime.get(extname(file)) || 'application/octet-stream';
    const compress = /\b(?:text|javascript|json|svg|xml)\b/u.test(contentType)
      && /\bgzip\b/u.test(request.headers['accept-encoding'] || '');
    response.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=604800',
      ...(compress ? { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' } : {})
    });
    response.end(compress ? gzipSync(body, { level: 9 }) : body);
  } catch (error) {
    response.writeHead(500).end();
  }
});

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  await mkdir(artifactRoot, { recursive: true });

  const outputPath = join(artifactRoot, 'lighthouse-mobile.json');
  const lighthouseBin = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'lighthouse.cmd' : 'lighthouse');
  const child = spawn(lighthouseBin, [
  `${origin}/`,
  '--quiet',
  '--output=json',
  `--output-path=${outputPath}`,
  '--only-categories=performance,accessibility,best-practices,seo',
  '--chrome-flags=--headless=new --no-sandbox'
  ], {
  cwd: root,
  env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH || chromium.executablePath() },
  stdio: ['ignore', 'pipe', 'pipe']
  });

  let standardError = '';
  child.stderr.on('data', (chunk) => { standardError += chunk; });
  const exitCode = await new Promise((resolve) => child.once('exit', resolve));
  if (exitCode !== 0) throw new Error(`Lighthouse failed (${exitCode}): ${standardError.trim()}`);

  const report = JSON.parse(await readFile(outputPath, 'utf8'));
  const scores = Object.fromEntries(
  ['performance', 'accessibility', 'best-practices', 'seo'].map((name) => [
    name,
    Math.round((report.categories[name]?.score || 0) * 100)
  ])
  );
  const thresholds = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 95 };
  const summary = {
  capturedAt: report.fetchTime,
  lighthouseVersion: report.lighthouseVersion,
  userAgent: report.userAgent,
  url: report.finalDisplayedUrl,
  scores,
    thresholds,
    auditMode: 'final-seo-render',
    previewIndexing: 'tester-preview is separately verified as noindex,nofollow with robots Disallow: /'
  };
  await writeFile(join(artifactRoot, 'lighthouse-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  for (const [category, threshold] of Object.entries(thresholds)) {
    if (scores[category] < threshold) {
      throw new Error(`Lighthouse ${category} score ${scores[category]} is below required ${threshold}.`);
    }
  }
  console.log(`Lighthouse final-channel render: Performance ${scores.performance}, Accessibility ${scores.accessibility}, Best Practices ${scores['best-practices']}, SEO ${scores.seo}.`);
} finally {
  await new Promise((resolve) => server.close(() => resolve()));
  await rm(publicRoot, { recursive: true, force: true });
}
