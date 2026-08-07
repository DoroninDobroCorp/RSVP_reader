const { test, expect } = require('@playwright/test');

test('the installed app shell reopens without a network connection', async ({ page, context }) => {
  await page.goto(`/?offline-production=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async () => {
    await window.rsvpReader.ready;
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });

  // Reload once online so this page is controlled by the freshly installed
  // worker, then prove a navigation succeeds with the network disabled.
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-i18n="textOrBook"]:visible').first()).toHaveText(/Start reading|Начать чтение/);
    await expect(page.locator('#offlineBadge')).toContainText(/Offline|Офлайн|local|локально/i);
    await page.locator('#tryDemoBtn').click();
    await expect(page.locator('#rsvpReadingSection')).toBeVisible();
    await expect(page.locator('#rsvpBookTitle')).toHaveText('A quiet reading demo');
  } finally {
    await context.setOffline(false);
  }
});

test('navigating to a text asset cannot poison the cached offline app shell', async ({ page, context }) => {
  await page.goto(`/?offline-poison=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async () => {
    await window.rsvpReader.ready;
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

  await page.goto('/sample_text.txt');
  await expect(page.locator('body')).toContainText('Chapter One');
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.rsvpReader));

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#textInput')).toBeVisible();
    await expect(page.locator('[data-i18n="textOrBook"]:visible').first()).toHaveText(/Start reading|Начать чтение/);
  } finally {
    await context.setOffline(false);
  }
});
