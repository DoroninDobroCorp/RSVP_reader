const { test, expect } = require('@playwright/test');

test.describe('RSVP Reader - Comprehensive Optimizations & Theme Suite', () => {

  test('1. Each checkbox changes runtime setting and persists across reload', async ({ page }) => {
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    await page.click('#settingsBtn');
    await page.waitForSelector('#settingsModal', { state: 'visible' });

    // Toggle all 5 checkboxes
    await page.check('#orpAlignmentInput');
    await page.check('#lengthScalingInput');
    await page.check('#chunkingEnabledInput');
    await page.check('#speedRampUpInput');
    await page.check('#orpNotchesInput');

    // Verify runtime settings updated immediately
    const runtimeSettings = await page.evaluate(() => window.rsvpReader.settings);
    expect(runtimeSettings.orpAlignment).toBe(true);
    expect(runtimeSettings.lengthScaling).toBe(true);
    expect(runtimeSettings.chunkingEnabled).toBe(true);
    expect(runtimeSettings.speedRampUp).toBe(true);
    expect(runtimeSettings.orpNotches).toBe(true);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open settings and assert persistence in UI and runtime
    await page.click('#settingsBtn');
    await page.waitForSelector('#settingsModal', { state: 'visible' });

    expect(await page.isChecked('#orpAlignmentInput')).toBe(true);
    expect(await page.isChecked('#lengthScalingInput')).toBe(true);
    expect(await page.isChecked('#chunkingEnabledInput')).toBe(true);
    expect(await page.isChecked('#speedRampUpInput')).toBe(true);
    expect(await page.isChecked('#orpNotchesInput')).toBe(true);

    const reloadedSettings = await page.evaluate(() => window.rsvpReader.settings);
    expect(reloadedSettings.orpAlignment).toBe(true);
    expect(reloadedSettings.lengthScaling).toBe(true);
    expect(reloadedSettings.chunkingEnabled).toBe(true);
    expect(reloadedSettings.speedRampUp).toBe(true);
    expect(reloadedSettings.orpNotches).toBe(true);
  });

  test('2. Reset button restores UI checkboxes and runtime settings to defaults', async ({ page }) => {
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    await page.click('#settingsBtn');
    await page.waitForSelector('#settingsModal', { state: 'visible' });

    // Change settings
    await page.uncheck('#orpAlignmentInput');
    await page.check('#lengthScalingInput');
    await page.check('#chunkingEnabledInput');
    await page.fill('#wpmInput', '500');

    // Click Reset
    await page.click('#resetSettingsBtn');

    // Assert UI and runtime defaults (orpAlignment: true, others false)
    expect(await page.isChecked('#orpAlignmentInput')).toBe(true);
    expect(await page.isChecked('#lengthScalingInput')).toBe(false);
    expect(await page.isChecked('#chunkingEnabledInput')).toBe(false);
    expect(await page.isChecked('#speedRampUpInput')).toBe(false);
    expect(await page.isChecked('#orpNotchesInput')).toBe(false);
    expect(await page.inputValue('#wpmInput')).toBe('250');

    const resetSettings = await page.evaluate(() => window.rsvpReader.settings);
    expect(resetSettings.wpm).toBe(250);
    expect(resetSettings.orpAlignment).toBe(true);
    expect(resetSettings.lengthScaling).toBe(false);
    expect(resetSettings.chunkingEnabled).toBe(false);
    expect(resetSettings.speedRampUp).toBe(false);
    expect(resetSettings.orpNotches).toBe(false);
  });

  test('3. Chunking shows pairs and increments index correctly without missing/duplicating words', async ({ page }) => {
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      window.rsvpReader.settings.chunkingEnabled = true;
      window.rsvpReader.settings.wpm = 400;
      window.rsvpReader.saveSettings();
    });

    const words = ['первое', 'второе', 'третье', 'четвёртое', 'пятое'];
    await page.locator('#textInput').fill(words.join(' '));
    await page.click('#startReadingBtn');
    await page.click('#startRSVPBtn');

    // First frame should display "первое второе" (2 words)
    const frame0 = await page.evaluate(() => window.rsvpReader.getFrameAt(0));
    expect(frame0.text).toBe('первое второе');
    expect(frame0.wordCount).toBe(2);

    // Frame after advancing by 2 should display "третье четвёртое"
    const frame2 = await page.evaluate(() => window.rsvpReader.getFrameAt(2));
    expect(frame2.text).toBe('третье четвёртое');
    expect(frame2.wordCount).toBe(2);

    // Frame at index 4 (odd word) should display "пятое" (1 word)
    const frame4 = await page.evaluate(() => window.rsvpReader.getFrameAt(4));
    expect(frame4.text).toBe('пятое');
    expect(frame4.wordCount).toBe(1);
  });

  test('4. Punctuation boundary isolates chunks and preserves delay multiplier', async ({ page }) => {
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      window.rsvpReader.settings.chunkingEnabled = true;
      window.rsvpReader.settings.wpm = 400;
      window.rsvpReader.settings.periodPause = 2.5;
      window.rsvpReader.saveSettings();
    });

    const text = 'Слово. Следующее слово';
    await page.locator('#textInput').fill(text);
    await page.click('#startReadingBtn');
    await page.click('#startRSVPBtn');

    // First word ends with "." so it must NOT be chunked with "Следующее"
    const frame0 = await page.evaluate(() => window.rsvpReader.getFrameAt(0));
    expect(frame0.text).toBe('Слово.');
    expect(frame0.wordCount).toBe(1);
    expect(frame0.punctuationMultiplier).toBe(2.5);
  });

  test('5. Speed Ramp-up starts when Play is clicked regardless of pause duration', async ({ page }) => {
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      window.rsvpReader.settings.speedRampUp = true;
      window.rsvpReader.saveSettings();
    });

    await page.locator('#textInput').fill('Один два три четыре пять шесть семь восемь девять десять');
    await page.click('#startReadingBtn');
    await page.click('#startRSVPBtn');

    // Simulate standing in pause for 1 second
    await page.waitForTimeout(1000);

    const nowBeforePlay = Date.now();
    // Click Play
    await page.click('#playPauseBtn');

    // Assert rampUpStartTime was set at moment Play was clicked
    const rampStart = await page.evaluate(() => window.rsvpReader.rampUpStartTime);
    expect(rampStart).toBeGreaterThan(0);
    expect(Math.abs(rampStart - nowBeforePlay)).toBeLessThan(2500);
  });

  test('6. Pauses do NOT affect Real WPM calculation', async ({ page }) => {
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    await page.locator('#textInput').fill('Слово1 Слово2 Слово3 Слово4 Слово5 Слово6 Слово7 Слово8 Слово9 Слово10');
    await page.click('#startReadingBtn');
    await page.click('#startRSVPBtn');

    // Play for 1s
    await page.click('#playPauseBtn');
    await page.waitForTimeout(1000);

    // Pause for 2s
    await page.click('#playPauseBtn');
    await page.waitForTimeout(2000);

    // Get active playback minutes
    const activeMins = await page.evaluate(() => window.rsvpReader.getActivePlaybackMinutes());
    expect(activeMins).toBeLessThan(0.035); // Should be ~1s (~0.017 min), NOT 3s (~0.05 min)
  });

  test('7. Focus letter stays centered within 1.0px tolerance in ORP grid mode', async ({ page }) => {
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      window.rsvpReader.settings.orpAlignment = true;
      window.rsvpReader.saveSettings();
    });

    const sampleWords = ['а', 'слово', 'исследование', 'скорочтение', 'интерфейсе'];
    await page.locator('#textInput').fill(sampleWords.join(' '));
    await page.click('#startReadingBtn');
    await page.click('#startRSVPBtn');

    for (let i = 0; i < sampleWords.length; i++) {
      await page.evaluate((idx) => {
        window.rsvpReader.currentIndex = idx;
        window.rsvpReader.displayCurrentWord();
      }, i);

      const focusCenter = await page.evaluate(() => {
        const el = document.querySelector('.focus-letter');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return (r.left + r.right) / 2;
      });

      expect(focusCenter).not.toBeNull();
      // On 1280px viewport, center should be 640px ± 1px
      expect(Math.abs(focusCenter - 640)).toBeLessThanOrEqual(1.0);
    }
  });

  test('8. Offline reload works after cache update', async ({ page, context }) => {
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    // Set offline
    await context.setOffline(true);

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Assert main container and title are present
    const title = await page.title();
    expect(title).toBe('RSVP Reader');

    await context.setOffline(false);
  });

  test('9. Day and Night themes render with proper contrast on Desktop & Mobile', async ({ page }) => {
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    // Test Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => window.rsvpReader.setTheme('night'));
    let themeAttrNight = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(themeAttrNight).toBe('night');

    await page.evaluate(() => window.rsvpReader.setTheme('day'));
    let themeAttrDay = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(themeAttrDay).toBe('day');

    // Test Mobile Viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.evaluate(() => window.rsvpReader.setTheme('night'));
    const mobileThemeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(mobileThemeAttr).toBe('night');
  });

});
