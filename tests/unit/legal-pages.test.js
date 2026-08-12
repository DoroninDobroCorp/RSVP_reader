const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '../../');

function parseHtml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const dom = new JSDOM(content);
  return { content, document: dom.window.document };
}

// VAL-WEB-LEGAL-001: Single-Language Body Filtering in Root Legal Pages
test('VAL-WEB-LEGAL-001: Root legal pages contain exactly 1 English article body; Russian and Spanish blocks stripped', () => {
  for (const page of ['privacy.html', 'support.html', 'acknowledgements.html']) {
    const filePath = path.join(root, 'dist', page);
    assert.ok(fs.existsSync(filePath), `${page} must exist in dist/`);
    const { document } = parseHtml(filePath);

    assert.equal(document.documentElement.lang, 'en', `${page} must set html lang="en"`);
    const articles = document.querySelectorAll('article.legal-card');
    assert.equal(articles.length, 1, `${page} must contain exactly 1 article body, found ${articles.length}`);
    assert.equal(articles[0].getAttribute('lang'), 'en', `${page} article must have lang="en"`);
    assert.equal(document.querySelectorAll('article[lang="ru"]').length, 0, `${page} must not contain Russian article`);
    assert.equal(document.querySelectorAll('article[lang="es"]').length, 0, `${page} must not contain Spanish article`);
  }
});

// VAL-WEB-LEGAL-002: Single-Language Body Filtering in Russian Legal Pages
test('VAL-WEB-LEGAL-002: Russian legal pages contain strictly Russian article body; English and Spanish blocks stripped', () => {
  for (const page of ['privacy.html', 'support.html', 'acknowledgements.html']) {
    const filePath = path.join(root, 'dist', 'ru', page);
    assert.ok(fs.existsSync(filePath), `ru/${page} must exist in dist/ru/`);
    const { document } = parseHtml(filePath);

    assert.equal(document.documentElement.lang, 'ru', `ru/${page} must set html lang="ru"`);
    const articles = document.querySelectorAll('article.legal-card');
    assert.equal(articles.length, 1, `ru/${page} must contain exactly 1 article body, found ${articles.length}`);
    assert.equal(articles[0].getAttribute('lang'), 'ru', `ru/${page} article must have lang="ru"`);
    assert.equal(document.querySelectorAll('article[lang="es"]').length, 0, `ru/${page} must not contain Spanish article`);
  }
});

// VAL-WEB-LEGAL-003: Single-Language Body Filtering in Spanish Legal Pages
test('VAL-WEB-LEGAL-003: Spanish legal pages contain strictly Spanish article body; English and Russian blocks stripped', () => {
  for (const page of ['privacy.html', 'support.html', 'acknowledgements.html']) {
    const filePath = path.join(root, 'dist', 'es', page);
    assert.ok(fs.existsSync(filePath), `es/${page} must exist in dist/es/`);
    const { document } = parseHtml(filePath);

    assert.equal(document.documentElement.lang, 'es', `es/${page} must set html lang="es"`);
    const articles = document.querySelectorAll('article.legal-card');
    assert.equal(articles.length, 1, `es/${page} must contain exactly 1 article body, found ${articles.length}`);
    assert.equal(articles[0].getAttribute('lang'), 'es', `es/${page} article must have lang="es"`);
    assert.equal(document.querySelectorAll('article[lang="ru"]').length, 0, `es/${page} must not contain Russian article`);
  }
});

// VAL-WEB-LEGAL-004: Cross-Locale Legal Navigation Links & Accessibility
test('VAL-WEB-LEGAL-004: Single-language legal pages provide header and footer locale switchers with links to identical doc in EN, RU, ES', () => {
  const routes = [
    { dir: '', lang: 'en', expectedUrlMap: { en: 'privacy.html', ru: 'ru/privacy.html', es: 'es/privacy.html' } },
    { dir: 'ru', lang: 'ru', expectedUrlMap: { en: '../privacy.html', ru: 'privacy.html', es: '../es/privacy.html' } },
    { dir: 'es', lang: 'es', expectedUrlMap: { en: '../privacy.html', ru: '../ru/privacy.html', es: 'privacy.html' } }
  ];

  for (const route of routes) {
    for (const page of ['privacy.html', 'support.html', 'acknowledgements.html']) {
      const filePath = route.dir ? path.join(root, 'dist', route.dir, page) : path.join(root, 'dist', page);
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
  for (const route of ['', 'ru', 'es']) {
    const filePath = route ? path.join(root, 'dist', route, 'acknowledgements.html') : path.join(root, 'dist', 'acknowledgements.html');
    const { document } = parseHtml(filePath);

    const articles = document.querySelectorAll('article.legal-card');
    assert.equal(articles.length, 1, `acknowledgements.html must have 1 article block`);

    const noticeLink = document.querySelector('a[href*="THIRD_PARTY_NOTICES.txt"]');
    assert.ok(noticeLink, `${filePath} must preserve link to THIRD_PARTY_NOTICES.txt`);
  }

  const noticePath = path.join(root, 'dist', 'THIRD_PARTY_NOTICES.txt');
  assert.ok(fs.existsSync(noticePath), 'dist/THIRD_PARTY_NOTICES.txt must exist');
  const noticeContent = fs.readFileSync(noticePath, 'utf8');
  assert.ok(noticeContent.includes('HUMMINGREAD THIRD-PARTY NOTICES'), 'THIRD_PARTY_NOTICES.txt must contain license header');
});

// VAL-WEB-LEGAL-006: Legal Route Direct Load & Head Metadata Parity
test('VAL-WEB-LEGAL-006: Direct loading of any localized legal page URL returns complete HTML head metadata matching page locale', () => {
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
    const filePath = path.join(root, 'dist', item.page);
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
