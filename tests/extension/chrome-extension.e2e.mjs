import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const sourceExtensionPath = join(root, 'chrome-extension');
const localUrl = 'http://127.0.0.1:8081/';
const userDataDirectory = await mkdtemp(join(tmpdir(), 'paceflow-chrome-e2e-'));
const extensionPath = await mkdtemp(join(tmpdir(), 'paceflow-extension-e2e-'));
let serverProcess = null;
let context = null;

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
  throw new Error('Local PaceFlow server did not start.');
}

async function waitForExtensionWorker(browserContext) {
  const existing = browserContext.serviceWorkers()[0];
  if (existing) return existing;
  return browserContext.waitForEvent('serviceworker', { timeout: 15_000 });
}

try {
  await cp(sourceExtensionPath, extensionPath, { recursive: true });
  const manifestPath = join(extensionPath, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const testMatch = 'http://127.0.0.1:8081/*';
  manifest.host_permissions.push(testMatch);
  manifest.content_scripts[0].matches.push(testMatch);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  if (!await serverIsReady()) {
    serverProcess = spawn(process.execPath, ['server.js'], {
      cwd: root,
      env: { ...process.env, PORT: '8081' },
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
  if (process.env.PACEFLOW_CHROME_PATH) launchOptions.executablePath = process.env.PACEFLOW_CHROME_PATH;
  context = await chromium.launchPersistentContext(userDataDirectory, launchOptions);
  const worker = await waitForExtensionWorker(context);
  const extensionId = new URL(worker.url()).hostname;
  assert.match(extensionId, /^[a-p]{32}$/u);

  await worker.evaluate((url) => chrome.storage.local.set({ paceflowBaseUrl: url }), localUrl);
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/popup.html`);
  await extensionPage.waitForSelector('#selectionBtn');
  if (process.env.PACEFLOW_EXTENSION_SCREENSHOT) {
    await extensionPage.screenshot({ path: process.env.PACEFLOW_EXTENSION_SCREENSHOT, fullPage: true });
  }

  const text = [
    'The real Chrome service worker queues this selected passage in memory.',
    'Its content bridge transfers the passage into the local PaceFlow website.',
    'The website stores the text as a local book and immediately starts focus mode.'
  ].join('\n\n');
  const response = await extensionPage.evaluate((payload) => chrome.runtime.sendMessage({
    type: 'paceflow:send-payload',
    payload
  }), {
    type: 'text',
    text,
    title: 'Real extension handoff',
    sourceUrl: 'https://example.com/extension-e2e#selection'
  });
  assert.equal(response.ok, true, response.error);

  const page = await (async () => {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const match = context.pages().find((candidate) => candidate.url().startsWith(localUrl));
      if (match) return match;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('The extension did not open PaceFlow.');
  })();
  await page.waitForSelector('#rsvpReadingSection:not([hidden])', { timeout: 15_000 });
  assert.equal(await page.locator('#rsvpBookTitle').textContent(), 'Real extension handoff');
  assert.equal(await page.locator('#textInput').inputValue(), text);
  await page.waitForFunction(() => !window.location.search.includes('paceflow-extension-import'));

  const pending = await worker.evaluate(() => chrome.storage.session.get(null));
  assert.deepEqual(pending, {});
  const alarms = await worker.evaluate(() => chrome.alarms.getAll());
  assert.deepEqual(alarms, []);
  console.log(`Verified real Chrome extension ${extensionId}: service worker → session handoff → website focus mode.`);
} finally {
  await context?.close().catch(() => undefined);
  if (serverProcess) serverProcess.kill('SIGTERM');
  await rm(userDataDirectory, { recursive: true, force: true });
  await rm(extensionPath, { recursive: true, force: true });
}
