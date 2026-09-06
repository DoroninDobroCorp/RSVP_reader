const { test, expect } = require('@playwright/test');

async function resetReaderStorage(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => Boolean(window.rsvpReader));

  await page.evaluate(async () => {
    localStorage.clear();
    if (window.rsvpReader && window.rsvpReader.db) {
      window.rsvpReader.db.close();
    }

    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase('rsvp-reader-db');
      request.onsuccess = resolve;
      request.onerror = resolve;
      request.onblocked = resolve;
    });
  });

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(() => window.rsvpReader.ready);
}

test.describe('Library and bookmarks', () => {
  test('saves multiple books and restores named bookmark after reload', async ({ page }) => {
    await resetReaderStorage(page);

    await page.locator('#textInput').fill('Alpha one two three four five six seven eight nine ten.');
    await page.locator('#bookNameInput').fill('Book Alpha');
    await page.click('#addToLibraryBtn');
    await expect(page.locator('#libraryBtn')).toContainText('(1)');

    await page.locator('#textInput').fill('Beta first second third fourth fifth sixth seventh eighth ninth tenth.');
    await page.locator('#bookNameInput').fill('Book Beta');
    await page.click('#addToLibraryBtn');
    await expect(page.locator('#libraryBtn')).toContainText('(2)');

    await page.click('#libraryBtn');
    await expect(page.locator('#booksList')).toContainText('Book Alpha');
    await expect(page.locator('#booksList')).toContainText('Book Beta');

    await page.locator('li:has-text("Book Alpha") button[title="Читать"]').click();
    await expect(page.locator('#normalReadingSection')).toBeVisible();

    await page.locator('#normalTextDisplay span[data-index="4"]').click();
    page.once('dialog', (dialog) => dialog.accept('Important place'));
    await page.click('#addBookmarkBtn');

    await page.click('#bookmarksBtn');
    await expect(page.locator('#bookmarksModal')).toBeVisible();
    await expect(page.locator('#bookmarksList')).toContainText('Important place');
    await page.click('#closeBookmarksBtn');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => Boolean(window.rsvpReader));
    await page.evaluate(() => window.rsvpReader.ready);

    await page.click('#libraryBtn');
    await expect(page.locator('#booksList')).toContainText('Book Alpha');
    await expect(page.locator('#booksList')).toContainText('Book Beta');

    await page.locator('li:has-text("Book Alpha") button[title="Закладки"]').click();
    await expect(page.locator('#bookmarksList')).toContainText('Important place');
    await page.locator('#bookmarksList button:has-text("Перейти")').click();

    await expect(page.locator('#normalReadingSection')).toBeVisible();
    await expect(page.locator('#wordCount')).toContainText('5 / 11');

    const stored = await page.evaluate(async () => {
      await window.rsvpReader.ready;
      const books = await window.rsvpReader.getAllBooks();
      return books.map((book) => ({
        name: book.name,
        bookmarks: book.bookmarks.map((bookmark) => bookmark.name)
      }));
    });

    expect(stored).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Book Alpha', bookmarks: ['Important place'] }),
      expect.objectContaining({ name: 'Book Beta' })
    ]));
  });
});
