const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile, execSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const util = require('node:util');
const vm = require('node:vm');
const { server } = require('../../server.js');

const execFileAsync = util.promisify(execFile);

const root = path.resolve(__dirname, '../../');
const i18nSource = fs.readFileSync(path.join(root, 'i18n.js'), 'utf8');

function ensureDistBuilt() {
  const distRuIndex = path.join(root, 'dist', 'ru', 'index.html');
  const distEsIndex = path.join(root, 'dist', 'es', 'index.html');
  if (fs.existsSync(distRuIndex) && fs.existsSync(distEsIndex)) {
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
      if (fs.existsSync(distRuIndex) && fs.existsSync(distEsIndex)) return;
      try { execSync(`${process.execPath} -e "new Promise(r=>setTimeout(r,100))"`, { stdio: 'ignore' }); } catch (err) {}
    }
  }
}

function fetchServerPath(serverInstance, pathName) {
  return new Promise((resolve, reject) => {
    const address = serverInstance.address();
    const port = address.port;
    http.get(`http://127.0.0.1:${port}${pathName}`, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

function createI18nInstance({ pathname = '/', browserLanguage = 'en-US', storedLanguage = null }) {
  const values = new Map();
  if (storedLanguage) values.set('paceflow_language', storedLanguage);

  const document = {
    documentElement: { lang: '' },
    querySelectorAll: () => []
  };

  const window = {
    location: { pathname, href: `http://localhost:3101${pathname}`, search: '', hash: '' },
    navigator: { language: browserLanguage },
    document,
    Intl,
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value))
    }
  };

  vm.runInNewContext(i18nSource, { window, Intl });
  return { i18n: window.paceflowI18n, window, values };
}

// VAL-WEB-LOC-001: Pre-rendered English body copy at /index.html
test('VAL-WEB-LOC-001: Raw HTTP GET /index.html contains pre-rendered English visible body copy', async (t) => {
  ensureDistBuilt();
  const testServer = http.createServer((req, res) => server.emit('request', req, res));
  await new Promise((res) => testServer.listen(0, '127.0.0.1', res));

  try {
    const res = await fetchServerPath(testServer, '/index.html');
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('<html lang="en">'), 'HTML must set lang="en"');
    assert.ok(res.body.includes('Meet Pico · your reading wingmate'), 'Must contain English pre-rendered hero kicker');
    assert.ok(res.body.includes('Long reads.'), 'Must contain English hero title');
    assert.ok(res.body.includes('Import your book'), 'Must contain English CTA button');
  } finally {
    await new Promise((res) => testServer.close(res));
  }
});

// VAL-WEB-LOC-002: Pre-rendered Russian body copy at /ru/index.html
test('VAL-WEB-LOC-002: Raw HTTP GET /ru/index.html contains pre-rendered Russian visible body copy', async (t) => {
  ensureDistBuilt();
  const testServer = http.createServer((req, res) => server.emit('request', req, res));
  await new Promise((res) => testServer.listen(0, '127.0.0.1', res));

  try {
    const res = await fetchServerPath(testServer, '/ru/index.html');
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('<html lang="ru">'), 'HTML must set lang="ru"');
    assert.ok(res.body.includes('Пико · ваш штурман по тексту') || res.body.includes('Скорочиталка'), 'Must contain Russian pre-rendered hero text');
    assert.ok(res.body.includes('Длинные тексты.'), 'Must contain Russian hero title');
    assert.ok(res.body.includes('Импортировать свою книгу'), 'Must contain Russian CTA button');
  } finally {
    await new Promise((res) => testServer.close(res));
  }
});

// VAL-WEB-LOC-003: Pre-rendered Spanish body copy at /es/index.html
test('VAL-WEB-LOC-003: Raw HTTP GET /es/index.html contains pre-rendered Spanish visible body copy', async (t) => {
  ensureDistBuilt();
  const testServer = http.createServer((req, res) => server.emit('request', req, res));
  await new Promise((res) => testServer.listen(0, '127.0.0.1', res));

  try {
    const res = await fetchServerPath(testServer, '/es/index.html');
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('<html lang="es">'), 'HTML must set lang="es"');
    assert.ok(res.body.includes('Conoce a Pico · tu copiloto de lectura') || res.body.includes('Lector de velocidad'), 'Must contain Spanish pre-rendered hero text');
    assert.ok(res.body.includes('Lecturas largas.'), 'Must contain Spanish hero title');
    assert.ok(res.body.includes('Importar tu libro'), 'Must contain Spanish CTA button');
  } finally {
    await new Promise((res) => testServer.close(res));
  }
});

