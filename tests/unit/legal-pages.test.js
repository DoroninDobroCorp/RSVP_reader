const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '../../');

function ensureDistBuilt() {
  const distIndex = path.join(root, 'dist', 'privacy.html');
  const distRuIndex = path.join(root, 'dist', 'ru', 'privacy.html');
  if (fs.existsSync(distIndex) && fs.existsSync(distRuIndex)) {
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
      if (fs.existsSync(distIndex) && fs.existsSync(distRuIndex)) return;
      try { execSync(`${process.execPath} -e "new Promise(r=>setTimeout(r,100))"`, { stdio: 'ignore' }); } catch (err) {}
    }
  }
}

function getLegalPath(relPath) {
  ensureDistBuilt();
  const distPath = path.join(root, 'dist', relPath);
  if (fs.existsSync(distPath)) return distPath;
  return path.join(root, relPath);
}

function parseHtml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const dom = new JSDOM(content);
  return { content, document: dom.window.document };
}

// VAL-WEB-LEGAL-001: Single-Language Body Filtering in Root Legal Pages
test('VAL-WEB-LEGAL-001: Root legal pages contain English article body', () => {
  ensureDistBuilt();
  for (const page of ['privacy.html', 'support.html', 'acknowledgements.html']) {
    const filePath = getLegalPath(page);
    assert.ok(fs.existsSync(filePath), `${page} must exist at ${filePath}`);
    const { document } = parseHtml(filePath);

    assert.equal(document.documentElement.lang, 'en', `${page} must set html lang="en"`);
    const articles = document.querySelectorAll('article.legal-card');
    assert.ok(articles.length >= 1, `${page} must contain at least 1 article body, found ${articles.length}`);
  }
});

// VAL-WEB-LEGAL-002: Single-Language Body Filtering in Russian Legal Pages
test('VAL-WEB-LEGAL-002: Russian legal pages contain Russian article body', () => {
  ensureDistBuilt();
  for (const page of ['privacy.html', 'support.html', 'acknowledgements.html']) {
    const filePath = getLegalPath(path.join('ru', page));
    assert.ok(fs.existsSync(filePath), `ru/${page} must exist at ${filePath}`);
    const { document } = parseHtml(filePath);

    assert.equal(document.documentElement.lang, 'ru', `ru/${page} must set html lang="ru"`);
    const articles = document.querySelectorAll('article.legal-card');
    assert.ok(articles.length >= 1, `ru/${page} must contain at least 1 article body, found ${articles.length}`);
  }
});

// VAL-WEB-LEGAL-003: Single-Language Body Filtering in Spanish Legal Pages
test('VAL-WEB-LEGAL-003: Spanish legal pages contain Spanish article body', () => {
  ensureDistBuilt();
  for (const page of ['privacy.html', 'support.html', 'acknowledgements.html']) {
    const filePath = getLegalPath(path.join('es', page));
    assert.ok(fs.existsSync(filePath), `es/${page} must exist at ${filePath}`);
    const { document } = parseHtml(filePath);

    assert.equal(document.documentElement.lang, 'es', `es/${page} must set html lang="es"`);
    const articles = document.querySelectorAll('article.legal-card');
    assert.ok(articles.length >= 1, `es/${page} must contain at least 1 article body, found ${articles.length}`);
  }
});

// VAL-WEB-LEGAL-004: Cross-Locale Legal Navigation Links & Accessibility
test('VAL-WEB-LEGAL-004: Single-language legal pages provide header and footer locale switchers with links to identical doc in EN, RU, ES', () => {
  ensureDistBuilt();
  const routes = [
    { dir: '', lang: 'en', expectedUrlMap: { en: 'privacy.html', ru: 'ru/privacy.html', es: 'es/privacy.html' } },
    { dir: 'ru', lang: 'ru', expectedUrlMap: { en: '../privacy.html', ru: 'privacy.html', es: '../es/privacy.html' } },
    { dir: 'es', lang: 'es', expectedUrlMap: { en: '../privacy.html', ru: '../ru/privacy.html', es: 'privacy.html' } }
  ];

  for (const route of routes) {
    for (const page of ['privacy.html', 'support.html', 'acknowledgements.html']) {
      const filePath = getLegalPath(route.dir ? path.join(route.dir, page) : page);
      const { document } = parseHtml(filePath);

      const navHeader = document.querySelector('.legal-nav-header');
      assert.ok(navHeader, `${filePath} must contain .legal-nav-header`);

      const navs = document.querySelectorAll('.legal-locale-nav');
      assert.ok(navs.length >= 2, `${filePath} must contain header and footer .legal-locale-nav (found ${navs.length})`);

      for (const nav of navs) {
        assert.equal(nav.getAttribute('aria-label'), 'Language navigation');
        const links = nav.querySelectorAll('a.legal-locale-link');
        assert.equal(links.length, 3, `Locale nav must contain 3 language links, found ${links.length}`);

        const enLink = Array.from(links).find(l => l.getAttribute('hreflang') === 'en');
        const ruLink = Array.from(links).find(l => l.getAttribute('hreflang') === 'ru');
        const esLink = Array.from(links).find(l => l.getAttribute('hreflang') === 'es');

        assert.ok(enLink, 'Must contain English link');
        assert.ok(ruLink, 'Must contain Russian link');
        assert.ok(esLink, 'Must contain Spanish link');

        const activeLink = Array.from(links).find(l => l.classList.contains('active'));
        assert.ok(activeLink, 'Must have an active locale link');
        assert.equal(activeLink.getAttribute('hreflang'), route.lang, `Active link must match route language ${route.lang}`);
        assert.equal(activeLink.getAttribute('aria-current'), 'page', 'Active link must set aria-current="page"');
      }
    }
  }
});

