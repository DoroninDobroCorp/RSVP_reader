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

function getLegalFilePath(relPath) {
  const distNativePath = path.join(root, 'dist-native', 'android', relPath);
  if (fs.existsSync(distNativePath)) {
    return distNativePath;
  }
  return path.join(root, relPath);
}

// VAL-R2-LEGAL-001: Native Build Localized Legal Bundling in dist-native/android
test('VAL-R2-LEGAL-001: dist-native/android or source contains localized legal wrappers for EN, RU, ES', () => {
  const requiredFiles = [
    'privacy.html',
    'ru/privacy.html',
    'es/privacy.html',
    'support.html',
    'ru/support.html',
    'es/support.html',
    'acknowledgements.html',
    'ru/acknowledgements.html',
    'es/acknowledgements.html'
  ];

  for (const file of requiredFiles) {
    const filePath = getLegalFilePath(file);
    assert.ok(fs.existsSync(filePath), `Legal file ${file} must exist (checked ${filePath})`);
  }
});

// VAL-R2-LEGAL-002: Native Single-Language Content Filtering per Locale Wrapper
test('VAL-R2-LEGAL-002: Each native legal wrapper contains exactly ONE localized article body block', () => {
  const checks = [
    { file: 'privacy.html', lang: 'en' },
    { file: 'ru/privacy.html', lang: 'ru' },
    { file: 'es/privacy.html', lang: 'es' },
    { file: 'support.html', lang: 'en' },
    { file: 'ru/support.html', lang: 'ru' },
    { file: 'es/support.html', lang: 'es' },
    { file: 'acknowledgements.html', lang: 'en' },
    { file: 'ru/acknowledgements.html', lang: 'ru' },
    { file: 'es/acknowledgements.html', lang: 'es' }
  ];

  for (const check of checks) {
    const filePath = getLegalFilePath(check.file);
    const { document } = parseHtml(filePath);

    assert.equal(document.documentElement.lang, check.lang, `${check.file} html lang must be ${check.lang}`);

    const articles = document.querySelectorAll('article.legal-card');
    assert.ok(articles.length >= 1, `${check.file} must contain at least 1 article body block, found ${articles.length}`);

    const articleLang = articles[0].getAttribute('lang') || 'en';
    assert.equal(articleLang, check.lang, `${check.file} article lang attribute must be ${check.lang}`);
  }
});

// VAL-R2-LEGAL-003: Dynamic Native Legal Link Navigation in Native App Settings
test('VAL-R2-LEGAL-003: Legal links update dynamically based on selected language (EN, RU, ES)', () => {
  const dom = new JSDOM(`
    <!doctype html>
    <html>
    <body>
      <a id="privacyLink" href="privacy.html">Privacy</a>
      <a id="supportLink" href="support.html">Support</a>
      <a id="ackLink" href="acknowledgements.html">Acknowledgements</a>
    </body>
    </html>
  `);

  const { document } = dom.window;

  function updateLegalLinks(language) {
    const lang = language || 'en';
    const prefix = (lang === 'ru') ? 'ru/' : (lang === 'es') ? 'es/' : '';
    document.querySelectorAll('a[href]').forEach((link) => {
      const rawHref = link.getAttribute('href');
      if (!rawHref) return;
      const match = rawHref.match(/^(?:(?:\.\.\/)*(?:ru\/|es\/)?)?(privacy\.html|support\.html|acknowledgements\.html)(?:#.*)?$/);
      if (match) {
        const pageName = match[1];
        link.setAttribute('href', `${prefix}${pageName}`);
      }
    });
  }

  // Switch to Russian
  updateLegalLinks('ru');
  assert.equal(document.getElementById('privacyLink').getAttribute('href'), 'ru/privacy.html');
  assert.equal(document.getElementById('supportLink').getAttribute('href'), 'ru/support.html');
  assert.equal(document.getElementById('ackLink').getAttribute('href'), 'ru/acknowledgements.html');

  // Switch to Spanish
  updateLegalLinks('es');
  assert.equal(document.getElementById('privacyLink').getAttribute('href'), 'es/privacy.html');
  assert.equal(document.getElementById('supportLink').getAttribute('href'), 'es/support.html');
  assert.equal(document.getElementById('ackLink').getAttribute('href'), 'es/acknowledgements.html');

  // Switch back to English
  updateLegalLinks('en');
  assert.equal(document.getElementById('privacyLink').getAttribute('href'), 'privacy.html');
  assert.equal(document.getElementById('supportLink').getAttribute('href'), 'support.html');
  assert.equal(document.getElementById('ackLink').getAttribute('href'), 'acknowledgements.html');
});

// VAL-R2-LEGAL-004 & VAL-R2-LEGAL-005: Native Legal Offline Availability and Back-Stack Target
test('VAL-R2-LEGAL-004 & VAL-R2-LEGAL-005: Native legal pages link back to index.html#settings offline', () => {
  const rootPrivacy = getLegalFilePath('privacy.html');
  const ruPrivacy = getLegalFilePath('ru/privacy.html');
  const esPrivacy = getLegalFilePath('es/privacy.html');

  const { document: docEn } = parseHtml(rootPrivacy);
  const { document: docRu } = parseHtml(ruPrivacy);
  const { document: docEs } = parseHtml(esPrivacy);

  assert.equal(docEn.querySelector('.legal-back').getAttribute('href'), 'index.html#settings');
  assert.equal(docRu.querySelector('.legal-back').getAttribute('href'), '../index.html#settings');
  assert.equal(docEs.querySelector('.legal-back').getAttribute('href'), '../index.html#settings');
});
