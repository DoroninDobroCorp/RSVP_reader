const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '../../');

function ensureDistBuilt() {
  const indexFile = path.join(root, 'dist', 'index.html');
  const robotsFile = path.join(root, 'dist', 'robots.txt');
  if (fs.existsSync(indexFile) && fs.existsSync(robotsFile)) {
    return;
  }
  const lockFile = path.join(root, '.build-web.lock');
  try {
    const fd = fs.openSync(lockFile, 'wx');
    try {
      execSync(`${process.execPath} scripts/build-web.mjs`, { cwd: root, stdio: 'ignore' });
    } finally {
      fs.closeSync(fd);
      try { fs.unlinkSync(lockFile); } catch (e) {}
    }
  } catch (e) {
    for (let i = 0; i < 50; i++) {
      if (fs.existsSync(indexFile) && fs.existsSync(robotsFile)) return;
      try { execSync(`${process.execPath} -e "new Promise(r=>setTimeout(r,100))"`, { stdio: 'ignore' }); } catch (err) {}
    }
  }
}

async function getProductConfigHelpers() {
  return await import('../../scripts/product-config.mjs');
}

function parseHtml(content) {
  const dom = new JSDOM(content);
  return { content, document: dom.window.document };
}

// VAL-WEB-SEO-005: Tester-Preview noindex Robots Isolation
test('VAL-WEB-SEO-005: Tester-preview builds set noindex,nofollow,noarchive meta tag and Disallow: / in robots.txt', () => {
  ensureDistBuilt();
  const htmlFiles = [
    'index.html',
    'privacy.html',
    'support.html',
    'acknowledgements.html',
    'ru/index.html',
    'ru/privacy.html',
    'ru/support.html',
    'ru/acknowledgements.html',
    'es/index.html',
    'es/privacy.html',
    'es/support.html',
    'es/acknowledgements.html'
  ];

  for (const relPath of htmlFiles) {
    const filePath = path.join(root, 'dist', relPath);
    assert.ok(fs.existsSync(filePath), `dist/${relPath} must exist`);
    const content = fs.readFileSync(filePath, 'utf8');
    const { document } = parseHtml(content);

    const robotsMeta = document.querySelector('meta[name="robots"]');
    assert.ok(robotsMeta, `${relPath} must contain <meta name="robots">`);
    assert.equal(robotsMeta.getAttribute('content'), 'noindex,nofollow,noarchive', `${relPath} meta robots must be noindex,nofollow,noarchive`);
  }

  const robotsTxtPath = path.join(root, 'dist', 'robots.txt');
  assert.ok(fs.existsSync(robotsTxtPath), 'dist/robots.txt must exist');
  const robotsTxt = fs.readFileSync(robotsTxtPath, 'utf8');
  assert.equal(robotsTxt.trim(), 'User-agent: *\nDisallow: /', 'dist/robots.txt must contain Disallow: /');
  assert.ok(!robotsTxt.includes('Sitemap:'), 'dist/robots.txt must not contain Sitemap directive in preview build');
});

// VAL-WEB-SEO-006: Tester-Preview Metadata & Canonical Stripping Safeguard
test('VAL-WEB-SEO-006: Tester-preview channel builds completely omit canonical, hreflang, and JSON-LD tags with no sslip.io leakage', () => {
  ensureDistBuilt();
  const htmlFiles = [
    'index.html',
    'privacy.html',
    'support.html',
    'acknowledgements.html',
    'ru/index.html',
    'ru/privacy.html',
    'ru/support.html',
    'ru/acknowledgements.html',
    'es/index.html',
    'es/privacy.html',
    'es/support.html',
    'es/acknowledgements.html'
  ];

  for (const relPath of htmlFiles) {
    const filePath = path.join(root, 'dist', relPath);
    const content = fs.readFileSync(filePath, 'utf8');
    const { document } = parseHtml(content);

    const canonicals = document.querySelectorAll('link[rel="canonical"]');
    assert.equal(canonicals.length, 0, `${relPath} must omit all <link rel="canonical"> tags in tester-preview`);

    const hreflangs = document.querySelectorAll('link[rel="alternate"][hreflang]');
    assert.equal(hreflangs.length, 0, `${relPath} must omit all hreflang alternate link tags in tester-preview`);

    const jsonLd = document.querySelectorAll('script[type="application/ld+json"]');
    assert.equal(jsonLd.length, 0, `${relPath} must omit all JSON-LD script blocks in tester-preview`);

    assert.ok(!content.includes('sslip.io'), `${relPath} must not leak sslip.io domain`);
    assert.ok(!content.includes('example.invalid'), `${relPath} must not leak example.invalid domain`);
  }

  const sitemapPath = path.join(root, 'dist', 'sitemap.xml');
  assert.ok(!fs.existsSync(sitemapPath), 'dist/sitemap.xml must be omitted in tester-preview channel');
});

