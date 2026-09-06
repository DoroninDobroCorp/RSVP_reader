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
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#textInput')).toBeVisible();
    await expect(page.locator('[data-i18n="textOrBook"]:visible').first()).toHaveText(/Start reading|Начать чтение/);
  } finally {
    await context.setOffline(false);
  }
});

test('VAL-R3-PWA-002 / VAL-R4-PWA-002: Service worker registers with trailing slash scope under /rsvp/ without SecurityError', async ({ page }) => {
  await page.goto(`/rsvp/?offline-subpath-sw=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async () => {
    await window.rsvpReader.ready;
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });

  const swDetails = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration('/rsvp/');
    return reg ? { scope: reg.scope, active: Boolean(reg.active) } : null;
  });

  expect(swDetails).not.toBeNull();
  expect(swDetails.scope).toMatch(/\/rsvp\/?$/);
  expect(swDetails.active).toBe(true);

  // Reload once online to acquire controller status under /rsvp/
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  const hasController = await page.evaluate(() => Boolean(navigator.serviceWorker?.controller));
  expect(hasController).toBe(true);
});

test('VAL-R3-PWA-003 / VAL-R4-PWA-003: Offline PWA navigation under subpath /rsvp/ renders app shell', async ({ page, context }) => {
  await page.goto(`/rsvp/?offline-subpath-app=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async () => {
    await window.rsvpReader.ready;
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });

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

test('VAL-R3-PWA-003 / VAL-R4-PWA-003: Localized legal content renders offline under root /', async ({ page, context }) => {
  await page.goto(`/?offline-legal-install=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async () => {
    await window.rsvpReader.ready;
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

  await context.setOffline(true);
  try {
    await page.goto('/privacy.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Privacy Policy|HummingRead/i);

    await page.goto('/ru/privacy.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Политика конфиденциальности/i);

    await page.goto('/es/privacy.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Política de privacidad/i);

    await page.goto('/support.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Support|HummingRead/i);
  } finally {
    await context.setOffline(false);
  }
});

test('VAL-R3-PWA-003 / VAL-R4-PWA-003: Localized legal content renders offline under subpath /rsvp/', async ({ page, context }) => {
  await page.goto(`/rsvp/?offline-subpath-legal=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async () => {
    await window.rsvpReader.ready;
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

  await context.setOffline(true);
  try {
    await page.goto('/rsvp/privacy.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Privacy Policy|HummingRead/i);

    await page.goto('/rsvp/ru/privacy.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Политика конфиденциальности/i);

    await page.goto('/rsvp/es/privacy.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Política de privacidad/i);
  } finally {
    await context.setOffline(false);
  }
});

test('VAL-R5-PWA-001: Offline PWA navigation without trailing slash (/rsvp and /rsvp/ru) renders localized app shell', async ({ page, context }) => {
  await page.goto(`/rsvp/?offline-subpath-noslash=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async () => {
    await window.rsvpReader.ready;
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });

  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  try {
    await page.goto('/rsvp', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-i18n="textOrBook"]:visible').first()).toHaveText(/Start reading|Начать чтение/);
    await expect(page.locator('#offlineBadge')).toContainText(/Offline|Офлайн|local|локально/i);

    await page.goto('/rsvp/ru', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-i18n="textOrBook"]:visible').first()).toHaveText(/Начать чтение/);
  } finally {
    await context.setOffline(false);
  }
});
