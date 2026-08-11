import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const baseUrl = process.env.HUMMINGREAD_VISUAL_URL || 'http://127.0.0.1:8081/';
const output = join(root, 'artifacts', 'visual');
let server = null;

async function serverReady() {
  try { return (await fetch(baseUrl)).ok; } catch (error) { return false; }
}

async function ensureServer() {
  if (await serverReady()) return;
  server = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, HOST: '127.0.0.1', PORT: '8081' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await serverReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error('Local HummingRead server did not start.');
}

async function readyPage(browser, options) {
  const context = await browser.newContext({
    viewport: { width: options.width, height: options.height },
    locale: options.locale || 'en-US',
    colorScheme: options.colorScheme || 'light',
    reducedMotion: options.reducedMotion || 'no-preference'
  });
  const page = await context.newPage();
  await page.goto(baseUrl);
  await page.evaluate((language) => localStorage.setItem('rsvp_language', language), options.language || 'en');
  await page.reload();
  await page.evaluate(() => window.rsvpReader.ready);
  return { context, page };
}

async function captureLanding(browser, viewport) {
  const { context, page } = await readyPage(browser, viewport);
  const geometry = await page.evaluate(() => ({
    demo: document.querySelector('#tryDemoBtn').getBoundingClientRect().bottom,
    importBook: document.querySelector('#heroImportBtn').getBoundingClientRect().bottom,
    viewport: innerHeight,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  assert.ok(geometry.demo <= geometry.viewport, `Demo CTA is below ${viewport.width}x${viewport.height}.`);
  assert.ok(geometry.importBook <= geometry.viewport, `Import CTA is below ${viewport.width}x${viewport.height}.`);
  assert.ok(geometry.overflow <= 1, `Horizontal overflow at ${viewport.width}x${viewport.height}.`);
  await page.screenshot({ path: join(output, `landing-${viewport.width}x${viewport.height}-${viewport.language || 'en'}-first.png`) });
  if (viewport.fullPage) {
    await page.screenshot({ path: join(output, `landing-${viewport.width}x${viewport.height}-${viewport.language || 'en'}-full.png`), fullPage: true });
  }
  await context.close();
}

async function captureReturning(browser) {
  const { context, page } = await readyPage(browser, { width: 390, height: 844 });
  await page.evaluate(async () => {
    const reader = window.rsvpReader;
    const text = Array.from({ length: 900 }, (_, index) => `humming${index}`).join(' ');
    const book = reader.normalizeBook({
      id: 'visual-returning-book',
      name: 'The Hummingbird Field Notes',
      text,
      currentIndex: 420,
      dateAdded: '2026-08-11T00:00:00.000Z',
      lastRead: '2026-08-11T00:00:00.000Z',
      updatedAt: '2026-08-11T00:00:00.000Z'
    }, { recalculateCounts: true });
    await reader.putBook(book);
    reader.currentBookId = book.id;
    await reader.loadLibrary();
    reader.showSection('input');
  });
  await page.screenshot({ path: join(output, 'returning-reader-390x844.png') });
  const state = await page.locator('#continueReadingCard').evaluate((element) => ({
    visible: !element.hidden,
    pseudoImage: getComputedStyle(element, '::after').backgroundImage,
    overflow: getComputedStyle(element).overflow
  }));
  assert.equal(state.visible, true);
  assert.match(state.pseudoImage, /pico-quick-send/u);
  assert.equal(state.overflow, 'visible');
  await context.close();
}

async function captureFocus(browser, options) {
  const { context, page } = await readyPage(browser, options);
  await page.locator('#tryDemoBtn').click();
  await page.locator('#rsvpReadingSection').waitFor({ state: 'visible' });
  await page.waitForTimeout(3800);
  if (!options.keepGuide) await page.evaluate(() => window.rsvpReader.finishDemoGuide());
  if (options.theme === 'night') await page.evaluate(() => window.rsvpReader.setTheme('night'));
  await page.screenshot({ path: join(output, options.name) });
  const state = await page.evaluate(() => ({
    contextVisible: document.querySelector('#rsvpPauseContext').getAttribute('aria-hidden') === 'false',
    wpm: document.querySelector('#rsvpWpmLabel').textContent,
    rewind: document.querySelector('#rewindWordsBtn').getAttribute('aria-label'),
    bottom: document.querySelector('#rsvpBottomTapZone').getBoundingClientRect().bottom,
    viewport: innerHeight
  }));
  assert.equal(state.contextVisible, true);
  assert.match(state.wpm, /WPM/u);
  assert.ok(state.rewind);
  assert.ok(state.bottom <= state.viewport + 1);
  await context.close();
}

await mkdir(output, { recursive: true });
await ensureServer();
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 390, height: 844, fullPage: true },
    { width: 430, height: 932 },
    { width: 390, height: 844, language: 'ru', locale: 'ru-RU' },
    { width: 1024, height: 1366 },
    { width: 1366, height: 1024 },
    { width: 1440, height: 1000, fullPage: true }
  ]) await captureLanding(browser, viewport);

  await captureReturning(browser);
  await captureFocus(browser, { width: 390, height: 844, keepGuide: true, name: 'guided-demo-pause-context-390x844.png' });
  await captureFocus(browser, { width: 390, height: 844, name: 'focus-paused-light-390x844.png' });
  await captureFocus(browser, { width: 390, height: 844, theme: 'night', colorScheme: 'dark', name: 'focus-paused-dark-390x844.png' });
  await captureFocus(browser, { width: 568, height: 320, name: 'focus-paused-landscape-568x320.png' });
  await captureFocus(browser, { width: 1024, height: 768, name: 'focus-paused-ipad-landscape-1024x768.png' });

  const report = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    chromium: await browser.version(),
    files: [
      'phone landing first viewport EN/RU at 320/375/390/430',
      'returning reader with boundary-breaking Pico card',
      'desktop and iPad portrait/landscape landing',
      'paused focus context light/dark and phone/iPad landscape'
    ]
  };
  await writeFile(join(output, 'matrix.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Captured and geometry-verified HummingRead visual matrix in ${output}`);
} finally {
  await browser.close();
  if (server) server.kill('SIGTERM');
}