// VAL-WEB-SEO-001: Production Reciprocal hreflang and x-default Tag Architecture
test('VAL-WEB-SEO-001: Production dry builds generate identical, complete reciprocal hreflang tags for en, ru, es, x-default', async () => {
  const { configureWebText } = await getProductConfigHelpers();
  const prodSiteUrl = 'https://hummingread.team/';
  const pages = [
    { src: 'index.html', path: '' },
    { src: 'privacy.html', path: 'privacy.html' },
    { src: 'support.html', path: 'support.html' },
    { src: 'acknowledgements.html', path: 'acknowledgements.html' }
  ];

  for (const p of pages) {
    const raw = fs.readFileSync(path.join(root, p.src), 'utf8');
    const configured = configureWebText(raw, 'production', prodSiteUrl);
    const { document } = parseHtml(configured);

    const enLink = document.querySelector('link[rel="alternate"][hreflang="en"]');
    const ruLink = document.querySelector('link[rel="alternate"][hreflang="ru"]');
    const esLink = document.querySelector('link[rel="alternate"][hreflang="es"]');
    const xDefLink = document.querySelector('link[rel="alternate"][hreflang="x-default"]');

    assert.ok(enLink, `${p.src} must contain hreflang="en" in production`);
    assert.ok(ruLink, `${p.src} must contain hreflang="ru" in production`);
    assert.ok(esLink, `${p.src} must contain hreflang="es" in production`);
    assert.ok(xDefLink, `${p.src} must contain hreflang="x-default" in production`);

    assert.equal(enLink.getAttribute('href'), `${prodSiteUrl}${p.path}`);
    assert.equal(ruLink.getAttribute('href'), `${prodSiteUrl}ru/${p.path}`);
    assert.equal(esLink.getAttribute('href'), `${prodSiteUrl}es/${p.path}`);
    assert.equal(xDefLink.getAttribute('href'), `${prodSiteUrl}${p.path}`);
  }
});

// VAL-WEB-SEO-002: Production Self-Referencing Canonical URL Tags
test('VAL-WEB-SEO-002: Production dry builds generate self-referencing canonical URL tags matching exact fully-qualified URLs', async () => {
  const { configureWebText } = await getProductConfigHelpers();
  const prodSiteUrl = 'https://hummingread.team/';
  const testCases = [
    { file: 'index.html', expectedCanonical: 'https://hummingread.team/' },
    { file: 'privacy.html', expectedCanonical: 'https://hummingread.team/privacy.html' },
    { file: 'support.html', expectedCanonical: 'https://hummingread.team/support.html' },
    { file: 'acknowledgements.html', expectedCanonical: 'https://hummingread.team/acknowledgements.html' }
  ];

  for (const tc of testCases) {
    const raw = fs.readFileSync(path.join(root, tc.file), 'utf8');
    const configured = configureWebText(raw, 'production', prodSiteUrl);
    const { document } = parseHtml(configured);

    const canonical = document.querySelector('link[rel="canonical"]');
    assert.ok(canonical, `${tc.file} must have canonical link in production`);
    assert.equal(canonical.getAttribute('href'), tc.expectedCanonical, `${tc.file} canonical must be ${tc.expectedCanonical}`);
  }
});

// VAL-WEB-SEO-003: Production Localized JSON-LD Structured Metadata
test('VAL-WEB-SEO-003: Production dry builds inject localized JSON-LD structured metadata into landing pages', async () => {
  const { configureWebText } = await getProductConfigHelpers();
  const prodSiteUrl = 'https://hummingread.team/';
  const raw = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const configured = configureWebText(raw, 'production', prodSiteUrl);
  const { document } = parseHtml(configured);

  const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
  assert.ok(jsonLdScript, 'index.html must contain JSON-LD script block in production');

  const jsonLdData = JSON.parse(jsonLdScript.textContent);
  assert.equal(jsonLdData['@context'], 'https://schema.org');
  assert.equal(jsonLdData['@type'], 'WebApplication');
  assert.equal(jsonLdData.url, 'https://hummingread.team/');
  assert.equal(jsonLdData.inLanguage, 'en');
  assert.ok(jsonLdData.description.length > 0);
});

// VAL-WEB-SEO-004: Production Sitemap XML Generation with Multilingual Annotations
test('VAL-WEB-SEO-004: Production dry build configures sitemap.xml listing canonical URLs enriched with alternate hreflang tags', async () => {
  const { configureWebText } = await getProductConfigHelpers();
  const prodSiteUrl = 'https://hummingread.team/';
  const sitemapRaw = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const configuredSitemap = configureWebText(sitemapRaw, 'production', prodSiteUrl);

  assert.ok(configuredSitemap.includes('<loc>https://hummingread.team/</loc>'));
  assert.ok(configuredSitemap.includes('<loc>https://hummingread.team/ru/</loc>'));
  assert.ok(configuredSitemap.includes('<loc>https://hummingread.team/es/</loc>'));
  assert.ok(configuredSitemap.includes('<xhtml:link rel="alternate" hreflang="en" href="https://hummingread.team/" />'));
  assert.ok(configuredSitemap.includes('<xhtml:link rel="alternate" hreflang="ru" href="https://hummingread.team/ru/" />'));
  assert.ok(configuredSitemap.includes('<xhtml:link rel="alternate" hreflang="es" href="https://hummingread.team/es/" />'));
  assert.ok(configuredSitemap.includes('<xhtml:link rel="alternate" hreflang="x-default" href="https://hummingread.team/" />'));
});
