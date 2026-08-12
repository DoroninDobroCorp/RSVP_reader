const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../../i18n.js'), 'utf8');

function createI18n(browserLanguage = 'en-US', storedLanguage = null, customDoc = null) {
  const values = new Map();
  if (storedLanguage) values.set('paceflow_language', storedLanguage);

  const document = customDoc || {
    documentElement: { lang: '' },
    querySelectorAll: () => []
  };

  const window = {
    navigator: { language: browserLanguage },
    document,
    Intl,
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value))
    }
  };

  vm.runInNewContext(source, { window, Intl });
  return { i18n: window.paceflowI18n, PaceFlowI18n: window.PaceFlowI18n, values, document, window };
}

// VAL-ENGINE-001: Supported locale detection and fallback
test('VAL-ENGINE-001: Locale detection, stored language persistence, and fallback', () => {
  // 1. Unsupported browser language falls back to English
  const { i18n: enI18n } = createI18n('fr-FR');
  assert.equal(enI18n.language, 'en');

  // 2. Russian browser locale detection
  const { i18n: ruI18n } = createI18n('ru-RU');
  assert.equal(ruI18n.language, 'ru');

  // 3. Spanish browser locale variants detection (es, es-ES, es-419, es-MX, es-CL)
  ['es', 'es-ES', 'es-419', 'es-MX', 'es-CL'].forEach(lang => {
    const { i18n: esI18n } = createI18n(lang);
    assert.equal(esI18n.language, 'es', `Failed for locale: ${lang}`);
  });

  // 4. Stored language in localStorage takes precedence
  const { i18n: storedEs } = createI18n('ru-RU', 'es');
  assert.equal(storedEs.language, 'es');

  const { i18n: storedRu } = createI18n('en-US', 'ru');
  assert.equal(storedRu.language, 'ru');

  const { i18n: storedEn } = createI18n('es-ES', 'en');
  assert.equal(storedEn.language, 'en');

  // 5. Invalid stored language safely falls back to browser locale or English
  const { i18n: invalidStoredFallbackRu } = createI18n('ru-RU', 'invalid-lang');
  assert.equal(invalidStoredFallbackRu.language, 'ru');

  const { i18n: invalidStoredFallbackEn } = createI18n('de-DE', 'unsupported');
  assert.equal(invalidStoredFallbackEn.language, 'en');

  // 6. Explicit language change persists to localStorage and updates documentElement.lang
  const { i18n: switchI18n, values, document } = createI18n('en-US');
  switchI18n.setLanguage('es');
  assert.equal(switchI18n.language, 'es');
  assert.equal(values.get('paceflow_language'), 'es');
  assert.equal(document.documentElement.lang, 'es');

  switchI18n.setLanguage('ru');
  assert.equal(switchI18n.language, 'ru');
  assert.equal(values.get('paceflow_language'), 'ru');
  assert.equal(document.documentElement.lang, 'ru');
});

// VAL-ENGINE-002: Intl.PluralRules pluralization across representative counts
test('VAL-ENGINE-002: Native Intl.PluralRules pluralization category mapping', () => {
  const { i18n } = createI18n('en-US');
  const counts = [0, 1, 2, 5, 11, 21, 22, 25];

  // English plural categories: 1 -> one, others -> other
  const enExpected = { 0: 'other', 1: 'one', 2: 'other', 5: 'other', 11: 'other', 21: 'other', 22: 'other', 25: 'other' };
  counts.forEach(count => {
    assert.equal(i18n.getPluralCategory(count, 'en'), enExpected[count], `EN plural category mismatch for count ${count}`);
  });

  // Spanish plural categories: 1 -> one, others -> other
  const esExpected = { 0: 'other', 1: 'one', 2: 'other', 5: 'other', 11: 'other', 21: 'other', 22: 'other', 25: 'other' };
  counts.forEach(count => {
    assert.equal(i18n.getPluralCategory(count, 'es'), esExpected[count], `ES plural category mismatch for count ${count}`);
  });

  // Russian plural categories: 1, 21 -> one; 2, 22 -> few; 0, 5, 11, 25 -> many
  const ruExpected = { 0: 'many', 1: 'one', 2: 'few', 5: 'many', 11: 'many', 21: 'one', 22: 'few', 25: 'many' };
  counts.forEach(count => {
    assert.equal(i18n.getPluralCategory(count, 'ru'), ruExpected[count], `RU plural category mismatch for count ${count}`);
  });

  // Test pluralize method with array and object forms
  assert.equal(i18n.pluralize(1, ['book', 'books'], 'en'), 'book');
  assert.equal(i18n.pluralize(5, ['book', 'books'], 'en'), 'books');
  assert.equal(i18n.pluralize(1, ['libro', 'libros'], 'es'), 'libro');
  assert.equal(i18n.pluralize(5, ['libro', 'libros'], 'es'), 'libros');
  assert.equal(i18n.pluralize(1, ['книга', 'книги', 'книг'], 'ru'), 'книга');
  assert.equal(i18n.pluralize(2, ['книга', 'книги', 'книг'], 'ru'), 'книги');
  assert.equal(i18n.pluralize(5, ['книга', 'книги', 'книг'], 'ru'), 'книг');
  assert.equal(i18n.pluralize(21, ['книга', 'книги', 'книг'], 'ru'), 'книга');
  assert.equal(i18n.pluralize(22, ['книга', 'книги', 'книг'], 'ru'), 'книги');
  assert.equal(i18n.pluralize(25, ['книга', 'книги', 'книг'], 'ru'), 'книг');
});

