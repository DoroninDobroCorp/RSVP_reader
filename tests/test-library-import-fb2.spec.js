const { test, expect } = require('@playwright/test');

test('Import FB2 book directly through Library Import button', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.click('#libraryBtn');
  await page.waitForSelector('#librarySection');

  const fb2Path = '/srv/RSVP_reader/Yuri_Nikitin_Imortist.fb2';
  await page.locator('#libraryImportInput').setInputFiles(fb2Path);

  await page.waitForSelector('.toast', { timeout: 15000 });
  const toastText = await page.locator('.toast').innerText();
  console.log('Library Import Toast:', toastText);
  expect(toastText).toContain('добавлена в библиотеку');

  const libraryText = await page.locator('#booksList').innerText();
  expect(libraryText).toContain('Yuri Nikitin Imortist');
});
