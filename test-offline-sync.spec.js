const { test, expect } = require('@playwright/test');

test('queues local data offline and syncs it when online again', async ({ page, context, request }) => {
  await request.post('http://localhost:8081/api/sync', {
    data: {
      version: 1,
      clientId: `test-reset-${Date.now()}`,
      sentAt: new Date().toISOString(),
      settings: null,
      settingsUpdatedAt: new Date(0).toISOString(),
      draft: null,
      books: [],
      deletedBooks: {}
    }
  });

  await page.goto('http://localhost:8081/?reset-cache=1');
  await page.waitForLoadState('networkidle');

  await context.setOffline(true);
  await page.locator('#textInput').fill('Offline sync title body words for bookmark testing.');
  await page.locator('#bookNameInput').fill('Offline Sync Book');
  await page.locator('#addToLibraryBtn').click();
  await page.locator('#startReadingBtn').click();
  await page.locator('#settingsBtn').click();
  await page.locator('#wpmInput').fill('450');
  await page.locator('#closeSettingsBtn').click();

  page.once('dialog', async (dialog) => dialog.accept('Offline bookmark'));
  await page.locator('#addBookmarkBtn').click();
  await expect(page.locator('#offlineBadge')).toContainText('Офлайн');

  await context.setOffline(false);
  await page.evaluate(() => window.rsvpReader.syncNow());
  await expect.poll(
    async () => page.evaluate(() => localStorage.getItem('rsvp_sync_pending')),
    { timeout: 10000 }
  ).toBe('0');

  const response = await request.post('http://localhost:8081/api/sync', {
    data: {
      version: 1,
      clientId: `test-reader-${Date.now()}`,
      sentAt: new Date().toISOString(),
      books: [],
      deletedBooks: {}
    }
  });
  const state = await response.json();
  const book = state.books.find((item) => item.name === 'Offline Sync Book');

  expect(book).toBeTruthy();
  expect(book.bookmarks.some((bookmark) => bookmark.name === 'Offline bookmark')).toBe(true);
  expect(state.settings.wpm).toBe(450);
});
