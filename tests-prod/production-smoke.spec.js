const { test, expect } = require('@playwright/test');
const JSZip = require('jszip');

const expectedChannel = process.env.HUMMINGREAD_EXPECTED_CHANNEL;

test('public app shell loads without browser errors', async ({ page, request }) => {
  const browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  const response = await page.goto('./', { waitUntil: 'networkidle' });

  expect(response?.status()).toBe(200);
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  await expect(page).toHaveTitle(/HummingRead/i);
  await expect(page.locator('#textInputSection')).toBeVisible();
  await expect(page.locator('#tryDemoBtn')).toBeVisible();
  await expect(page.locator('#articleImportForm')).toBeVisible();
  await expect(page.locator('#chromeExtensionPanel')).toBeVisible();
  await expect(page.locator('.pico-hero-image')).toBeVisible();
  await expect(page.locator('.pico-signature')).toContainText('PICO');
  expect(await page.locator('.pico-hero-image').evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content');
  const robotsResponse = await request.get('robots.txt');
  const robotsText = await robotsResponse.text();
  const sitemapResponse = await request.get('sitemap.xml');

  if (expectedChannel === 'tester-preview') {
    expect(robotsMeta).toMatch(/noindex/i);
    expect(robotsText).toMatch(/Disallow:\s*\//i);
    expect(sitemapResponse.status()).toBe(404);
  } else {
    expect(expectedChannel).toBe('production');
    expect(robotsMeta).toMatch(/^index,\s*follow$/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\//);
    expect(robotsText).toMatch(/Allow:\s*\//i);
    expect(sitemapResponse.status()).toBe(200);
  }

  expect(browserErrors).toEqual([]);
});

test('the website publishes a loadable Manifest V3 Chrome extension package', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'production-chromium');
  const response = await request.get('downloads/hummingread-tester.zip');
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
  const noticesEntry = zip.file('THIRD_PARTY_NOTICES.txt');
  expect(noticesEntry).not.toBeNull();
  expect(await noticesEntry.async('string')).toContain('THIRD-PARTY NOTICES');

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
