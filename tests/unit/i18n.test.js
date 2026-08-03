const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../../i18n.js'), 'utf8');

function createI18n(browserLanguage = 'en-US', storedLanguage = null) {
  const values = new Map();
  if (storedLanguage) values.set('paceflow_language', storedLanguage);
  const document = {
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
  return { i18n: window.paceflowI18n, values, document };
}

test('English is the default for non-Russian browsers and interpolation works', () => {
  const { i18n } = createI18n('es-CL');
  assert.equal(i18n.language, 'en');
  assert.equal(i18n.t('targetActual', { target: 350, actual: 412 }), '350 target · 412 actual WPM');
});

test('Russian browser locale is detected and explicit language changes persist', () => {
  const { i18n, values, document } = createI18n('ru-RU');
  assert.equal(i18n.language, 'ru');
  assert.equal(i18n.t('continue'), 'Продолжить');
  i18n.setLanguage('en');
  assert.equal(values.get('paceflow_language'), 'en');
  assert.equal(document.documentElement.lang, 'en');
});