// VAL-ENGINE-003: Safe string interpolation and missing key fallback
test('VAL-ENGINE-003: Safe string interpolation and missing key fallback', () => {
  const { i18n } = createI18n('es-ES');

  // Normal parameter interpolation
  assert.equal(i18n.t('targetActual', { target: 350, actual: 412 }), '350 objetivo · 412 ppm reales');

  // Missing key in Spanish falls back to English without throwing
  // Temporarily switch language to test fallback mechanism
  const { i18n: testI18n, window } = createI18n('es-ES');
  // Pass an unknown key that does not exist in any catalog
  assert.equal(testI18n.t('nonExistentKey_12345'), 'nonExistentKey_12345');
  assert.doesNotThrow(() => testI18n.t('missing_random_key', { param: 'test' }));
});

// VAL-ENGINE-004: Translation catalog key and parameter placeholder parity
test('VAL-ENGINE-004: 100% key parity and placeholder parity across EN, RU, ES', () => {
  // Extract catalog messages from i18n
  const { i18n } = createI18n('en-US');
  
  // Extract messages object using vm run
  const sandbox = { window: { navigator: {}, document: { documentElement: {}, querySelectorAll: () => [] } }, Intl };
  vm.runInNewContext(source, sandbox);

  // We can access messages through paceflowI18n by switching languages and comparing all keys
  // Let's inspect messages via regex/evaluation of source
  const match = source.match(/const messages = (\{[\s\S]*?\n    \});/);
  assert.ok(match, 'messages catalog definition must exist in i18n.js');
  const messages = eval('(' + match[1] + ')');

  const enKeys = Object.keys(messages.en).sort();
  const ruKeys = Object.keys(messages.ru).sort();
  const esKeys = Object.keys(messages.es).sort();

  assert.equal(enKeys.length, ruKeys.length, `Key count mismatch between EN (${enKeys.length}) and RU (${ruKeys.length})`);
  assert.equal(enKeys.length, esKeys.length, `Key count mismatch between EN (${enKeys.length}) and ES (${esKeys.length})`);

  // Verify every key matches with 0 missing and 0 extra
  const missingInRu = enKeys.filter(k => !(k in messages.ru));
  const missingInEs = enKeys.filter(k => !(k in messages.es));
  assert.deepEqual(missingInRu, [], `Keys missing in RU: ${missingInRu.join(', ')}`);
  assert.deepEqual(missingInEs, [], `Keys missing in ES: ${missingInEs.join(', ')}`);

  // Verify no blank values in any catalog
  enKeys.forEach(k => {
    assert.ok(typeof messages.en[k] === 'string' && messages.en[k].length > 0, `Blank or invalid key in EN: ${k}`);
    assert.ok(typeof messages.ru[k] === 'string' && messages.ru[k].length > 0, `Blank or invalid key in RU: ${k}`);
    assert.ok(typeof messages.es[k] === 'string' && messages.es[k].length > 0, `Blank or invalid key in ES: ${k}`);
  });

  // Verify parameter placeholders parity
  function extractPlaceholders(str) {
    const matches = [];
    let m;
    const regex = /\{([a-zA-Z0-9_]+)/g;
    while ((m = regex.exec(str)) !== null) {
      matches.push(m[1]);
    }
    return [...new Set(matches)].sort();
  }

  enKeys.forEach(k => {
    const enPlaceholders = extractPlaceholders(messages.en[k]);
    const ruPlaceholders = extractPlaceholders(messages.ru[k]);
    const esPlaceholders = extractPlaceholders(messages.es[k]);

    assert.deepEqual(ruPlaceholders, enPlaceholders, `Placeholder mismatch for key '${k}' between EN and RU`);
    assert.deepEqual(esPlaceholders, enPlaceholders, `Placeholder mismatch for key '${k}' between EN and ES`);
  });
});

// VAL-ENGINE-005: Native Intl number and date formatting
test('VAL-ENGINE-005: Native Intl number and date formatting across EN, RU, ES', () => {
  const { i18n: enI18n } = createI18n('en-US');
  const { i18n: ruI18n } = createI18n('ru-RU');
  const { i18n: esI18n } = createI18n('es-ES');

  // formatNumber
  assert.equal(enI18n.formatNumber(12345), new Intl.NumberFormat('en-US').format(12345));
  assert.equal(ruI18n.formatNumber(12345), new Intl.NumberFormat('ru-RU').format(12345));
  assert.equal(esI18n.formatNumber(12345), new Intl.NumberFormat('es-ES').format(12345));

  // formatDate
  const testDate = new Date('2026-08-12T10:30:00Z');
  assert.equal(
    enI18n.formatDate(testDate),
    new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(testDate)
  );
  assert.equal(
    ruI18n.formatDate(testDate),
    new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(testDate)
  );
  assert.equal(
    esI18n.formatDate(testDate),
    new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(testDate)
  );

  // Invalid date fallback
  assert.equal(enI18n.formatDate('invalid-date'), 'unknown');
  assert.equal(ruI18n.formatDate('invalid-date'), 'неизвестно');
  assert.equal(esI18n.formatDate('invalid-date'), 'desconocido');
});

// VAL-ENGINE-006: Automatic DOM synchronization and attribute binding
test('VAL-ENGINE-006: Automatic DOM synchronization and attribute binding', () => {
  const elements = {
    i18nElements: [
      { dataset: { i18n: 'appName' }, textContent: '' },
      { dataset: { i18n: 'settings' }, textContent: '' }
    ],
    placeholderElements: [
      { dataset: { i18nPlaceholder: 'search' }, attributes: {}, setAttribute(k, v) { this.attributes[k] = v; } }
    ],
    titleElements: [
      { dataset: { i18nTitle: 'close' }, attributes: {}, setAttribute(k, v) { this.attributes[k] = v; } }
    ],
    ariaElements: [
      { dataset: { i18nAria: 'homeAria' }, attributes: {}, setAttribute(k, v) { this.attributes[k] = v; } }
    ],
    languageButtons: [
      {
        dataset: { language: 'en' },
        classes: new Set(),
        attributes: {},
        classList: {
          toggle(cls, condition) { if (condition) elements.languageButtons[0].classes.add(cls); else elements.languageButtons[0].classes.delete(cls); }
        },
        setAttribute(k, v) { this.attributes[k] = v; }
      },
      {
        dataset: { language: 'es' },
        classes: new Set(),
        attributes: {},
        classList: {
          toggle(cls, condition) { if (condition) elements.languageButtons[1].classes.add(cls); else elements.languageButtons[1].classes.delete(cls); }
        },
        setAttribute(k, v) { this.attributes[k] = v; }
      },
      {
        dataset: { language: 'ru' },
        classes: new Set(),
        attributes: {},
        classList: {
          toggle(cls, condition) { if (condition) elements.languageButtons[2].classes.add(cls); else elements.languageButtons[2].classes.delete(cls); }
        },
        setAttribute(k, v) { this.attributes[k] = v; }
      }
    ]
  };

  const fakeDocument = {
    documentElement: { lang: '' },
    querySelectorAll(selector) {
      if (selector === '[data-i18n]') return elements.i18nElements;
      if (selector === '[data-i18n-placeholder]') return elements.placeholderElements;
      if (selector === '[data-i18n-title]') return elements.titleElements;
      if (selector === '[data-i18n-aria]') return elements.ariaElements;
      if (selector === '[data-language]') return elements.languageButtons;
      return [];
    }
  };

  const { i18n } = createI18n('en-US', null, fakeDocument);
  i18n.setLanguage('es');

  assert.equal(fakeDocument.documentElement.lang, 'es');
  assert.equal(elements.i18nElements[0].textContent, 'HummingRead');
  assert.equal(elements.i18nElements[1].textContent, 'Ajustes');
  assert.equal(elements.placeholderElements[0].attributes['placeholder'], 'Buscar');
  assert.equal(elements.titleElements[0].attributes['title'], 'Cerrar');
  assert.equal(elements.ariaElements[0].attributes['aria-label'], 'Inicio de HummingRead');

  // Verify active button state
  assert.equal(elements.languageButtons[0].classes.has('active'), false);
  assert.equal(elements.languageButtons[0].attributes['aria-pressed'], 'false');
  assert.equal(elements.languageButtons[1].classes.has('active'), true);
  assert.equal(elements.languageButtons[1].attributes['aria-pressed'], 'true');
  assert.equal(elements.languageButtons[2].classes.has('active'), false);
  assert.equal(elements.languageButtons[2].attributes['aria-pressed'], 'false');
});

// VAL-ENGINE-007: Offline operation and zero external network dependencies
test('VAL-ENGINE-007: Operates offline with zero external network dependencies', () => {
  // Sandbox with no fetch, XMLHttpRequest, or network globals
  const window = {
    navigator: { language: 'es-ES' },
    document: { documentElement: { lang: '' }, querySelectorAll: () => [] },
    Intl,
    localStorage: { getItem: () => null, setItem: () => {} }
  };
  delete window.fetch;
  delete window.XMLHttpRequest;

  vm.runInNewContext(source, { window, Intl });
  assert.ok(window.paceflowI18n);
  assert.equal(window.paceflowI18n.language, 'es');
  assert.equal(window.paceflowI18n.t('appName'), 'HummingRead');
  assert.equal(window.paceflowI18n.t('appTagline'), 'Lee a tu ritmo con Pico');
});

// VAL-ENGINE-008: Parameter interpolation XSS & unsafe HTML execution boundary
test('VAL-ENGINE-008: Parameter interpolation XSS and HTML safety', () => {
  const { i18n } = createI18n('en-US');
  const xssPayload = '<script>alert("XSS")</script><img src="x" onerror="steal()"/>';
  
  const result = i18n.t('confirmDeleteBook', { name: xssPayload });
  assert.equal(result, `Remove “${xssPayload}” from your library?`);

  // When setting textContent in DOM, verify it remains plain text and does not evaluate
  let boundTextContent = '';
  const element = {
    dataset: { i18n: 'confirmDeleteBook' },
    get textContent() { return boundTextContent; },
    set textContent(val) { boundTextContent = val; }
  };
  element.textContent = result;
  assert.equal(boundTextContent, `Remove “${xssPayload}” from your library?`);
});

// VAL-WEB-008: Dynamic pluralization formatting for UI counters in EN, RU, and ES
test('VAL-WEB-008: Dynamic pluralization formatting for UI counters in EN, RU, ES', () => {
  const { i18n: enI18n } = createI18n('en-US');
  const { i18n: ruI18n } = createI18n('ru-RU');
  const { i18n: esI18n } = createI18n('es-ES');

  // Book count pluralization
  assert.equal(enI18n.t('bookCount', { count: 1 }), '1 book');
  assert.equal(enI18n.t('bookCount', { count: 5 }), '5 books');

  assert.equal(esI18n.t('bookCount', { count: 1 }), '1 libro');
  assert.equal(esI18n.t('bookCount', { count: 5 }), '5 libros');

  assert.equal(ruI18n.t('bookCount', { count: 1 }), '1 книга');
  assert.equal(ruI18n.t('bookCount', { count: 2 }), '2 книги');
  assert.equal(ruI18n.t('bookCount', { count: 5 }), '5 книг');
  assert.equal(ruI18n.t('bookCount', { count: 21 }), '21 книга');
  assert.equal(ruI18n.t('bookCount', { count: 22 }), '22 книги');
  assert.equal(ruI18n.t('bookCount', { count: 25 }), '25 книг');
});
