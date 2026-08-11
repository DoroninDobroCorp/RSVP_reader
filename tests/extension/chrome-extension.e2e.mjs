import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const sourceExtensionPath = join(root, 'chrome-extension');
const localUrl = 'http://127.0.0.1:8081/';
const userDataDirectory = await mkdtemp(join(tmpdir(), 'hummingread-chrome-e2e-'));
const extensionPath = await mkdtemp(join(tmpdir(), 'hummingread-extension-e2e-'));
let serverProcess = null;
let context = null;
const artifactDirectory = process.env.HUMMINGREAD_EXTENSION_ARTIFACT_DIR || '';

async function serverIsReady() {
  try {
    const response = await fetch(localUrl);
    return response.ok;
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

async function waitForNewPage(match, existingPages = new Set(context.pages())) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const page = context.pages().find((candidate) => !existingPages.has(candidate) && match(candidate));
    if (page) return page;
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error('Expected extension page did not open.');
}

async function waitForWebsitePayload(expectedText) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    for (const page of context.pages().filter((candidate) => candidate.url().startsWith(localUrl))) {
      const value = await page.locator('#textInput').inputValue().catch(() => '');
      if (value === expectedText) return page;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Quick Send did not open the configured website preview.');
}

try {
  await cp(sourceExtensionPath, extensionPath, { recursive: true });
  const manifestPath = join(extensionPath, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const testMatch = 'http://127.0.0.1:8081/*';
  manifest.host_permissions = [testMatch];
  manifest.content_scripts = [{
    matches: [testMatch],
    js: ['core.js', 'bridge.js'],
    run_at: 'document_idle'
  }];
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  if (!await serverIsReady()) {
    serverProcess = spawn(process.execPath, ['server.js'], {
      cwd: root,
      env: { ...process.env, HOST: '127.0.0.1', PORT: '8081' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    await waitForServer();
  }

  const launchOptions = {
    headless: true,
    channel: 'chromium',
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  };
  if (process.env.HUMMINGREAD_CHROME_PATH) launchOptions.executablePath = process.env.HUMMINGREAD_CHROME_PATH;
  context = await chromium.launchPersistentContext(userDataDirectory, launchOptions);
  const worker = await waitForExtensionWorker(context);
  const extensionId = new URL(worker.url()).hostname;
  assert.match(extensionId, /^[a-p]{32}$/u);

  await worker.evaluate((url) => chrome.storage.local.set({ hummingreadPreviewUrl: url }), localUrl);
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 380, height: 650 });
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForSelector('#selectionBtn');
  assert.equal(await popup.locator('#clipboardBtn').count(), 0);
  if (artifactDirectory) {
    await mkdir(artifactDirectory, { recursive: true });
    await popup.screenshot({ path: join(artifactDirectory, 'extension-popup-light.png'), fullPage: true });
  }

  const sentinel = `LOCAL_ONLY_SENTINEL_${Date.now()}_must_never_leave_the_extension`;
  const selectedText = [
    `${sentinel} begins a private selected passage for the standalone reader.`,
    'Pico keeps the focal letter steady while each word advances at a chosen pace.',
    'Pause restores context, rewind moves exactly ten words, and progress remains local.',
    'This final sentence makes the selection long enough to test playback and scrubbing.'
  ].join(' ');
  const host = await context.newPage();
  await host.goto(`${localUrl}support.html`);
  await host.evaluate((text) => {
    document.title = 'Private selection';
    document.body.innerHTML = `<main><article id="selection"><h1>Private selection</h1><p></p></article></main>`;
    document.querySelector('#selection p').textContent = text;
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#selection p'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, selectedText);

  const observedRequests = [];
  context.on('request', (request) => {
    observedRequests.push({ url: request.url(), body: request.postData() || '' });
  });

  await host.bringToFront();
  const existingBeforeReader = new Set(context.pages());
  const localResponse = await popup.evaluate(() => chrome.runtime.sendMessage({
    type: 'hummingread:read-selection'
  }));
  assert.equal(localResponse.ok, true, localResponse.error);
  const reader = await waitForNewPage(
    (candidate) => candidate.url().startsWith(`chrome-extension://${extensionId}/reader.html`),
    existingBeforeReader
  );
  await reader.waitForSelector('#readerShell:not([hidden])');
  assert.equal(await reader.locator('#documentTitle').textContent(), 'Private selection');
  assert.match(await reader.locator('#wordFrame').textContent(), /LOCAL_ONLY_SENTINEL/u);
  assert.equal(await reader.locator('#wpmOutput').textContent(), '320 WPM');
  assert.equal(await reader.locator('#pauseContext mark').textContent(), `${sentinel}`);
  assert.equal(observedRequests.some(({ url, body }) => url.includes(sentinel) || body.includes(sentinel)), false);

  await reader.locator('#playBtn').click();
  await reader.waitForFunction(() => Number(document.querySelector('#progressRange').value) >= 2);
  await reader.locator('#playBtn').click();
  const playedIndex = Number(await reader.locator('#progressRange').inputValue());
  await reader.locator('#progressRange').fill('18');
  assert.equal(await reader.locator('#progressRange').inputValue(), '18');
  await reader.locator('#rewindBtn').click();
  assert.equal(await reader.locator('#progressRange').inputValue(), '8');
  await reader.locator('#fasterBtn').click();
  assert.equal(await reader.locator('#wpmOutput').textContent(), '340 WPM');
  await reader.locator('#themeSelect').selectOption('dark');
  assert.equal(await reader.locator('html').getAttribute('data-theme'), 'dark');
  if (artifactDirectory) {
    await reader.screenshot({ path: join(artifactDirectory, 'extension-reader-dark-paused.png'), fullPage: true });
  }
  assert.ok(playedIndex >= 2);

  await reader.reload();
  await reader.waitForSelector('#readerShell:not([hidden])');
  assert.equal(await reader.locator('#progressRange').inputValue(), '8');
  assert.equal(await reader.locator('#wpmOutput').textContent(), '340 WPM');
  assert.equal(await reader.locator('#themeSelect').inputValue(), 'dark');
  await reader.locator('#readerStage').focus();
  await reader.keyboard.press('ArrowLeft');
  assert.equal(await reader.locator('#progressRange').inputValue(), '0');
  await reader.keyboard.press('ArrowUp');
  assert.equal(await reader.locator('#wpmOutput').textContent(), '360 WPM');
  await reader.keyboard.press('Space');
  await reader.waitForFunction(() => document.querySelector('#playBtn').getAttribute('aria-pressed') === 'true');
  await reader.keyboard.press('Space');
  await reader.waitForFunction(() => document.querySelector('#playBtn').getAttribute('aria-pressed') === 'false');

  const articleSentinel = `PAGE_EXTRACTION_${Date.now()}`;
  await host.bringToFront();
  await host.evaluate((value) => {
    document.body.innerHTML = `
      <nav>DO_NOT_INCLUDE_NAVIGATION</nav>
      <main><article><h1>Locally extracted article</h1><p>${value} is retained with the readable article body.</p><p>A second meaningful paragraph proves local page extraction.</p></article></main>
      <script>window.DO_NOT_INCLUDE_SCRIPT = true;<\/script>`;
  }, articleSentinel);
  const existingBeforeExtract = new Set(context.pages());
  const extractResponse = await popup.evaluate(() => chrome.runtime.sendMessage({
    type: 'hummingread:extract-page'
  }));
  assert.equal(extractResponse.ok, true, extractResponse.error);
  const extractedReader = await waitForNewPage(
    (candidate) => candidate.url().startsWith(`chrome-extension://${extensionId}/reader.html`),
    existingBeforeExtract
  );
  await extractedReader.waitForSelector('#readerShell:not([hidden])');
  const storedAfterExtract = await worker.evaluate(() => chrome.storage.local.get('hummingreadReaderDocument'));
  const extractedText = storedAfterExtract.hummingreadReaderDocument.payload.text;
  assert.match(extractedText, new RegExp(articleSentinel, 'u'));
  assert.doesNotMatch(extractedText, /DO_NOT_INCLUDE_NAVIGATION|DO_NOT_INCLUDE_SCRIPT/u);

  const protectedPage = await context.newPage();
  await protectedPage.goto('chrome://version/');
  await protectedPage.bringToFront();
  const protectedResponse = await popup.evaluate(() => chrome.runtime.sendMessage({
    type: 'hummingread:extract-page'
  }));
  assert.equal(protectedResponse.ok, false);
  assert.match(protectedResponse.error, /normal HTTP or HTTPS page|protects this page|blocked access/u);
  if (artifactDirectory) {
    const errorReader = await context.newPage();
    await errorReader.goto(`chrome-extension://${extensionId}/reader.html?error=${encodeURIComponent(protectedResponse.error)}`);
    await errorReader.waitForSelector('#errorState:not([hidden])');
    await errorReader.screenshot({ path: join(artifactDirectory, 'extension-protected-page-error.png'), fullPage: true });
    await errorReader.close();
  }

  await reader.bringToFront();
  await reader.locator('#quickSendReaderBtn').click();
  const website = await waitForWebsitePayload(selectedText);
  await website.waitForSelector('#rsvpReadingSection:not([hidden])', { timeout: 15_000 });
  assert.equal(await website.locator('#rsvpBookTitle').textContent(), 'Private selection');
  assert.equal(await website.locator('#textInput').inputValue(), selectedText);
  await website.waitForFunction(() => !window.location.search.includes('hummingread-extension-import'));
  assert.equal(observedRequests.some(({ url, body }) => url.includes(sentinel) || body.includes(sentinel)), false);

  const pending = await worker.evaluate(() => chrome.storage.session.get(null));
  assert.deepEqual(pending, {});
  const alarms = await worker.evaluate(() => chrome.alarms.getAll());
  assert.deepEqual(alarms, []);
  console.log(
    `Verified real Chrome extension ${extensionId}: local selection/page RSVP, persistence, keyboard/focus, protected-page error, zero sentinel transmission, and explicit Quick Send.`
  );
} finally {
  await context?.close().catch(() => undefined);
  if (serverProcess) serverProcess.kill('SIGTERM');
  await rm(userDataDirectory, { recursive: true, force: true });
  await rm(extensionPath, { recursive: true, force: true });
}
