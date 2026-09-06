const { test, expect } = require('@playwright/test');

test('queues local data offline and syncs it when online again', async ({ page, context, request }) => {
  const bookName = `Offline Sync Book ${Date.now()}`;

  await request.post('/api/sync', {
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

  await page.goto('/?reset-cache=1');
  await page.waitForLoadState('networkidle');

  await context.setOffline(true);
  await page.locator('#textInput').fill('Offline sync title body words for bookmark testing.');
  await page.locator('#bookNameInput').fill(bookName);
  await page.locator('#addToLibraryBtn').click();
  await page.locator('#startReadingBtn').click();
  await page.locator('#normalTextDisplay span').nth(4).click();
  await expect(page.locator('#wordCount')).toContainText('5 /');
  await page.waitForTimeout(500);
  await page.locator('#settingsBtn').click();
  await page.locator('#wpmInput').fill('450');
  await page.locator('#closeSettingsBtn').click();

  page.once('dialog', async (dialog) => dialog.accept('Offline bookmark'));
  await page.locator('#addBookmarkBtn').click();
  await expect(page.locator('#offlineBadge')).toHaveClass(/offline/);

  await context.setOffline(false);
  await page.evaluate(() => window.rsvpReader.syncNow());
  await expect.poll(
    async () => page.evaluate(() => localStorage.getItem('rsvp_sync_pending')),
    { timeout: 10000 }
  ).toBe('0');

  const response = await request.post('/api/sync', {
    data: {
      version: 1,
      clientId: `test-reader-${Date.now()}`,
      sentAt: new Date().toISOString(),
      books: [],
      deletedBooks: {}
    }
  });
  const state = await response.json();
  const book = state.books.find((item) => item.name === bookName);

  expect(book).toBeTruthy();
  expect(book.currentIndex).toBe(4);
  expect(book.bookmarks.some((bookmark) => bookmark.name === 'Offline bookmark')).toBe(true);
  expect(state.draft.currentIndex).toBe(4);
  expect(state.settings.wpm).toBe(450);
});
