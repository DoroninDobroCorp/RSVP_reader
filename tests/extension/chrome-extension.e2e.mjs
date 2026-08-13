import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const sourceExtensionPath = join(root, 'chrome-extension');
const testPort = Number(process.env.HUMMINGREAD_EXTENSION_TEST_PORT || 43182);
const testMarker = 'extension-r2';
const localUrl = `http://127.0.0.1:${testPort}/`;
const artifactDirectory = process.env.HUMMINGREAD_EXTENSION_ARTIFACT_DIR || '';
let serverProcess = null;

async function serverIsReady() {
  try {
    const response = await fetch(`${localUrl}__hummingread_test__/marker`);
    return response.ok && (await response.json()).marker === testMarker;
  } catch (error) {
    return false;
  }
}

async function portIsOccupied() {
  try {
    await fetch(localUrl);
    return true;
  } catch (error) {
    return false;
  }
}

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await serverIsReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Local HummingRead server did not start.');
}

async function waitForExtensionWorker(browserContext) {
  const existing = browserContext.serviceWorkers()[0];
  if (existing) return existing;
  return browserContext.waitForEvent('serviceworker', { timeout: 15_000 });
}

async function waitForNewPage(browserContext, match, existingPages = new Set(browserContext.pages())) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const page = browserContext.pages().find((candidate) => !existingPages.has(candidate) && match(candidate));
    if (page) return page;
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error('Expected extension page did not open.');
}

async function waitForWebsitePayload(browserContext, expectedText) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    for (const page of browserContext.pages().filter((candidate) => candidate.url().startsWith(localUrl))) {
      const value = await page.locator('#textInput').inputValue().catch(() => '');
      if (value === expectedText) return page;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Quick Send did not open the configured website preview.');
}

// 1. VAL-R3-EXT-001: Chrome Extension Unpacked Manifest V3 Validation across Locales
console.log('1. Validating VAL-R3-EXT-001: Manifest V3 Schema Compliance & Locale Catalog Parity...');
const manifestSource = JSON.parse(await readFile(join(sourceExtensionPath, 'manifest.json'), 'utf8'));
assert.equal(manifestSource.manifest_version, 3, 'Manifest version must be 3.');
assert.equal(manifestSource.background?.service_worker, 'background.js', 'Service worker must be background.js.');

const localeFiles = ['en', 'ru', 'es'];
const localeCatalogs = {};
for (const code of localeFiles) {
  const catalogPath = join(sourceExtensionPath, '_locales', code, 'messages.json');
  const content = JSON.parse(await readFile(catalogPath, 'utf8'));
  localeCatalogs[code] = content;
}

const enKeys = Object.keys(localeCatalogs.en).sort();
assert.ok(enKeys.length >= 70, `Expected at least 70 locale keys, got ${enKeys.length}`);

for (const code of ['ru', 'es']) {
  const keys = Object.keys(localeCatalogs[code]).sort();
  assert.deepEqual(keys, enKeys, `Locale catalog for '${code}' does not match 'en' keys 1:1.`);
}
console.log(`   Manifest V3 schema compliant and catalog parity confirmed across EN, RU, ES (${enKeys.length} keys).`);

