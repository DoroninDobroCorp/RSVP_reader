const { test, expect } = require('@playwright/test');
const JSZip = require('jszip');

test('public app shell loads without browser errors', async ({ page }) => {
  const browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  const response = await page.goto('./', { waitUntil: 'networkidle' });

  expect(response?.status()).toBe(200);
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  await expect(page).toHaveTitle(/PaceFlow|RSVP/i);
  await expect(page.locator('#textInputSection')).toBeVisible();
  await expect(page.locator('#tryDemoBtn')).toBeVisible();
  await expect(page.locator('#articleImportForm')).toBeVisible();
  await expect(page.locator('#chromeExtensionPanel')).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('the website publishes a loadable Manifest V3 Chrome extension package', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'production-chromium');
  const response = await request.get('downloads/paceflow-quick-send.zip');
  expect(response.status()).toBe(200);
  const zip = await JSZip.loadAsync(await response.body());
  const manifestEntry = zip.file('manifest.json');
  expect(manifestEntry).not.toBeNull();
  const manifest = JSON.parse(await manifestEntry.async('string'));
  expect(manifest).toMatchObject({
    manifest_version: 3,
    background: { service_worker: 'background.js' },
    action: { default_popup: 'popup.html' }
  });
  expect(manifest.permissions).not.toContain('tabs');
  expect(manifest.permissions).not.toContain('history');
});

test('the zero-friction demo enters focus mode on the deployed build', async ({ page }) => {
  await page.goto('./', { waitUntil: 'networkidle' });
  await page.locator('#tryDemoBtn').click();

  await expect(page.locator('#rsvpReadingSection')).toBeVisible();
  await expect(page.locator('#rsvpWordDisplay')).not.toHaveText('');
  await expect(page.locator('#rsvpScrubber')).toBeEnabled();
  await expect(page.locator('#rsvpBookTitle')).not.toHaveText('');
});

test('the deployed article endpoint rejects loopback targets', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'production-chromium');

  const response = await request.post('api/article', {
    data: { url: 'http://127.0.0.1/private' }
  });

  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({ code: 'private_address' });
});