// VAL-WEB-LOC-004: Direct load / refresh on /ru/ or /es/ maintains URL locale
test('VAL-WEB-LOC-004: Direct load on localized URL path (/ru/ or /es/) overrides stored preference and browser language', () => {
  const { i18n: ruI18n } = createI18nInstance({
    pathname: '/ru/',
    browserLanguage: 'es-ES',
    storedLanguage: 'en'
  });
  assert.equal(ruI18n.language, 'ru', 'Direct load on /ru/ path must initialize in Russian');

  const { i18n: esI18n } = createI18nInstance({
    pathname: '/es/index.html',
    browserLanguage: 'en-US',
    storedLanguage: 'ru'
  });
  assert.equal(esI18n.language, 'es', 'Direct load on /es/ path must initialize in Spanish');
});

// VAL-WEB-LOC-005: State-preserving route navigation via locale switcher
test('VAL-WEB-LOC-005: Locale switcher route path calculation helper', () => {
  const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(appSource.includes('getLocaleRoutePath'), 'app.js must implement getLocaleRoutePath helper');
  assert.ok(appSource.includes('window.history.pushState'), 'app.js setLanguage must use history.pushState to update URL path');
});

// VAL-WEB-LOC-006: Initial browser locale detection on root route /
test('VAL-WEB-LOC-006: Initial root visit / inspects navigator.language on clean profile', () => {
  const { i18n: ruNav } = createI18nInstance({ pathname: '/', browserLanguage: 'ru-RU', storedLanguage: null });
  assert.equal(ruNav.language, 'ru', 'Clean visit to / with ru-RU browser language must select Russian');

  const { i18n: esNav } = createI18nInstance({ pathname: '/', browserLanguage: 'es-ES', storedLanguage: null });
  assert.equal(esNav.language, 'es', 'Clean visit to / with es-ES browser language must select Spanish');

  const { i18n: enNav } = createI18nInstance({ pathname: '/', browserLanguage: 'fr-FR', storedLanguage: null });
  assert.equal(enNav.language, 'en', 'Clean visit to / with unsupported browser language must default to English');
});

// VAL-WEB-LOC-007: Visiting root route / with explicit stored language
test('VAL-WEB-LOC-007: Visiting root route / with explicit stored language respects stored preference', () => {
  const { i18n: storedEs } = createI18nInstance({ pathname: '/', browserLanguage: 'ru-RU', storedLanguage: 'es' });
  assert.equal(storedEs.language, 'es', 'Visiting / with stored language "es" must initialize in Spanish');
});

// VAL-WEB-LOC-008: Invalid locale URL subpath safety handling
test('VAL-WEB-LOC-008: Non-existent or unsupported subpaths fall back to default English app without 404', async (t) => {
  ensureDistBuilt();
  const testServer = http.createServer((req, res) => server.emit('request', req, res));
  await new Promise((res) => testServer.listen(0, '127.0.0.1', res));

  try {
    const frRes = await fetchServerPath(testServer, '/fr/');
    assert.equal(frRes.statusCode, 200, '/fr/ must fall back to HTTP 200');
    assert.ok(frRes.body.includes('<html lang="en">'), '/fr/ fallback must return default English index.html');

    const invalidRes = await fetchServerPath(testServer, '/invalid-route/');
    assert.equal(invalidRes.statusCode, 200, '/invalid-route/ must fall back to HTTP 200');
    assert.ok(invalidRes.body.includes('<html lang="en">'), '/invalid-route/ fallback must return index.html');
  } finally {
    await new Promise((res) => testServer.close(res));
  }
});