try {
  if (await portIsOccupied()) throw new Error(`Extension test port ${testPort} is already occupied.`);
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(testPort),
      HUMMINGREAD_TEST_MARKER: testMarker
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await waitForServer();

  // 2. Profile Configurations for Isolated 3-Locale E2E Tests (VAL-R3-EXT-002: EN, RU, ES)
  const profilesToTest = [
    {
      assertion: 'VAL-R3-EXT-002 (en-US)',
      lang: 'en-US',
      code: 'en',
      selectionBtn: 'Read selected text locally',
      pageBtn: 'Extract this page locally',
      readTextBtn: 'Read pasted text locally',
      quickSendBtn: 'Quick Send pasted text',
      contextSelection: 'Read selection locally with HummingRead',
      contextPage: 'Extract and read this page locally',
      noSelectionError: 'Select some text on the page first.',
      noTextError: 'Select or paste some text first.',
      sampleText: 'HummingRead keeps your reading focus steady in English.'
    },
    {
      assertion: 'VAL-R3-EXT-002 (ru-RU)',
      lang: 'ru-RU',
      code: 'ru',
      selectionBtn: 'Читать выделенный текст локально',
      pageBtn: 'Извлечь эту страницу локально',
      readTextBtn: 'Читать вставленный текст локально',
      quickSendBtn: 'Отправить вставленный текст',
      contextSelection: 'Читать выделение локально в HummingRead',
      contextPage: 'Извлечь и читать эту страницу локально',
      noSelectionError: 'Сначала выделите текст на странице.',
      noTextError: 'Сначала выделите или вставьте текст.',
      sampleText: 'HummingRead удерживает фокус чтения на русском языке.'
    },
    {
      assertion: 'VAL-R3-EXT-002 (es-ES)',
      lang: 'es-ES',
      code: 'es',
      selectionBtn: 'Leer texto seleccionado localmente',
      pageBtn: 'Extraer esta página localmente',
      readTextBtn: 'Leer texto pegado localmente',
      quickSendBtn: 'Envío rápido de texto pegado',
      contextSelection: 'Leer selección localmente con HummingRead',
      contextPage: 'Extraer y leer esta página localmente',
      noSelectionError: 'Selecciona primero algo de texto en la página.',
      noTextError: 'Selecciona o pega algún texto primero.',
      sampleText: 'HummingRead mantiene el enfoque de lectura en español.'
    }
  ];

  for (const profile of profilesToTest) {
    console.log(`\nTesting profile locale ${profile.lang} (${profile.assertion})...`);
    const profileUserDataDir = await mkdtemp(join(tmpdir(), `hummingread-chrome-${profile.code}-`));
    const profileExtDir = await mkdtemp(join(tmpdir(), `hummingread-extension-${profile.code}-`));
    let profileContext = null;

    try {
      await cp(sourceExtensionPath, profileExtDir, { recursive: true });
      const manifestPath = join(profileExtDir, 'manifest.json');
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      const testMatch = `${localUrl}*`;
      manifest.host_permissions = [testMatch];
      manifest.content_scripts = [{
        matches: [testMatch],
        js: ['core.js', 'bridge.js'],
        run_at: 'document_idle'
      }];
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

      const launchOptions = {
        headless: true,
        channel: 'chromium',
        locale: profile.lang,
        ignoreDefaultArgs: ['--disable-extensions'],
        args: [
          `--lang=${profile.lang}`,
          `--disable-extensions-except=${profileExtDir}`,
          `--load-extension=${profileExtDir}`
        ]
      };
      if (process.env.HUMMINGREAD_CHROME_PATH) launchOptions.executablePath = process.env.HUMMINGREAD_CHROME_PATH;

      profileContext = await chromium.launchPersistentContext(profileUserDataDir, launchOptions);
      const worker = await waitForExtensionWorker(profileContext);
      const extensionId = new URL(worker.url()).hostname;
      assert.match(extensionId, /^[a-p]{32}$/u);

      // Verify chrome.i18n.getUILanguage() returns valid browser locale string
      const uiLang = await worker.evaluate(() => chrome.i18n.getUILanguage());
      assert.ok(
        typeof uiLang === 'string' && uiLang.length >= 2,
        `chrome.i18n.getUILanguage() must return a non-empty string, got '${uiLang}'`
      );

      // Verify getActiveLocale() without storage override resolves via chrome.i18n.getUILanguage() fallback
      const fallbackLocale = await worker.evaluate(() => globalThis.HummingReadExtensionCore.getActiveLocale());
      assert.ok(
        ['en', 'ru', 'es'].includes(fallbackLocale),
        `getActiveLocale() without storage override should return a supported locale ('en', 'ru', or 'es'), got '${fallbackLocale}'`
      );

      // Verify storage override takes precedence over browser UI locale
      const testOverride = profile.code === 'ru' ? 'es' : 'ru';
      await worker.evaluate((override) => chrome.storage.local.set({ hummingreadProfileLocale: override }), testOverride);
      const overrideLocale = await worker.evaluate(() => globalThis.HummingReadExtensionCore.getActiveLocale());
      assert.equal(
        overrideLocale,
        testOverride,
        `getActiveLocale() with storage override '${testOverride}' should take precedence, got '${overrideLocale}'`
      );
      console.log(`   chrome.i18n.getUILanguage() ('${uiLang}') & storage override ('${testOverride}') verified in ${profile.lang}.`);

      // Reset storage local with profile locale & preview URL for full E2E testing
      await worker.evaluate((params) => chrome.storage.local.set({
        hummingreadPreviewUrl: params.url,
        hummingreadProfileLocale: params.lang
      }), { url: localUrl, lang: profile.lang });

      // Verify Context Menus title localization
      const menuRes = await worker.evaluate(async () => {
        if (typeof self.installContextMenus === 'function') {
          await self.installContextMenus();
        }
        const locale = await globalThis.HummingReadExtensionCore.getActiveLocale();
        return { ok: true, menus: installedMenus, locale };
      });
      assert.equal(menuRes.ok, true);
      const selMenu = menuRes.menus.find((m) => m.id === 'hummingread-read-selection');
      const pageMenu = menuRes.menus.find((m) => m.id === 'hummingread-read-page');
      assert.equal(selMenu?.title, profile.contextSelection, `Context menu selection title mismatch for ${profile.lang}`);
      assert.equal(pageMenu?.title, profile.contextPage, `Context menu page title mismatch for ${profile.lang}`);
      console.log(`   Context menu titles verified in ${profile.lang}: "${selMenu.title}" & "${pageMenu.title}"`);

      // Verify Popup UI Localization
      const popup = await profileContext.newPage();
      await popup.setViewportSize({ width: 380, height: 650 });
      await popup.goto(`chrome-extension://${extensionId}/popup.html`);
      await popup.waitForSelector('#selectionBtn');

      const selBtnText = (await popup.locator('#selectionBtn').textContent()).replace(/\s+/g, ' ').trim();
      const pageBtnText = (await popup.locator('#pageBtn').textContent()).replace(/\s+/g, ' ').trim();
      const readTextBtnText = (await popup.locator('#readTextBtn').textContent()).replace(/\s+/g, ' ').trim();
      const quickSendBtnText = (await popup.locator('#quickSendBtn').textContent()).replace(/\s+/g, ' ').trim();

      assert.ok(selBtnText.includes(profile.selectionBtn), `Popup selection button mismatch in ${profile.lang}: got "${selBtnText}"`);
      assert.ok(pageBtnText.includes(profile.pageBtn), `Popup page button mismatch in ${profile.lang}: got "${pageBtnText}"`);
      assert.ok(readTextBtnText.includes(profile.readTextBtn), `Popup read text button mismatch in ${profile.lang}: got "${readTextBtnText}"`);
      assert.ok(quickSendBtnText.includes(profile.quickSendBtn), `Popup Quick Send button mismatch in ${profile.lang}: got "${quickSendBtnText}"`);
      console.log(`   Popup UI labels verified in ${profile.lang}.`);

      if (artifactDirectory) {
        await mkdir(artifactDirectory, { recursive: true });
        await popup.screenshot({ path: join(artifactDirectory, `extension-popup-${profile.code}.png`), fullPage: true });
      }

      // Verify Localized Error Handling (VAL-R2-EXT-006)
      const host = await profileContext.newPage();
      await host.goto(`${localUrl}support.html`);

      // 1) Trigger selection reading with no text selected
      const emptySelRes = await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'hummingread:read-selection' }));
      assert.equal(emptySelRes.ok, false);
      assert.equal(emptySelRes.error, profile.noSelectionError, `Empty selection error mismatch in ${profile.lang}`);

      // 2) Trigger read text button with empty input
      await popup.locator('#readTextBtn').click();
      await popup.waitForSelector('#status.error');
      const popupStatusText = (await popup.locator('#status').textContent()).trim();
      assert.equal(popupStatusText, profile.noTextError, `Empty text area status mismatch in ${profile.lang}`);
      console.log(`   Localized error feedback verified in ${profile.lang}: "${emptySelRes.error}"`);

      if (artifactDirectory) {
        await popup.screenshot({ path: join(artifactDirectory, `extension-error-${profile.code}.png`), fullPage: true });
      }

      // Verify Selection Extraction across Locales (VAL-R2-EXT-005)
      const selectionSentinel = `SENTINEL_${profile.code}_${Date.now()}`;
      const fullPassage = `${selectionSentinel} - ${profile.sampleText}`;

      await host.bringToFront();
      await host.evaluate((text) => {
        document.title = 'Localized selection test';
        document.body.innerHTML = `<main><article id="selection"><h1>Selection Test</h1><p></p></article></main>`;
        document.querySelector('#selection p').textContent = text;
        const range = document.createRange();
        range.selectNodeContents(document.querySelector('#selection p'));
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }, fullPassage);

      const existingBeforeReader = new Set(profileContext.pages());
      const localResponse = await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'hummingread:read-selection' }));
      assert.equal(localResponse.ok, true, localResponse.error);

      const reader = await waitForNewPage(
        profileContext,
        (candidate) => candidate.url().startsWith(`chrome-extension://${extensionId}/reader.html`),
        existingBeforeReader
      );
      await reader.waitForSelector('#readerShell:not([hidden])');
      assert.equal(await reader.locator('#documentTitle').textContent(), 'Localized selection test');
      assert.match(await reader.locator('#wordFrame').textContent(), new RegExp(selectionSentinel, 'u'));
      console.log(`   Text selection extraction & message passing verified in ${profile.lang}.`);

      if (artifactDirectory) {
        await reader.screenshot({ path: join(artifactDirectory, `extension-reader-${profile.code}.png`), fullPage: true });
      }

    } finally {
      await profileContext?.close().catch(() => undefined);
      await rm(profileUserDataDir, { recursive: true, force: true });
      await rm(profileExtDir, { recursive: true, force: true });
    }
  }

  // 3. Detailed Interactive Reader & Quick Send E2E Verification
  console.log('\nRunning detailed interactive reader, keyboard shortcuts, and Quick Send E2E test...');
  const deepUserDataDir = await mkdtemp(join(tmpdir(), 'hummingread-chrome-deep-'));
  const deepExtDir = await mkdtemp(join(tmpdir(), 'hummingread-extension-deep-'));
  let deepContext = null;

  try {
    await cp(sourceExtensionPath, deepExtDir, { recursive: true });
    const manifestPath = join(deepExtDir, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const testMatch = `${localUrl}*`;
    manifest.host_permissions = [testMatch];
    manifest.content_scripts = [{
      matches: [testMatch],
      js: ['core.js', 'bridge.js'],
      run_at: 'document_idle'
    }];
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const launchOptions = {
      headless: true,
      channel: 'chromium',
      ignoreDefaultArgs: ['--disable-extensions'],
      args: [
        `--disable-extensions-except=${deepExtDir}`,
        `--load-extension=${deepExtDir}`
      ]
    };
    if (process.env.HUMMINGREAD_CHROME_PATH) launchOptions.executablePath = process.env.HUMMINGREAD_CHROME_PATH;
    deepContext = await chromium.launchPersistentContext(deepUserDataDir, launchOptions);
    const worker = await waitForExtensionWorker(deepContext);
    const extensionId = new URL(worker.url()).hostname;

    await worker.evaluate((url) => chrome.storage.local.set({ hummingreadPreviewUrl: url }), localUrl);
    const popup = await deepContext.newPage();
    await popup.setViewportSize({ width: 380, height: 650 });
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForSelector('#selectionBtn');

    const sentinel = `DEEP_SENTINEL_${Date.now()}`;
    const selectedText = [
      `${sentinel} begins a private selected passage for the standalone reader.`,
      'Pico keeps the focal letter steady while each word advances at a chosen pace.',
      'Pause restores context, rewind moves exactly ten words, and progress remains local.'
    ].join(' ');

    const host = await deepContext.newPage();
    await host.goto(`${localUrl}support.html`);
    await host.evaluate((text) => {
      document.title = 'Deep Reader Test';
      document.body.innerHTML = `<main><article id="selection"><h1>Deep Reader Test</h1><p></p></article></main>`;
      document.querySelector('#selection p').textContent = text;
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('#selection p'));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }, selectedText);

    const observedRequests = [];
    deepContext.on('request', (request) => {
      observedRequests.push({ url: request.url(), body: request.postData() || '' });
    });

    await host.bringToFront();
    const existingBeforeReader = new Set(deepContext.pages());
    const localResponse = await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'hummingread:read-selection' }));
    assert.equal(localResponse.ok, true, localResponse.error);

    const reader = await waitForNewPage(
      deepContext,
      (candidate) => candidate.url().startsWith(`chrome-extension://${extensionId}/reader.html`),
      existingBeforeReader
    );
    await reader.waitForSelector('#readerShell:not([hidden])');
    assert.equal(await reader.locator('#documentTitle').textContent(), 'Deep Reader Test');
    assert.match(await reader.locator('#wordFrame').textContent(), new RegExp(sentinel, 'u'));
    assert.equal(await reader.locator('#wpmOutput').textContent(), '320 WPM');

    // Playback, Scrubbing, Speed, Theme
    await reader.locator('#playBtn').click();
    await reader.waitForFunction(() => Number(document.querySelector('#progressRange').value) >= 2);
    await reader.locator('#playBtn').click();
    await reader.locator('#progressRange').fill('15');
    assert.equal(await reader.locator('#progressRange').inputValue(), '15');
    await reader.locator('#rewindBtn').click();
    assert.equal(await reader.locator('#progressRange').inputValue(), '5');
    await reader.locator('#fasterBtn').click();
    assert.equal(await reader.locator('#wpmOutput').textContent(), '340 WPM');
    await reader.locator('#themeSelect').selectOption('dark');
    assert.equal(await reader.locator('html').getAttribute('data-theme'), 'dark');

    // Persistence across reload
    await reader.reload();
    await reader.waitForSelector('#readerShell:not([hidden])');
    assert.equal(await reader.locator('#progressRange').inputValue(), '5');
    assert.equal(await reader.locator('#wpmOutput').textContent(), '340 WPM');
    assert.equal(await reader.locator('#themeSelect').inputValue(), 'dark');

    // Keyboard controls
    await reader.locator('#readerStage').focus();
    await reader.keyboard.press('ArrowLeft');
    assert.equal(await reader.locator('#progressRange').inputValue(), '0');
    await reader.keyboard.press('ArrowUp');
    assert.equal(await reader.locator('#wpmOutput').textContent(), '360 WPM');
    await reader.keyboard.press('Space');
    await reader.waitForFunction(() => document.querySelector('#playBtn').getAttribute('aria-pressed') === 'true');
    await reader.keyboard.press('Space');
    await reader.waitForFunction(() => document.querySelector('#playBtn').getAttribute('aria-pressed') === 'false');

    // Article Page Extraction
    const articleSentinel = `PAGE_EXTRACTION_${Date.now()}`;
    await host.bringToFront();
    await host.evaluate((value) => {
      document.body.innerHTML = `
        <nav>DO_NOT_INCLUDE_NAVIGATION</nav>
        <main><article><h1>Locally extracted article</h1><p>${value} is retained with the readable article body.</p><p>A second meaningful paragraph proves local page extraction.</p></article></main>
        <script>window.DO_NOT_INCLUDE_SCRIPT = true;<\/script>`;
    }, articleSentinel);
    const existingBeforeExtract = new Set(deepContext.pages());
    const extractResponse = await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'hummingread:extract-page' }));
    assert.equal(extractResponse.ok, true, extractResponse.error);

    const extractedReader = await waitForNewPage(
      deepContext,
      (candidate) => candidate.url().startsWith(`chrome-extension://${extensionId}/reader.html`),
      existingBeforeExtract
    );
    await extractedReader.waitForSelector('#readerShell:not([hidden])');
    const storedAfterExtract = await worker.evaluate(() => chrome.storage.local.get('hummingreadReaderDocument'));
    const extractedText = storedAfterExtract.hummingreadReaderDocument.payload.text;
    assert.match(extractedText, new RegExp(articleSentinel, 'u'));
    assert.doesNotMatch(extractedText, /DO_NOT_INCLUDE_NAVIGATION|DO_NOT_INCLUDE_SCRIPT/u);

    // Protected Page Error Handling
    const protectedPage = await deepContext.newPage();
    await protectedPage.goto('chrome://version/');
    await protectedPage.bringToFront();
    const protectedResponse = await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'hummingread:extract-page' }));
    assert.equal(protectedResponse.ok, false);
    assert.match(protectedResponse.error, /normal HTTP or HTTPS page|protects this page|blocked access/u);

    // Quick Send to Preview URL
    await reader.bringToFront();
    await reader.locator('#quickSendReaderBtn').click();
    const website = await waitForWebsitePayload(deepContext, selectedText);
    await website.waitForSelector('#rsvpReadingSection:not([hidden])', { timeout: 15_000 });
    assert.equal(await website.locator('#rsvpBookTitle').textContent(), 'Deep Reader Test');
    assert.equal(await website.locator('#textInput').inputValue(), selectedText);

    assert.equal(observedRequests.some(({ url, body }) => url.includes(sentinel) || body.includes(sentinel)), false);
    console.log('   Detailed interactive reader, keyboard shortcuts, and Quick Send E2E tests verified.');

  } finally {
    await deepContext?.close().catch(() => undefined);
    await rm(deepUserDataDir, { recursive: true, force: true });
    await rm(deepExtDir, { recursive: true, force: true });
  }

  console.log('\n====================================================');
  console.log('CHROME EXTENSION 3-LOCALE E2E SUITE PASSED (EN, RU, ES)');
  console.log('====================================================\n');
} finally {
  if (serverProcess) serverProcess.kill('SIGTERM');
}
