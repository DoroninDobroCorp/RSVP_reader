const { test, expect } = require('@playwright/test');

test('Upload real Russian FB2 book Yuri_Nikitin_Imortist.fb2', async ({ page }) => {
  await page.goto('http://localhost:8081');
  await page.waitForLoadState('networkidle');

  const fb2Path = '/srv/RSVP_reader/Yuri_Nikitin_Imortist.fb2';
  await page.locator('#fileInput').setInputFiles(fb2Path);

  await page.waitForFunction(() => {
    const val = document.getElementById('textInput').value;
    return val && !val.startsWith('Загрузка');
  }, { timeout: 15000 });

  const text = await page.locator('#textInput').inputValue();
  console.log('Parsed Yuri_Nikitin_Imortist.fb2 text length:', text.length);
  expect(text.length).toBeGreaterThan(10000);
  expect(text).toContain('Никитин');
});