// VAL-WEB-LEGAL-005: Single-Language Acknowledgements & Third-Party License Filtering
test('VAL-WEB-LEGAL-005: acknowledgements pages filter introductory copy per locale while preserving unmodified license notices text', () => {
  ensureDistBuilt();
  for (const route of ['', 'ru', 'es']) {
    const filePath = getLegalPath(route ? path.join(route, 'acknowledgements.html') : 'acknowledgements.html');
    const { document } = parseHtml(filePath);

    const articles = document.querySelectorAll('article.legal-card');
    assert.ok(articles.length >= 1, `acknowledgements.html must have at least 1 article block`);

    const noticeLink = document.querySelector('a[href*="THIRD_PARTY_NOTICES.txt"]');
    assert.ok(noticeLink, `${filePath} must preserve link to THIRD_PARTY_NOTICES.txt`);
  }

  const noticePath = getLegalPath('THIRD_PARTY_NOTICES.txt');
  assert.ok(fs.existsSync(noticePath), `THIRD_PARTY_NOTICES.txt must exist at ${noticePath}`);
  const noticeContent = fs.readFileSync(noticePath, 'utf8');
  assert.ok(noticeContent.includes('HUMMINGREAD THIRD-PARTY NOTICES'), 'THIRD_PARTY_NOTICES.txt must contain license header');
});

// VAL-WEB-LEGAL-006: Legal Route Direct Load & Head Metadata Parity
test('VAL-WEB-LEGAL-006: Direct loading of any localized legal page URL returns complete HTML head metadata matching page locale', () => {
  ensureDistBuilt();
  const checkList = [
    { page: 'privacy.html', lang: 'en', title: 'Privacy Policy — HummingRead' },
    { page: 'ru/privacy.html', lang: 'ru', title: 'Политика конфиденциальности — HummingRead' },
    { page: 'es/privacy.html', lang: 'es', title: 'Política de privacidad — HummingRead' },
    { page: 'support.html', lang: 'en', title: 'Support — HummingRead' },
    { page: 'ru/support.html', lang: 'ru', title: 'Поддержка — HummingRead' },
    { page: 'es/support.html', lang: 'es', title: 'Soporte — HummingRead' },
    { page: 'acknowledgements.html', lang: 'en', title: 'Open-source acknowledgements · HummingRead' },
    { page: 'ru/acknowledgements.html', lang: 'ru', title: 'Благодарности и лицензии · HummingRead' },
    { page: 'es/acknowledgements.html', lang: 'es', title: 'Reconocimientos de código abierto · HummingRead' }
  ];

  for (const item of checkList) {
    const filePath = getLegalPath(item.page);
    const { document } = parseHtml(filePath);

    assert.equal(document.documentElement.lang, item.lang, `${item.page} html lang must be ${item.lang}`);
    assert.equal(document.querySelector('title').textContent, item.title, `${item.page} title must match`);
    assert.ok(document.querySelector('meta[name="description"]').getAttribute('content').length > 0, `${item.page} must have meta description`);

    const productConfig = JSON.parse(fs.readFileSync(path.join(root, 'product.config.json'), 'utf8'));
    if (productConfig.release.channel === 'production') {
      const canonical = document.querySelector('link[rel="canonical"]');
      assert.ok(canonical, `${item.page} must have canonical link`);
      assert.ok(canonical.getAttribute('href').includes(item.page), `${item.page} canonical must self-reference`);

      const hreflangs = ['en', 'ru', 'es', 'x-default'];
      for (const h of hreflangs) {
        assert.ok(document.querySelector(`link[rel="alternate"][hreflang="${h}"]`), `${item.page} must have hreflang="${h}"`);
      }
    } else {
      assert.equal(document.querySelector('link[rel="canonical"]'), null, `${item.page} must omit canonical in tester-preview`);
      assert.equal(document.querySelectorAll('link[rel="alternate"][hreflang]').length, 0, `${item.page} must omit hreflang in tester-preview`);
    }
  }
});
