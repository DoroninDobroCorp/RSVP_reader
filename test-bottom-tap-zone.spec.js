const { test, expect } = require('@playwright/test');

test.describe('Bottom tap zone', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  test('toggles pause and resume by tapping the lower screen area', async ({ page }) => {
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    await page.locator('#textInput').fill('Bottom tap check. This text should pause and resume from the lower screen area.');
    await page.click('#startReadingBtn');
    await page.click('#startRSVPBtn');
    await expect(page.locator('#rsvpReadingSection')).toBeVisible();

    const zoneBox = await page.locator('#rsvpBottomTapZone').boundingBox();
    expect(zoneBox.height).toBeGreaterThanOrEqual(120);

    const x = 195;
    const y = 790;

    await page.touchscreen.tap(x, y);
    await expect(page.locator('#playPauseBtn')).toContainText('▶️');
    await expect(page.locator('#rsvpBottomTapLabel')).toContainText('Продолжить');

    await page.waitForTimeout(350);
    await page.touchscreen.tap(x, y);
    await expect(page.locator('#playPauseBtn')).toContainText('⏸️');
    await expect(page.locator('#rsvpBottomTapLabel')).toContainText('Пауза');
  });
});