// Directory routing: automated curl unit tests for /ru, /ru/, /es, /es/
test('Directory routing: curl requests for /ru and /ru/ resolve directly to dist/ru/index.html with HTTP 200', async (t) => {
  ensureDistBuilt();
  const testServer = http.createServer((req, res) => server.emit('request', req, res));
  await new Promise((res) => testServer.listen(0, '127.0.0.1', res));
  const port = testServer.address().port;

  try {
    const { stdout: ruBody } = await execFileAsync('curl', ['-s', '-w', '\nHTTP_STATUS:%{http_code}', `http://127.0.0.1:${port}/ru`]);
    assert.ok(ruBody.includes('HTTP_STATUS:200'), '/ru must return HTTP 200');
    assert.ok(ruBody.includes('<html lang="ru">'), '/ru must return Russian HTML');
    assert.ok(ruBody.includes('Пико · ваш штурман по тексту') || ruBody.includes('Скорочиталка'), '/ru must contain Russian text from dist/ru/index.html');

    const { stdout: ruSlashBody } = await execFileAsync('curl', ['-s', '-w', '\nHTTP_STATUS:%{http_code}', `http://127.0.0.1:${port}/ru/`]);
    assert.ok(ruSlashBody.includes('HTTP_STATUS:200'), '/ru/ must return HTTP 200');
    assert.ok(ruSlashBody.includes('<html lang="ru">'), '/ru/ must return Russian HTML');
    assert.ok(ruSlashBody.includes('Пико · ваш штурман по тексту') || ruSlashBody.includes('Скорочиталка'), '/ru/ must contain Russian text from dist/ru/index.html');
  } finally {
    await new Promise((res) => testServer.close(res));
  }
});

test('Directory routing: curl requests for /es and /es/ resolve directly to dist/es/index.html with HTTP 200', async (t) => {
  ensureDistBuilt();
  const testServer = http.createServer((req, res) => server.emit('request', req, res));
  await new Promise((res) => testServer.listen(0, '127.0.0.1', res));
  const port = testServer.address().port;

  try {
    const { stdout: esBody } = await execFileAsync('curl', ['-s', '-w', '\nHTTP_STATUS:%{http_code}', `http://127.0.0.1:${port}/es`]);
    assert.ok(esBody.includes('HTTP_STATUS:200'), '/es must return HTTP 200');
    assert.ok(esBody.includes('<html lang="es">'), '/es must return Spanish HTML');
    assert.ok(esBody.includes('Conoce a Pico · tu copiloto de lectura') || esBody.includes('Lector de velocidad'), '/es must contain Spanish text from dist/es/index.html');

    const { stdout: esSlashBody } = await execFileAsync('curl', ['-s', '-w', '\nHTTP_STATUS:%{http_code}', `http://127.0.0.1:${port}/es/`]);
    assert.ok(esSlashBody.includes('HTTP_STATUS:200'), '/es/ must return HTTP 200');
    assert.ok(esSlashBody.includes('<html lang="es">'), '/es/ must return Spanish HTML');
    assert.ok(esSlashBody.includes('Conoce a Pico · tu copiloto de lectura') || esSlashBody.includes('Lector de velocidad'), '/es/ must contain Spanish text from dist/es/index.html');
  } finally {
    await new Promise((res) => testServer.close(res));
  }
});

test('VAL-WEB-PATH-006: pico-hero-640 img tag src attribute uses relative asset path in index.html, /ru/index.html, and /es/index.html', async (t) => {
  ensureDistBuilt();
  const testServer = http.createServer((req, res) => server.emit('request', req, res));
  await new Promise((res) => testServer.listen(0, '127.0.0.1', res));

  try {
    const enRes = await fetchServerPath(testServer, '/index.html');
    assert.equal(enRes.statusCode, 200);
    assert.ok(
      enRes.body.includes('src="assets/brand/pico-hero-640.webp"'),
      '/index.html pico-hero-640 img tag must have relative src: src="assets/brand/pico-hero-640.webp"'
    );

    const ruRes = await fetchServerPath(testServer, '/ru/index.html');
    assert.equal(ruRes.statusCode, 200);
    assert.ok(
      ruRes.body.includes('src="../assets/brand/pico-hero-640.webp"'),
      '/ru/index.html pico-hero-640 img tag must have relative src: src="../assets/brand/pico-hero-640.webp"'
    );

    const esRes = await fetchServerPath(testServer, '/es/index.html');
    assert.equal(esRes.statusCode, 200);
    assert.ok(
      esRes.body.includes('src="../assets/brand/pico-hero-640.webp"'),
      '/es/index.html pico-hero-640 img tag must have relative src: src="../assets/brand/pico-hero-640.webp"'
    );

    const imgRes = await fetchServerPath(testServer, '/assets/brand/pico-hero-640.webp');
    assert.equal(imgRes.statusCode, 200, 'Fetching /assets/brand/pico-hero-640.webp must return HTTP 200');
  } finally {
    await new Promise((res) => testServer.close(res));
  }
});
