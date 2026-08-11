const { test, expect } = require('@playwright/test');
const JSZip = require('jszip');
const http = require('node:http');

// App-shell caching is covered by the dedicated offline suite. Blocking it here
// avoids a newly installed worker reloading the page in the middle of an upload.
test.use({ serviceWorkers: 'block' });

async function openReader(page, language = 'en') {
  await page.goto(`/?production-regression=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async (nextLanguage) => {
    await window.rsvpReader.ready;
    window.rsvpReader.setLanguage(nextLanguage);
  }, language);
}

async function loadPlainText(page, text, title = 'Regression book') {
  await page.locator('#textInput').fill(text);
  await page.locator('#bookNameInput').fill(title);
  await page.evaluate(async () => window.rsvpReader.startNormalReading());
  await expect(page.locator('#normalReadingSection')).toBeVisible();
}

async function installNativeMock(page, options = {}) {
  await page.addInitScript((mockOptions) => {
    const files = new Map();
    const preferences = new Map();
    let indexWriteCount = 0;
    const events = [];
    const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
    window.__nativeMock = {
      files,
      preferences,
      events,
      options: mockOptions,
      getIndexWriteCount: () => indexWriteCount
    };
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'ios',
      Plugins: {
        Filesystem: {
          mkdir: async () => {
            if (mockOptions.failMkdir) throw new Error('native filesystem denied');
          },
          readFile: async ({ path }) => {
            if (!files.has(path)) throw new Error('not found');
            return { data: files.get(path) };
          },
          writeFile: async ({ path, data }) => {
            events.push(`write:${path}`);
            if (path === 'paceflow/books-index.json') {
              indexWriteCount += 1;
              if (mockOptions.delayFirstIndexWrite && indexWriteCount === 1) await delay(40);
            }
            files.set(path, data);
            return {};
          },
          deleteFile: async ({ path }) => {
            if (window.__nativeMock.failDelete) throw new Error('native delete denied');
            if (!files.has(path)) throw new Error('not found');
            files.delete(path);
          },
          rmdir: async ({ path }) => {
            if (window.__nativeMock.failRmdir) throw new Error('native remove denied');
            for (const filePath of Array.from(files.keys())) {
              if (filePath === path || filePath.startsWith(`${path}/`)) files.delete(filePath);
            }
          }
        },
        Preferences: {
          get: async ({ key }) => ({ value: preferences.get(key) ?? null }),
          set: async ({ key, value }) => {
            if (mockOptions.delayPreferenceSet) await delay(mockOptions.delayPreferenceSet);
            events.push(`preference:${key}`);
            preferences.set(key, value);
          },
          remove: async ({ key }) => { preferences.delete(key); },
          clear: async () => { preferences.clear(); }
        },
        Haptics: {
          impact: async () => {},
          selectionStart: async () => {},
          selectionChanged: async () => {},
          selectionEnd: async () => {}
        }
      }
    };
  }, options);
}

async function makeEpub({ sameFileFragments = false } = {}) {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
    <container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
      <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
    </container>`);

  const manifest = sameFileFragments
    ? '<item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>'
    : '<item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/>';
  const spine = sameFileFragments
    ? '<itemref idref="chapter"/>'
    : '<itemref idref="one"/><itemref idref="two"/>';
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
    <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="3.0">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">regression</dc:identifier><dc:title>TOC Regression</dc:title></metadata>
      <manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${manifest}</manifest>
      <spine>${spine}</spine>
    </package>`);

  if (sameFileFragments) {
    zip.file('OEBPS/nav.xhtml', `<!doctype html><html xmlns:epub="http://www.idpf.org/2007/ops"><body>
      <nav epub:type="toc"><ol><li><a href="chapter.xhtml#one">First anchor</a></li><li><a href="chapter.xhtml#two">Second anchor</a></li></ol></nav>
    </body></html>`);
    // Deliberately no heading elements: valid EPUB navigation anchors must still
    // define two distinct chapter positions within this single spine document.
    zip.file('OEBPS/chapter.xhtml', `<!doctype html><html><body>
      <div id="one"><p>Alpha opening words live in the first anchored section.</p></div>
      <div id="two"><p>Beta continuation words live in the second anchored section.</p></div>
    </body></html>`);
  } else {
    zip.file('OEBPS/nav.xhtml', `<!doctype html><html xmlns:epub="http://www.idpf.org/2007/ops"><body>
      <nav epub:type="toc"><ol><li><a href="one.xhtml">Opening</a></li><li><a href="two.xhtml">Arrival</a></li></ol></nav>
    </body></html>`);
    zip.file('OEBPS/one.xhtml', '<!doctype html><html><body><h1>Opening</h1><p>Alpha beta gamma delta.</p></body></html>');
    zip.file('OEBPS/two.xhtml', '<!doctype html><html><body><h1>Arrival</h1><p>Epsilon zeta eta theta.</p></body></html>');
  }

  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' });
}

test.describe('production reader regressions', () => {
  test('article URL import confirms replacement, saves clean text and opens the reader', async ({ page }) => {
    let articleRequests = 0;
    let submittedUrl = '';
    await page.route('**/api/article', async (route) => {
      articleRequests += 1;
      submittedUrl = JSON.parse(route.request().postData() || '{}').url || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'A useful imported article',
          sourceUrl: 'https://news.example/useful-story',
          text: [
            'A useful imported article',
            '',
            'This first paragraph contains the clean article text without menus advertisements or navigation links.',
            '',
            'The second paragraph has enough words to exercise saving, chapter detection, normal reading, and later focus mode.',
            '',
            'The final paragraph confirms that imported web writing remains available in the private local library.'
          ].join('\n'),
          wordCount: 43
        })
      });
    });

    await openReader(page);
    await expect(page.locator('#importArticleBtn')).toHaveText('Import article');
    await page.locator('#textInput').fill('Keep this unfinished draft exactly as it is.');
    await page.locator('#articleUrlInput').fill('news.example/useful-story#comments');
    await page.locator('#importArticleBtn').click();
    await expect(page.locator('#actionDialog')).toBeVisible();
    await page.locator('#actionDialogCancelBtn').click();
    await expect(page.locator('#textInput')).toHaveValue('Keep this unfinished draft exactly as it is.');
    expect(articleRequests).toBe(0);

    await page.locator('#textInput').fill('');
    await page.locator('#importArticleBtn').click();
    await expect(page.locator('#normalReadingSection')).toBeVisible();
    expect(articleRequests).toBe(1);
    expect(submittedUrl).toBe('https://news.example/useful-story');
    await expect(page.locator('#currentBookInfo')).toContainText('A useful imported article');
    await expect(page.locator('#normalTextDisplay')).toContainText('without menus advertisements');

    await page.locator('#backToInputBtn').click();
    await page.locator('#libraryBtn').click();
    await expect(page.locator('.library-item')).toContainText('A useful imported article');
    const storedBook = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      const book = reader.library.find((item) => item.name === 'A useful imported article');
      return { sourceType: book?.sourceType, fileName: book?.fileName };
    });
    expect(storedBook).toEqual({
      sourceType: 'url',
      fileName: 'https://news.example/useful-story'
    });
  });

  test('article endpoint rejects loopback targets before downloading them', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium');
    const response = await request.post('/api/article', {
      // Keep the default HTTP port so this assertion exercises the private
      // address guard rather than the separate non-standard-port guard.
      data: { url: 'http://127.0.0.1/private' }
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'private_address' });
  });

  test('actual WPM is based on active playback time and excludes pauses', async ({ page }) => {
    await openReader(page);
    await loadPlainText(page, Array.from({ length: 80 }, (_, index) => `word${index}`).join(' '));
    await page.evaluate(() => {
      const reader = window.rsvpReader;
      reader.settings.wpm = 100;
      reader.settings.chunkingEnabled = false;
      reader.settings.balancedPairsEnabled = false;
      reader.settings.speedRampUp = false;
      reader.startRSVP();
    });

    await page.locator('#playPauseBtn').click();
    await page.waitForTimeout(260);
    await page.locator('#playPauseBtn').click();
    const firstActiveMs = await page.evaluate(() => window.rsvpReader.activePlaybackMs);

    await page.waitForTimeout(420);
    const afterPauseMs = await page.evaluate(() => window.rsvpReader.getActivePlaybackMinutes() * 60000);
    expect(afterPauseMs - firstActiveMs).toBeLessThan(45);

    await page.locator('#playPauseBtn').click();
    await page.waitForTimeout(250);
    await page.locator('#playPauseBtn').click();
    const afterResumeMs = await page.evaluate(() => window.rsvpReader.activePlaybackMs);
    expect(firstActiveMs).toBeGreaterThan(180);
    expect(afterResumeMs - firstActiveMs).toBeGreaterThan(170);

    await page.evaluate(() => {
      const reader = window.rsvpReader;
      reader.settings.wpm = 350;
      reader.activePlaybackMs = 6000;
      reader.activeSegmentStartedAt = null;
      reader.isPlaying = false;
      reader.wordsProcessedInRun = 60;
      reader.updateSpeedControls();
    });
    await expect(page.locator('#rsvpSpeedText')).toHaveText('350 target · 600 actual WPM');
  });

  test('speed feedback restarts on every press and returns to rest after two seconds', async ({ page }) => {
    await openReader(page);
    await loadPlainText(page, 'one two three four five six seven eight nine ten');
    await page.locator('#startRSVPBtn').click();

    const speedUp = page.locator('#nextWordBtn');
    await speedUp.click();
    await expect(speedUp).toHaveClass(/is-pressed/);
    const animation = await speedUp.evaluate((button) => ({
      name: getComputedStyle(button).animationName,
      duration: getComputedStyle(button).animationDuration
    }));
    expect(animation).toEqual({ name: 'speed-feedback', duration: '2s' });

    await page.waitForTimeout(1050);
    await expect(speedUp).toHaveClass(/is-pressed/);
    await speedUp.click();
    await page.waitForTimeout(1050);
    await expect(speedUp).toHaveClass(/is-pressed/);
    await page.waitForTimeout(1050);
    await expect(speedUp).not.toHaveClass(/is-pressed/);

    const colours = await speedUp.evaluate((button) => {
      const probe = document.createElement('span');
      probe.style.cssText = 'position:fixed;background:var(--surface-2)';
      document.body.appendChild(probe);
      const result = {
        actual: getComputedStyle(button).backgroundColor,
        resting: getComputedStyle(probe).backgroundColor
      };
      probe.remove();
      return result;
    });
    expect(colours.actual).toBe(colours.resting);
  });

  test('a cold reload reopens a saved book at its persisted reading position', async ({ page }) => {
    await openReader(page);
    const text = Array.from({ length: 100 }, (_, index) => `token${index}`).join(' ');
    await page.locator('#textInput').fill(text);
    await page.locator('#bookNameInput').fill('Cold resume');
    const beforeReload = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      const book = await reader.saveCurrentTextAsBook({ silent: true });
      await reader.startNormalReading();
      reader.setCurrentWordIndex(40, { scroll: false });
      await reader.persistReadingPosition();
      reader.saveResumeSnapshot();
      return { bookId: book.id, index: reader.currentIndex };
    });
    expect(beforeReload.index).toBe(40);

    await page.reload();
    await page.waitForFunction(() => Boolean(window.rsvpReader));
    await page.evaluate(async () => window.rsvpReader.ready);
    await expect(page.locator('#normalReadingSection')).toBeVisible();
    const restored = await page.evaluate(() => {
      const reader = window.rsvpReader;
      return {
        bookId: reader.currentBookId,
        index: reader.currentIndex,
        mode: reader.mode,
        highlighted: document.querySelector('.normal-text .current-word')?.dataset.index
      };
    });
    expect(restored).toEqual({ bookId: beforeReload.bookId, index: 40, mode: 'normal', highlighted: '40' });
  });

  test('the ordinary import-and-read flow resumes without requiring a separate Save to library click', async ({ page }) => {
    await openReader(page);
    const epub = await makeEpub();
    await page.locator('#fileInput').setInputFiles({ name: 'ordinary-import.epub', mimeType: 'application/epub+zip', buffer: epub });
    await expect(page.locator('#textInput')).toHaveValue(/Opening[\s\S]*Arrival/);
    await page.evaluate(async () => {
      const reader = window.rsvpReader;
      await reader.startNormalReading();
      reader.setCurrentWordIndex(5, { scroll: false });
      await reader.persistReadingPosition();
      reader.saveResumeSnapshot();
    });

    await page.reload();
    await page.waitForFunction(() => Boolean(window.rsvpReader));
    await page.evaluate(async () => window.rsvpReader.ready);
    await expect(page.locator('#normalReadingSection')).toBeVisible();
    expect(await page.evaluate(() => window.rsvpReader.currentIndex)).toBe(5);
  });

  test('long focus tokens shrink to fit the mobile viewport and short tokens reset the font', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openReader(page);
    await loadPlainText(page, 'Donaudampfschifffahrtselektrizitätenhauptbetriebswerkbauunterbeamtengesellschaft short');
    await page.evaluate(() => {
      const reader = window.rsvpReader;
      reader.settings.fontSize = 120;
      reader.settings.orpAlignment = true;
      reader.settings.chunkingEnabled = false;
      reader.settings.balancedPairsEnabled = false;
      reader.startRSVP();
    });
    // The UI intentionally animates font-size changes for 80 ms.
    await page.waitForTimeout(160);
    const longToken = await page.evaluate(() => {
      const frame = document.querySelector('.rsvp-word-frame');
      const display = document.querySelector('#rsvpWordDisplay');
      const displayRect = display.getBoundingClientRect();
      const contentLeft = displayRect.left + parseFloat(getComputedStyle(display).paddingLeft);
      const contentRight = displayRect.right - parseFloat(getComputedStyle(display).paddingRight);
      const glyphRects = Array.from(frame.children).map((element) => element.getBoundingClientRect());
      return {
        preferred: Number(frame.dataset.preferredFontSize),
        fitted: Number(frame.dataset.fittedFontSize),
        left: Math.min(...glyphRects.map((rect) => rect.left)),
        right: Math.max(...glyphRects.map((rect) => rect.right)),
        contentLeft,
        contentRight
      };
    });
    await page.evaluate(() => {
      const reader = window.rsvpReader;
      reader.currentIndex = 1;
      reader.displayCurrentWord();
    });
    await page.waitForTimeout(160);
    const shortFitted = await page.evaluate(() => {
      const shortFrame = document.querySelector('.rsvp-word-frame');
      return Number(shortFrame.dataset.fittedFontSize);
    });
    expect(longToken.fitted).toBeLessThan(longToken.preferred);
    expect(longToken.left, JSON.stringify(longToken)).toBeGreaterThanOrEqual(longToken.contentLeft - 1);
    expect(longToken.right, JSON.stringify(longToken)).toBeLessThanOrEqual(longToken.contentRight + 1);
    expect(shortFitted).toBeGreaterThanOrEqual(longToken.preferred * 0.75);
    expect(shortFitted).toBeGreaterThan(longToken.fitted * 2);
  });

  test('an unbroken long token wraps in normal reading mode without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openReader(page);
    const longToken = `https://example.com/${'unbroken-segment'.repeat(20)}`;
    await loadPlainText(page, `before ${longToken} after`);
    const geometry = await page.evaluate(() => {
      const reader = document.querySelector('#normalTextDisplay');
      const token = reader.querySelector('span[data-index="1"]');
      const readerRect = reader.getBoundingClientRect();
      const style = getComputedStyle(reader);
      const contentLeft = readerRect.left + parseFloat(style.paddingLeft);
      const contentRight = readerRect.right - parseFloat(style.paddingRight);
      const lineRects = Array.from(token.getClientRects());
      return {
        readerClientWidth: reader.clientWidth,
        readerScrollWidth: reader.scrollWidth,
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        contentLeft,
        contentRight,
        lineCount: lineRects.length,
        minLeft: Math.min(...lineRects.map((rect) => rect.left)),
        maxRight: Math.max(...lineRects.map((rect) => rect.right))
      };
    });
    expect(geometry.lineCount).toBeGreaterThan(1);
    expect(geometry.readerScrollWidth).toBeLessThanOrEqual(geometry.readerClientWidth + 1);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth + 1);
    expect(geometry.minLeft).toBeGreaterThanOrEqual(geometry.contentLeft - 1);
    expect(geometry.maxRight).toBeLessThanOrEqual(geometry.contentRight + 1);
  });

  test('paused focus mode shows a 48/12 context split and de-emphasises the focus word', async ({ page }) => {
    await openReader(page);
    await loadPlainText(page, Array.from({ length: 100 }, (_, index) => `context${index}`).join(' '));
    const context = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      reader.currentIndex = 60;
      reader.startRSVP();
      reader.currentIndex = 60;
      reader.displayCurrentWord();
      const spans = Array.from(reader.rsvpPauseContext.querySelectorAll('span'));
      const currentPosition = spans.findIndex((span) => span.classList.contains('pause-context-current'));
      const isWord = (span) => !span.classList.contains('pause-context-edge');
      const current = spans[currentPosition];
      const regular = spans.find((span) => isWord(span) && span !== current);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const contextRect = reader.rsvpPauseContext.getBoundingClientRect();
      const currentRect = current.getBoundingClientRect();
      return {
        before: spans.slice(0, currentPosition).filter(isWord).length,
        after: spans.slice(currentPosition + 1).filter(isWord).length,
        totalWords: spans.filter(isWord).length,
        focusFontPx: parseFloat(getComputedStyle(current).fontSize),
        regularFontPx: parseFloat(getComputedStyle(regular).fontSize),
        pausedScale: getComputedStyle(reader.rsvpWordDisplay).transform,
        spatialPosition: ((currentRect.top + currentRect.height / 2) - contextRect.top) / contextRect.height
      };
    });
    expect(context.before).toBe(48);
    expect(context.after).toBe(12);
    expect(context.totalWords).toBe(61);
    expect(context.focusFontPx).toBeLessThan(context.regularFontPx);
    expect(context.pausedScale).not.toBe('none');
    expect(context.spatialPosition).toBeGreaterThan(0.66);
    expect(context.spatialPosition).toBeLessThan(0.91);
  });

  test('focus controls remain reachable on compact portrait and landscape screens', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openReader(page);
    await loadPlainText(page, Array.from({ length: 100 }, (_, index) => `compact${index}`).join(' '));
    await page.evaluate(() => {
      const reader = window.rsvpReader;
      reader.currentIndex = 60;
      reader.startRSVP();
      reader.displayCurrentWord();
    });
    for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => window.rsvpReader.displayCurrentWord());
      await page.waitForTimeout(80);
      const geometry = await page.evaluate(() => {
        const selectors = ['.rsvp-word-wrapper', '#rsvpPauseContext', '#playPauseBtn', '#rsvpProgressText', '#rsvpBottomTapZone'];
        return selectors.map((selector) => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return { selector, top: rect.top, bottom: rect.bottom, height: rect.height };
        });
      });
      for (const item of geometry) {
        expect(item.height, `${item.selector} at ${viewport.width}x${viewport.height}`).toBeGreaterThan(0);
        expect(item.top, `${item.selector} at ${viewport.width}x${viewport.height}`).toBeGreaterThanOrEqual(-1);
        expect(item.bottom, `${item.selector} at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(viewport.height + 1);
      }
    }
    await page.evaluate(() => window.rsvpReader.stopRSVP());
  });

  test('opening Settings, Contents or Bookmarks pauses active focus playback', async ({ page }) => {
    await openReader(page);
    await loadPlainText(page, Array.from({ length: 80 }, (_, index) => `overlay${index}`).join(' '));
    const openAndCheck = async (method, closeMethod) => {
      await page.evaluate(() => {
        const reader = window.rsvpReader;
        if (reader.mode !== 'rsvp') reader.startRSVP();
        reader.play();
      });
      await page.waitForTimeout(90);
      await page.evaluate((methodName) => window.rsvpReader[methodName](), method);
      const stopped = await page.evaluate(() => ({ playing: window.rsvpReader.isPlaying, index: window.rsvpReader.currentIndex }));
      await page.waitForTimeout(350);
      expect(await page.evaluate(() => window.rsvpReader.currentIndex)).toBe(stopped.index);
      expect(stopped.playing).toBe(false);
      await page.evaluate((methodName) => window.rsvpReader[methodName](), closeMethod);
    };
    await openAndCheck('openSettings', 'closeSettings');
    await openAndCheck('openToc', 'closeToc');
    await openAndCheck('openBookmarksForCurrentBook', 'closeBookmarks');
  });

  test('mobile search remains visible while the inner reader scrolls to a distant result', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openReader(page);
    await loadPlainText(page, Array.from({ length: 1200 }, (_, index) => `search${index}`).join(' '));
    const outerScrollBefore = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.rsvpReader.setCurrentWordIndex(900));
    await page.waitForTimeout(750);
    const state = await page.evaluate(() => {
      const rect = document.querySelector('.search-container').getBoundingClientRect();
      return {
        searchTop: rect.top,
        searchBottom: rect.bottom,
        viewportHeight: window.innerHeight,
        outerScroll: window.scrollY,
        readerScroll: document.querySelector('#normalTextDisplay').scrollTop
      };
    });
    expect(state.searchTop).toBeGreaterThanOrEqual(0);
    expect(state.searchBottom).toBeLessThanOrEqual(state.viewportHeight);
    expect(Math.abs(state.outerScroll - outerScrollBefore)).toBeLessThanOrEqual(1);
    expect(state.readerScroll).toBeGreaterThan(0);
  });

  test('strict and flexible two-word modes enforce their documented thresholds', async ({ page }) => {
    await openReader(page);
    const frames = await page.evaluate(() => {
      const reader = window.rsvpReader;
      const frameFor = (words, strict, flexible, wpm = 350) => {
        reader.words = words;
        reader.settings.wpm = wpm;
        reader.settings.chunkingEnabled = strict;
        reader.settings.balancedPairsEnabled = flexible;
        const frame = reader.getFrameAt(0);
        return { text: frame.text, advanceCount: frame.advanceCount, lexicalWordCount: frame.lexicalWordCount };
      };
      return {
        strictRejectsSixPlusFour: frameFor(['planet', 'mars'], true, false),
        strictAcceptsFivePlusFive: frameFor(['earth', 'venus'], true, false),
        flexibleAcceptsSixPlusFour: frameFor(['planet', 'mars'], false, true),
        flexibleRejectsSixPlusFive: frameFor(['planet', 'venus'], false, true),
        punctuationStopsPair: frameFor(['hello,', 'world'], true, true),
        lowWpmStopsPair: frameFor(['earth', 'venus'], true, true, 340)
      };
    });
    expect(frames.strictRejectsSixPlusFour.advanceCount).toBe(1);
    expect(frames.strictAcceptsFivePlusFive).toMatchObject({ text: 'earth venus', advanceCount: 2, lexicalWordCount: 2 });
    expect(frames.flexibleAcceptsSixPlusFour).toMatchObject({ text: 'planet mars', advanceCount: 2, lexicalWordCount: 2 });
    expect(frames.flexibleRejectsSixPlusFive.advanceCount).toBe(1);
    expect(frames.punctuationStopsPair.advanceCount).toBe(1);
    expect(frames.lowWpmStopsPair.advanceCount).toBe(1);
  });

  test('punctuation-only separators do not inflate word counts or actual WPM frames', async ({ page }) => {
    await openReader(page);
    const result = await page.evaluate(() => {
      const reader = window.rsvpReader;
      const tokens = reader.parseText('— Hello world\n\n* * *\n\n— Привет мир');
      reader.words = ['—', 'word'];
      return {
        tokens,
        count: reader.countReadableWords(tokens),
        punctuationFrame: reader.getFrameAt(0),
        wordFrame: reader.getFrameAt(1)
      };
    });
    expect(result.tokens).toEqual(['— Hello', 'world', '', '— Привет', 'мир']);
    expect(result.count).toBe(4);
    expect(result.punctuationFrame.lexicalWordCount).toBe(0);
    expect(result.punctuationFrame.isPauseToken).toBe(true);
    expect(result.wordFrame.lexicalWordCount).toBe(1);
  });

  test('EPUB headings populate the TOC and navigating selects the chapter start', async ({ page }) => {
    await openReader(page);
    const epub = await makeEpub();
    await page.locator('#fileInput').setInputFiles({ name: 'chapters.epub', mimeType: 'application/epub+zip', buffer: epub });
    await expect(page.locator('#textInput')).toHaveValue(/Opening[\s\S]*Arrival/);
    await expect.poll(() => page.evaluate(() => window.rsvpReader.currentChapters.length)).toBe(2);
    await page.evaluate(async () => window.rsvpReader.startNormalReading());
    await page.locator('#tocBtn').click();
    const tocButtons = page.locator('#tocList .toc-button');
    await expect(tocButtons).toHaveCount(2);
    await expect(tocButtons.nth(0)).toContainText('Opening');
    await expect(tocButtons.nth(1)).toContainText('Arrival');
    const expectedIndex = await page.evaluate(() => window.rsvpReader.currentChapters[1].wordIndex);
    await tocButtons.nth(1).click();
    await expect(page.locator('#tocModal')).not.toHaveClass(/active/);
    const selected = await page.evaluate(() => ({
      index: window.rsvpReader.currentIndex,
      word: window.rsvpReader.words[window.rsvpReader.currentIndex]
    }));
    expect(selected).toEqual({ index: expectedIndex, word: 'Arrival' });
  });

  test('EPUB navigation fragments in one XHTML produce distinct TOC entries', async ({ page }) => {
    await openReader(page);
    const epub = await makeEpub({ sameFileFragments: true });
    await page.locator('#fileInput').setInputFiles({ name: 'fragment-toc.epub', mimeType: 'application/epub+zip', buffer: epub });
    await expect(page.locator('#textInput')).toHaveValue(/Alpha[\s\S]*Beta/);
    await expect.poll(() => page.evaluate(() => window.rsvpReader.currentChapters.map(({ title }) => title))).toEqual([
      'First anchor',
      'Second anchor'
    ]);
    const chapterIndexes = await page.evaluate(() => window.rsvpReader.currentChapters.map(({ wordIndex }) => wordIndex));
    expect(chapterIndexes[1]).toBeGreaterThan(chapterIndexes[0]);
  });

  test('zipped FB2 imports preserve section titles for the table of contents', async ({ page }) => {
    await openReader(page);
    const zip = new JSZip();
    zip.file('book.fb2', `<?xml version="1.0" encoding="utf-8"?>
      <FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0"><body>
        <section><title><p>First Part</p></title><p>Alpha beta gamma.</p></section>
        <section><title><p>Second Part</p></title><p>Delta epsilon zeta.</p></section>
      </body></FictionBook>`);
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    await page.locator('#fileInput').setInputFiles({ name: 'sections.fb2.zip', mimeType: 'application/zip', buffer });
    await expect.poll(() => page.evaluate(() => window.rsvpReader.currentChapters.map(({ title }) => title))).toEqual([
      'First Part',
      'Second Part'
    ]);
  });

  test('DOCX heading styles populate the table of contents', async ({ page }) => {
    await openReader(page);
    const zip = new JSZip();
    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
        <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>First Heading</w:t></w:r></w:p>
        <w:p><w:r><w:t>Alpha beta gamma delta.</w:t></w:r></w:p>
        <w:p><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:r><w:t>Second Heading</w:t></w:r></w:p>
        <w:p><w:r><w:t>Epsilon zeta eta theta.</w:t></w:r></w:p>
      </w:body></w:document>`);
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    await page.locator('#fileInput').setInputFiles({
      name: 'structured.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer
    });

    await expect.poll(() => page.evaluate(() => window.rsvpReader.currentChapters.map(({ title }) => title))).toEqual([
      'First Heading',
      'Second Heading'
    ]);
    const levels = await page.evaluate(() => window.rsvpReader.currentChapters.map(({ level }) => level));
    expect(levels).toEqual([1, 2]);
  });

  test('aggressively compressed archive entries are rejected before extraction', async ({ page }) => {
    await openReader(page);
    const zip = new JSZip();
    zip.file('unsafe.txt', 'A'.repeat(1_200_000));
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
    await page.locator('#fileInput').setInputFiles({ name: 'unsafe.zip', mimeType: 'application/zip', buffer });
    await expect(page.locator('#toastContainer')).toContainText(/safe size|too large|compressed too aggressively/i);
    expect(await page.evaluate(async () => (await window.rsvpReader.getAllBooks()).length)).toBe(0);
  });

  test('empty and binary-only ZIP files fail safely without partial library records', async ({ page }) => {
    await openReader(page);
    const emptyZip = await new JSZip().generateAsync({ type: 'nodebuffer' });
    const binaryZip = new JSZip();
    binaryZip.file('cover.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]));
    const binaryBuffer = await binaryZip.generateAsync({ type: 'nodebuffer' });

    await page.locator('#fileInput').setInputFiles({
      name: 'empty.zip',
      mimeType: 'application/zip',
      buffer: emptyZip
    });
    await expect(page.locator('#toastContainer')).toContainText(/does not contain a supported book|could not load/i);
    await page.locator('#fileInput').setInputFiles({
      name: 'binary.zip',
      mimeType: 'application/zip',
      buffer: binaryBuffer
    });
    await expect(page.locator('#toastContainer')).toContainText(/does not contain a supported book|could not load/i);
    expect(await page.evaluate(async () => (await window.rsvpReader.getAllBooks()).length)).toBe(0);
  });

  test('concurrent file imports keep each title paired with its own text', async ({ page }) => {
    await openReader(page);
    const books = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      let releaseSlow;
      let signalSlow;
      const slowGate = new Promise((resolve) => { releaseSlow = resolve; });
      const slowStarted = new Promise((resolve) => { signalSlow = resolve; });
      reader.extractBookFromFile = async (file) => {
        if (file.name === 'Slow Alpha.txt') {
          signalSlow();
          await slowGate;
          return { text: 'alpha text belongs only to alpha', chapters: [] };
        }
        return { text: 'beta text belongs only to beta', chapters: [] };
      };
      const makeEvent = (name) => ({ target: { files: [{ name }], value: name } });
      const slowImport = reader.handleFileUpload(makeEvent('Slow Alpha.txt'));
      await slowStarted;
      const fastImport = reader.handleFileUpload(makeEvent('Fast Beta.txt'));
      await fastImport;
      releaseSlow();
      await slowImport;
      return (await reader.getAllBooks())
        .map(({ name, text }) => ({ name, text }))
        .sort((left, right) => left.name.localeCompare(right.name));
    });
    expect(books).toEqual([
      { name: 'Fast Beta', text: 'beta text belongs only to beta' },
      { name: 'Slow Alpha', text: 'alpha text belongs only to alpha' }
    ]);
  });

  test('a delayed position save cannot write the next book index into the previous book', async ({ page }) => {
    await openReader(page);
    const result = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      const makeBook = (id, name, count) => reader.normalizeBook({
        id,
        name,
        text: Array.from({ length: count }, (_, index) => `${name}${index}`).join(' '),
        currentIndex: 0,
        dateAdded: new Date().toISOString(),
        lastRead: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await reader.putBook(makeBook('race-a', 'alpha', 20));
      await reader.putBook(makeBook('race-b', 'beta', 20));

      reader.currentBookId = 'race-a';
      reader.words = reader.parseText((await reader.getBook('race-a')).text);
      reader.currentIndex = 2;

      const originalGetBook = reader.getBook.bind(reader);
      const originalMutateBook = reader.mutateBook.bind(reader);
      let releaseRead;
      let signalRead;
      const readStarted = new Promise((resolve) => { signalRead = resolve; });
      const readGate = new Promise((resolve) => { releaseRead = resolve; });
      reader.mutateBook = async (bookId, ...args) => {
        if (bookId === 'race-a') {
          signalRead();
          await readGate;
        }
        return originalMutateBook(bookId, ...args);
      };

      const delayedSave = reader.persistReadingPosition();
      await readStarted;
      reader.currentBookId = 'race-b';
      reader.words = reader.parseText((await originalGetBook('race-b')).text);
      reader.currentIndex = 13;
      releaseRead();
      await delayedSave;
      reader.mutateBook = originalMutateBook;

      return {
        previous: (await originalGetBook('race-a')).currentIndex,
        current: reader.currentIndex,
        currentBookId: reader.currentBookId
      };
    });

    expect(result).toEqual({ previous: 2, current: 13, currentBookId: 'race-b' });
  });

  test('a delayed position save cannot resurrect a book deleted in the meantime', async ({ page }) => {
    await openReader(page);
    const result = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      const victim = reader.normalizeBook({
        id: 'single-delete-race',
        name: 'Victim',
        text: 'one two three four five',
        currentIndex: 2,
        dateAdded: new Date().toISOString(),
        lastRead: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await reader.putBook(victim);
      reader.currentBookId = victim.id;
      reader.currentIndex = 2;
      reader.words = reader.parseText(victim.text);
      const originalGetBook = reader.getBook.bind(reader);
      const originalMutateBook = reader.mutateBook.bind(reader);
      let releaseRead;
      let signalRead;
      const readStarted = new Promise((resolve) => { signalRead = resolve; });
      const readGate = new Promise((resolve) => { releaseRead = resolve; });
      reader.mutateBook = async (bookId, ...args) => {
        if (bookId === victim.id) {
          signalRead();
          await readGate;
        }
        return originalMutateBook(bookId, ...args);
      };
      const delayedSave = reader.persistReadingPosition();
      await readStarted;
      await reader.deleteBookFromStorage(victim.id);
      releaseRead();
      await delayedSave;
      return {
        book: await originalGetBook(victim.id),
        tombstoned: Boolean(reader.deletedBooks[victim.id])
      };
    });
    expect(result).toEqual({ book: null, tombstoned: true });
  });

  test('native filesystem failure cannot brick IndexedDB bootstrap', async ({ page }) => {
    await installNativeMock(page, { failMkdir: true });
    await page.goto(`/?native-denied=${Date.now()}`);
    await page.waitForFunction(() => Boolean(window.rsvpReader));
    const state = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      await reader.ready;
      return { storageMode: reader.storageMode, nativeStorageAvailable: reader.nativeStorageAvailable };
    });
    expect(state).toEqual({ storageMode: 'indexeddb', nativeStorageAvailable: false });
    await page.locator('#textInput').fill('the reader remains usable');
    await page.evaluate(async () => window.rsvpReader.startNormalReading());
    await expect(page.locator('#normalReadingSection')).toBeVisible();
  });

  test('concurrent native book writes serialize the on-disk index', async ({ page }) => {
    await installNativeMock(page, { delayFirstIndexWrite: true });
    await page.goto(`/?native-index=${Date.now()}`);
    await page.waitForFunction(() => Boolean(window.rsvpReader));
    const index = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      await reader.ready;
      const makeBook = (id, text) => reader.normalizeBook({
        id,
        name: id,
        text,
        dateAdded: new Date().toISOString(),
        lastRead: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await Promise.all([
        reader.putBook(makeBook('native-a', 'alpha book text')),
        reader.putBook(makeBook('native-b', 'beta book text'))
      ]);
      return JSON.parse(window.__nativeMock.files.get('paceflow/books-index.json'));
    });
    expect(Object.keys(index).sort()).toEqual(['native-a', 'native-b']);
  });

  test('a nativeOnlyText placeholder is hydrated from the native mirror after restart', async ({ page }) => {
    await installNativeMock(page);
    await page.goto(`/?native-hydration=${Date.now()}`);
    await page.waitForFunction(() => Boolean(window.rsvpReader));
    const result = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      await reader.ready;
      const fullText = 'the complete oversized native book survives a browser quota fallback';
      const book = reader.normalizeBook({
        id: 'native-only-restart',
        name: 'Native only',
        text: fullText,
        currentIndex: 3,
        dateAdded: '2026-01-01T00:00:00.000Z',
        lastRead: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z'
      });
      await reader.putBook(book);
      await reader.requestToPromise(reader.getStore('books', 'readwrite').put({
        ...book,
        text: '',
        nativeOnlyText: true
      }));

      const restarted = new RSVPReader();
      await restarted.ready;
      const hydrated = await restarted.getBook(book.id);
      return {
        text: hydrated?.text,
        nativeOnlyText: hydrated?.nativeOnlyText,
        currentIndex: hydrated?.currentIndex,
        signatureMatches: hydrated?.textSignature === restarted.bookTextSignature(fullText)
      };
    });
    expect(result).toEqual({
      text: 'the complete oversized native book survives a browser quota fallback',
      nativeOnlyText: false,
      currentIndex: 3,
      signatureMatches: true
    });
  });

  test('native batch persistence commits one index generation for the whole batch', async ({ page }) => {
    await installNativeMock(page);
    await page.goto(`/?native-batch=${Date.now()}`);
    await page.waitForFunction(() => Boolean(window.rsvpReader));
    const result = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      await reader.ready;
      const timestamp = new Date().toISOString();
      const books = ['one', 'two', 'three'].map((id) => reader.normalizeBook({
        id: `batch-${id}`,
        name: id,
        text: `${id} has readable content`,
        dateAdded: timestamp,
        lastRead: timestamp,
        updatedAt: timestamp
      }));
      const stored = await reader.persistNativeBooksBatch(books);
      const index = JSON.parse(window.__nativeMock.files.get('paceflow/books-index.json'));
      return {
        stored,
        indexWrites: window.__nativeMock.getIndexWriteCount(),
        ids: Object.keys(index).sort()
      };
    });
    expect(result).toEqual({
      stored: true,
      indexWrites: 1,
      ids: ['batch-one', 'batch-three', 'batch-two']
    });
  });

  test('native draft writes the versioned file before committing its Preferences pointer', async ({ page }) => {
    await installNativeMock(page, { delayPreferenceSet: 50 });
    await page.goto(`/?native-draft-pointer=${Date.now()}`);
    await page.waitForFunction(() => Boolean(window.rsvpReader));
    const result = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      await reader.ready;
      window.__nativeMock.events.length = 0;
      const draft = {
        text: 'a force quit safe native draft',
        bookName: 'Draft',
        currentBookId: null,
        currentIndex: 2,
        chapters: [],
        lastMode: 'input',
        revision: 4,
        updatedAt: new Date().toISOString()
      };
      const pending = reader.persistNativeDraft(draft);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const beforePointer = {
        files: Array.from(window.__nativeMock.files.keys()).filter((path) => path.startsWith('paceflow/draft-')),
        pointer: window.__nativeMock.preferences.get('paceflow_draft_meta') || null,
        events: [...window.__nativeMock.events]
      };
      await pending;
      const pointer = JSON.parse(window.__nativeMock.preferences.get('paceflow_draft_meta'));
      reader.currentBookId = 'now-saved-book';
      reader.currentTextSignature = reader.bookTextSignature(draft.text);
      reader.setTextInputValue(draft.text);
      await reader.saveDraft({ skipSync: true });
      return {
        beforePointer,
        committedFile: pointer.fileName,
        committedText: draft.text,
        pointerClearedAfterSave: !window.__nativeMock.preferences.has('paceflow_draft_meta'),
        staleFileClearedAfterSave: !window.__nativeMock.files.has(`paceflow/${pointer.fileName}`)
      };
    });
    expect(result.beforePointer.files).toHaveLength(1);
    expect(result.beforePointer.pointer).toBeNull();
    expect(result.beforePointer.events[0]).toMatch(/^write:paceflow\/draft-/);
    expect(result.committedText).toBe('a force quit safe native draft');
    expect(result.beforePointer.files[0]).toBe(`paceflow/${result.committedFile}`);
    expect(result.pointerClearedAfterSave).toBe(true);
    expect(result.staleFileClearedAfterSave).toBe(true);
  });

  test('draft revision and content signature beat a skewed wall clock', async ({ page }) => {
    await installNativeMock(page);
    await page.goto(`/?draft-newest=${Date.now()}`);
    await page.waitForFunction(() => Boolean(window.rsvpReader));
    const result = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      await reader.ready;
      const nativeText = 'new revision from the native draft';
      const staleText = 'old revision with a future timestamp';
      reader.nativeDraftSnapshot = {
        text: nativeText,
        bookName: 'New',
        currentBookId: null,
        currentIndex: 3,
        chapters: [],
        lastMode: 'input',
        revision: 9,
        textSignature: reader.bookTextSignature(nativeText),
        updatedAt: '2025-01-01T00:00:00.000Z'
      };
      const stale = {
        text: staleText,
        bookName: 'Stale',
        currentBookId: null,
        currentIndex: 1,
        chapters: [],
        lastMode: 'input',
        revision: 8,
        textSignature: reader.bookTextSignature(staleText),
        updatedAt: '2099-01-01T00:00:00.000Z'
      };
      await reader.setKV('draft', stale);
      localStorage.setItem('paceflow_draft_envelope', JSON.stringify(stale));
      reader.setTextInputValue('');
      reader.hasUnsavedTextInput = false;
      await reader.loadDraft();
      return {
        text: reader.textInput.value,
        index: reader.currentIndex,
        revision: reader.draftRevision
      };
    });
    expect(result).toEqual({
      text: 'new revision from the native draft',
      index: 3,
      revision: 9
    });
  });

  test('native mirror filenames remain distinct for IDs that sanitize alike', async ({ page }) => {
    await installNativeMock(page);
    await page.goto(`/?native-filenames=${Date.now()}`);
    await page.waitForFunction(() => Boolean(window.rsvpReader));
    const result = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      await reader.ready;
      const makeBook = (id, text) => reader.normalizeBook({
        id,
        name: id,
        text,
        dateAdded: new Date().toISOString(),
        lastRead: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await reader.putBook(makeBook('a/b', 'slash content'));
      await reader.putBook(makeBook('a?b', 'question content'));
      const index = JSON.parse(window.__nativeMock.files.get('paceflow/books-index.json'));
      return {
        names: [index['a/b'].fileName, index['a?b'].fileName],
        texts: [
          window.__nativeMock.files.get(`paceflow/books/${index['a/b'].fileName}.txt`),
          window.__nativeMock.files.get(`paceflow/books/${index['a?b'].fileName}.txt`)
        ]
      };
    });
    expect(new Set(result.names).size).toBe(2);
    expect(result.texts).toEqual(['slash content', 'question content']);
  });

  test('a failed native cleanup leaves a durable tombstone and cannot resurrect the book', async ({ page }) => {
    await installNativeMock(page);
    await page.goto(`/?native-delete=${Date.now()}`);
    await page.waitForFunction(() => Boolean(window.rsvpReader));
    const state = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      await reader.ready;
      const book = reader.normalizeBook({
        id: 'native-delete-book',
        name: 'Keep on failure',
        text: 'private text remains consistently present',
        dateAdded: new Date().toISOString(),
        lastRead: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await reader.putBook(book);
      window.__nativeMock.failDelete = true;
      let failed = false;
      try {
        await reader.deleteBookFromStorage(book.id);
      } catch (error) {
        failed = true;
      }
      window.__nativeMock.failDelete = false;
      const restarted = new RSVPReader();
      await restarted.ready;
      const nativeIndex = JSON.parse(window.__nativeMock.files.get('paceflow/books-index.json') || '{}');
      return {
        failed,
        bookStillPresent: Boolean(await restarted.getBook(book.id)),
        tombstoned: Boolean(restarted.deletedBooks[book.id]),
        nativeCleaned: !nativeIndex[book.id]
      };
    });
    expect(state).toEqual({
      failed: false,
      bookStillPresent: false,
      tombstoned: true,
      nativeCleaned: true
    });
  });

  test('new pasted text starts at the beginning even before draft debounce completes', async ({ page }) => {
    await openReader(page);
    const oldText = Array.from({ length: 180 }, (_, index) => `old${index}`).join(' ');
    await loadPlainText(page, oldText, 'Old draft');
    await page.evaluate(async () => {
      const reader = window.rsvpReader;
      reader.currentBookId = null;
      reader.currentIndex = 110;
      await reader.saveDraft();
      reader.backToInput();
    });
    await page.locator('#textInput').fill(Array.from({ length: 40 }, (_, index) => `new${index}`).join(' '));
    await page.evaluate(async () => window.rsvpReader.startNormalReading());
    expect(await page.evaluate(() => window.rsvpReader.currentIndex)).toBe(0);
    await expect(page.locator('#normalTextDisplay .current-word')).toContainText('new0');
  });

  test('Delete all local data invalidates a delayed save instead of resurrecting private text', async ({ page }) => {
    await openReader(page);
    const result = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      const secretBook = reader.normalizeBook({
        id: 'delete-race',
        name: 'Private',
        text: 'secret words that must stay deleted',
        currentIndex: 2,
        dateAdded: new Date().toISOString(),
        lastRead: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await reader.putBook(secretBook);
      reader.currentBookId = secretBook.id;
      reader.currentBookName = secretBook.name;
      reader.currentIndex = 2;
      reader.words = reader.parseText(secretBook.text);
      reader.setTextInputValue(secretBook.text);
      reader.bookNameInput.value = secretBook.name;
      await reader.saveDraft();

      const originalGetBook = reader.getBook.bind(reader);
      const originalMutateBook = reader.mutateBook.bind(reader);
      let releaseRead;
      let signalRead;
      const readStarted = new Promise((resolve) => { signalRead = resolve; });
      const readGate = new Promise((resolve) => { releaseRead = resolve; });
      reader.mutateBook = async (bookId, ...args) => {
        if (bookId === secretBook.id) {
          signalRead();
          await readGate;
        }
        return originalMutateBook(bookId, ...args);
      };

      const originalSetTimeout = window.setTimeout;
      window.setTimeout = (callback, delay, ...args) => delay === 450 ? 0 : originalSetTimeout(callback, delay, ...args);
      const delayedSave = reader.persistReadingPosition();
      await readStarted;
      reader.showActionDialog = async () => true;
      await reader.deleteAllLocalData();
      releaseRead();
      await delayedSave;
      await new Promise((resolve) => originalSetTimeout(resolve, 50));

      const books = await reader.getAllBooks();
      const draft = await reader.getKV('draft');
      return {
        books: books.length,
        draft,
        localText: localStorage.getItem('rsvp_text'),
        resume: localStorage.getItem('paceflow_resume')
      };
    });

    expect(result).toEqual({ books: 0, draft: null, localText: null, resume: null });
  });

  test('a failed native Delete All leaves the primary library intact', async ({ page }) => {
    await installNativeMock(page);
    await page.goto(`/?native-delete-all=${Date.now()}`);
    await page.waitForFunction(() => Boolean(window.rsvpReader));
    const result = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      await reader.ready;
      const book = reader.normalizeBook({
        id: 'native-delete-all-book',
        name: 'Keep the library',
        text: 'the primary copy must remain after a native deletion error',
        dateAdded: new Date().toISOString(),
        lastRead: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await reader.putBook(book);
      window.__nativeMock.failRmdir = true;
      reader.showActionDialog = async () => true;
      let failed = false;
      try {
        await reader.deleteAllLocalData();
      } catch (error) {
        failed = true;
      }
      return {
        failed,
        bookStillPresent: Boolean(await reader.getBook(book.id)),
        nativeIndexStillPresent: window.__nativeMock.files.has('paceflow/books-index.json'),
        isDeletingAllData: reader.isDeletingAllData
      };
    });
    expect(result).toEqual({
      failed: true,
      bookStillPresent: true,
      nativeIndexStillPresent: true,
      isDeletingAllData: false
    });
  });

  test('settings and timestamp recover together from IndexedDB after localStorage eviction', async ({ page }) => {
    await openReader(page);
    const result = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      reader.settings.wpm = 612;
      await reader.saveSettings();
      const storedSettings = await reader.getKV('settings');
      const storedUpdatedAt = await reader.getKV('settingsUpdatedAt');
      localStorage.setItem('paceflow_settings_envelope', JSON.stringify({
        settings: { ...storedSettings, wpm: 713 },
        updatedAt: '2099-01-01T00:00:00.000Z'
      }));
      localStorage.removeItem('rsvp_settings');
      localStorage.removeItem('rsvp_settings_updated_at');
      const envelopeReader = new RSVPReader();
      await envelopeReader.ready;

      localStorage.removeItem('paceflow_settings_envelope');
      localStorage.removeItem('rsvp_settings');
      localStorage.removeItem('rsvp_settings_updated_at');

      const restarted = new RSVPReader();
      await restarted.ready;
      return {
        databaseWpm: storedSettings.wpm,
        timestampStored: typeof storedUpdatedAt === 'string',
        newerEnvelopeWpm: envelopeReader.settings.wpm,
        restoredWpm: restarted.settings.wpm,
        restoredTimestamp: restarted.settingsUpdatedAt,
        localEnvelope: JSON.parse(localStorage.getItem('paceflow_settings_envelope'))
      };
    });
    expect(result.databaseWpm).toBe(612);
    expect(result.timestampStored).toBe(true);
    expect(result.newerEnvelopeWpm).toBe(713);
    expect(result.restoredWpm).toBe(612);
    expect(result.restoredTimestamp).toBe(result.localEnvelope.updatedAt);
    expect(result.localEnvelope.settings.wpm).toBe(612);
  });

  test('legacy migration skips invalid records, retries transient writes and preserves newer primary data', async ({ page }) => {
    await openReader(page);
    const result = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      const newer = reader.normalizeBook({
        id: 'legacy-existing',
        name: 'New primary copy',
        text: 'newer primary content must win',
        dateAdded: '2026-01-01T00:00:00.000Z',
        lastRead: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z'
      });
      await reader.putBook(newer);
      const legacyBooks = [
        {
          id: 'legacy-invalid',
          name: 'Invalid',
          text: 'X'.repeat(reader.importLimits.maxTokenCharacters + 1),
          updatedAt: '2025-01-01T00:00:00.000Z'
        },
        {
          id: 'legacy-existing',
          name: 'Stale legacy copy',
          text: 'stale content',
          updatedAt: '2025-01-01T00:00:00.000Z'
        },
        {
          id: 'legacy-retry',
          name: 'Retry me',
          text: 'valid legacy text',
          updatedAt: '2025-01-01T00:00:00.000Z'
        }
      ];
      localStorage.setItem('rsvp_library', JSON.stringify(legacyBooks));
      await reader.setKV('legacyMigrated', false);

      const originalPutBook = reader.putBook.bind(reader);
      let failOnce = true;
      reader.putBook = async (...args) => {
        if (args[0]?.id === 'legacy-retry' && failOnce) {
          failOnce = false;
          throw new DOMException('temporary storage failure', 'UnknownError');
        }
        return originalPutBook(...args);
      };
      await reader.migrateLegacyData();
      const afterFailure = await reader.getKV('legacyMigrated');
      reader.putBook = originalPutBook;
      await reader.migrateLegacyData();
      return {
        retryableAfterFailure: afterFailure !== true,
        migrated: await reader.getKV('legacyMigrated'),
        skipped: await reader.getKV('legacyMigrationSkippedBooks'),
        preservedText: (await reader.getBook('legacy-existing')).text,
        retriedText: (await reader.getBook('legacy-retry')).text
      };
    });
    expect(result).toEqual({
      retryableAfterFailure: true,
      migrated: true,
      skipped: ['legacy-invalid'],
      preservedText: 'newer primary content must win',
      retriedText: 'valid legacy text'
    });
  });

  test('an IndexedDB quota failure aborts the entire staged backup import', async ({ page }) => {
    await openReader(page);
    const result = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      const timestamp = new Date().toISOString();
      const books = ['first', 'second', 'third'].map((id) => reader.normalizeBook({
        id: `atomic-${id}`,
        name: id,
        text: `${id} valid imported text`,
        dateAdded: timestamp,
        lastRead: timestamp,
        updatedAt: timestamp
      }));
      const originalPut = IDBObjectStore.prototype.put;
      let bookWrites = 0;
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'books' && ++bookWrites === 2) {
          throw new DOMException('quota reached', 'QuotaExceededError');
        }
        return originalPut.apply(this, args);
      };
      let failed = false;
      try {
        await reader.persistImportedBooksAtomically(books);
      } catch (error) {
        failed = error.name === 'QuotaExceededError';
      } finally {
        IDBObjectStore.prototype.put = originalPut;
      }
      return {
        failed,
        visibleBooks: (await reader.getAllBooks()).filter((book) => book.id.startsWith('atomic-')).length
      };
    });
    expect(result).toEqual({ failed: true, visibleBooks: 0 });
  });

  test('a malformed later backup record is rejected before the first visible write', async ({ page }) => {
    await openReader(page);
    const timestamp = new Date().toISOString();
    const payload = {
      version: 2,
      books: [
        {
          id: 'validated-first',
          name: 'First',
          text: 'first valid backup record',
          dateAdded: timestamp,
          lastRead: timestamp,
          updatedAt: timestamp
        },
        {
          id: 'validated-second',
          name: 'Second',
          text: 'second valid backup record',
          dateAdded: timestamp,
          lastRead: timestamp,
          updatedAt: timestamp
        },
        { id: 'malformed-third', name: 'Malformed', text: 42 }
      ]
    };
    await page.locator('#libraryImportInput').setInputFiles({
      name: 'malformed-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(payload))
    });
    await expect(page.locator('#toastContainer')).toContainText(/import failed|not a valid/i);
    expect(await page.evaluate(async () => (await window.rsvpReader.getAllBooks()).length)).toBe(0);
  });

  test('quarantined legacy books remain listable, exportable and deletable without opening', async ({ page }) => {
    await openReader(page);
    const result = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      const raw = {
        id: 'unsafe-quarantine',
        name: 'Unsafe legacy book',
        text: 'Q'.repeat(reader.importLimits.maxTokenCharacters + 1),
        currentIndex: 0,
        bookmarks: [],
        chapters: [],
        dateAdded: '2025-01-01T00:00:00.000Z',
        lastRead: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      };
      await reader.requestToPromise(reader.getStore('books', 'readwrite').put(raw));
      await reader.loadLibrary();
      reader.renderLibrary();
      const quarantined = await reader.getBook(raw.id);
      const listed = reader.booksList.textContent.includes(raw.name);
      const opened = await reader.loadBook(raw.id, { start: true });
      await reader.exportLibrary();
      await reader.deleteBookFromStorage(raw.id);
      return {
        quarantined: quarantined.isUnsafeText,
        listed,
        opened: opened === null,
        deleted: (await reader.getBook(raw.id)) === null
      };
    });
    expect(result).toEqual({ quarantined: true, listed: true, opened: true, deleted: true });
  });

  test('encoding, scoped RTF unicode fallback and pre-allocation token guards stay deterministic', async ({ page }) => {
    await openReader(page);
    const result = await page.evaluate(() => {
      const reader = window.rsvpReader;
      const utf16Text = 'Hello UTF16';
      const utf16Bytes = new Uint8Array(2 + (utf16Text.length * 2));
      utf16Bytes.set([0xff, 0xfe]);
      Array.from(utf16Text).forEach((character, index) => {
        utf16Bytes[2 + (index * 2)] = character.charCodeAt(0) & 0xff;
        utf16Bytes[3 + (index * 2)] = character.charCodeAt(0) >> 8;
      });
      const cp1251 = new Uint8Array([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]);
      const cp1252 = new Uint8Array([0x43, 0x61, 0x66, 0xe9]);
      const rtfSource = '{\\rtf1\\ansi\\uc1 \\u1040?{\\uc0 \\u1041}\\u1042?}';
      const rtf = reader.extractTextFromRTF(new TextEncoder().encode(rtfSource));
      const html = reader.extractTextFromHTMLDocument('<p>One<br>Two</p><div>Three <span>Four</span></div>');

      const originalLimits = { ...reader.importLimits };
      let denseRejected = false;
      let longRejected = false;
      let domCalls = 0;
      const originalParse = DOMParser.prototype.parseFromString;
      try {
        reader.importLimits.maxTokens = 3;
        try { reader.parseText('. . . .'); } catch (error) { denseRejected = true; }
        reader.importLimits.maxTokens = originalLimits.maxTokens;
        reader.importLimits.maxTokenCharacters = 5;
        try { reader.parseText('abcdef'); } catch (error) { longRejected = true; }
        reader.importLimits.maxTextCharacters = 5;
        DOMParser.prototype.parseFromString = function (...args) {
          domCalls += 1;
          return originalParse.apply(this, args);
        };
        try { reader.extractBookFromHTMLDocument('123456'); } catch (error) { /* expected */ }
      } finally {
        DOMParser.prototype.parseFromString = originalParse;
        reader.importLimits = originalLimits;
      }
      return {
        utf16: reader.readTextWithEncoding(utf16Bytes.buffer),
        cp1251: reader.readTextWithEncoding(cp1251.buffer),
        cp1252: reader.readTextWithEncoding(cp1252.buffer),
        rtf,
        html,
        denseRejected,
        longRejected,
        domCalls
      };
    });
    expect(result).toEqual({
      utf16: 'Hello UTF16',
      cp1251: 'Привет',
      cp1252: 'Café',
      rtf: 'АБВ',
      html: 'One\nTwo\n\nThree Four',
      denseRejected: true,
      longRejected: true,
      domCalls: 0
    });
  });

  test('typing while loadBook is awaiting storage cannot overwrite the composer', async ({ page }) => {
    await openReader(page);
    const result = await page.evaluate(async () => {
      const reader = window.rsvpReader;
      const book = reader.normalizeBook({
        id: 'delayed-load',
        name: 'Delayed',
        text: 'stored book text must not replace typing',
        dateAdded: new Date().toISOString(),
        lastRead: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await reader.putBook(book);
      const originalGetBook = reader.getBook.bind(reader);
      let release;
      let signal;
      const gate = new Promise((resolve) => { release = resolve; });
      const started = new Promise((resolve) => { signal = resolve; });
      reader.getBook = async (bookId) => {
        if (bookId === book.id) {
          signal();
          await gate;
        }
        return originalGetBook(bookId);
      };
      const pendingLoad = reader.loadBook(book.id, { start: true });
      await started;
      reader.textInput.value = 'fresh text typed during the pending load';
      reader.handleTextInputChanged();
      release();
      const loaded = await pendingLoad;
      reader.getBook = originalGetBook;
      return {
        loaded: loaded === null,
        text: reader.textInput.value,
        bookId: reader.currentBookId,
        unsaved: reader.hasUnsavedTextInput
      };
    });
    expect(result).toEqual({
      loaded: true,
      text: 'fresh text typed during the pending load',
      bookId: null,
      unsaved: true
    });
  });

  test('English and Russian UI strings switch immediately and persist across reload', async ({ page }) => {
    await openReader(page, 'en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('[data-i18n="textOrBook"]:visible').first()).toHaveText('Start reading');
    await expect(page.locator('#textInput')).toHaveAttribute('placeholder', /Paste text here/);
    await page.locator('#settingsBtn').click();
    await expect(page.locator('#settingsTitle')).toHaveText('Settings');
    await page.locator('#languageRuBtn').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('[data-i18n="textOrBook"]:visible').first()).toHaveText('Начать чтение');
    await expect(page.locator('#textInput')).toHaveAttribute('placeholder', /Вставьте текст/);
    await expect(page.locator('#settingsTitle')).toHaveText('Настройки');
    await expect(page.locator('.skip-link')).not.toHaveText('Skip to content');
    await expect(page.locator('label[for="bookNameInput"]')).not.toHaveText('Book title');
    await expect(page.locator('.rsvp-controls')).not.toHaveAttribute('aria-label', 'Reading controls');

    await page.reload();
    await page.waitForFunction(() => Boolean(window.rsvpReader));
    await page.evaluate(async () => window.rsvpReader.ready);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('[data-i18n="textOrBook"]:visible').first()).toHaveText('Начать чтение');
  });

  test('count labels use correct English and Russian singular and plural forms', async ({ page }) => {
    await openReader(page, 'en');
    const labels = await page.evaluate(() => {
      const reader = window.rsvpReader;
      const english = [
        reader.formatWordCount(1), reader.formatWordCount(2),
        reader.formatBookmarkCount(1), reader.formatBookCount(2)
      ];
      reader.setLanguage('ru');
      const russian = [
        reader.formatWordCount(1), reader.formatWordCount(2), reader.formatWordCount(5),
        reader.formatBookmarkCount(1), reader.formatBookmarkCount(2), reader.formatBookmarkCount(5)
      ];
      return { english, russian };
    });
    expect(labels.english).toEqual(['1 word', '2 words', '1 bookmark', '2 books']);
    expect(labels.russian).toEqual(['1 слово', '2 слова', '5 слов', '1 закладка', '2 закладки', '5 закладок']);
  });

  test('modal focus is trapped, Escape restores focus, and hidden controls stay out of accessibility navigation', async ({ page }) => {
    await openReader(page);
    await loadPlainText(page, 'one two three four five six seven');
    await page.evaluate(() => window.rsvpReader.startRSVP());
    await page.locator('#settingsBtn').focus();
    await page.locator('#settingsBtn').click();
    await expect(page.locator('#settingsModal')).toHaveClass(/active/);
    await expect(page.locator('#closeSettingsBtn')).toBeFocused();
    await expect(page.locator('#mainContainer')).toHaveAttribute('aria-hidden', 'true');

    await page.locator('#wpmInput').focus();
    const beforeSpace = await page.evaluate(() => ({ mode: window.rsvpReader.mode, playing: window.rsvpReader.isPlaying }));
    await page.keyboard.press('Space');
    expect(await page.evaluate(() => ({ mode: window.rsvpReader.mode, playing: window.rsvpReader.isPlaying }))).toEqual(beforeSpace);

    await page.evaluate(() => window.rsvpReader.getModalFocusables(window.rsvpReader.settingsModal).at(-1).focus());
    await page.keyboard.press('Tab');
    await expect(page.locator('#closeSettingsBtn')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#settingsModal')).not.toHaveClass(/active/);
    await expect(page.locator('#settingsBtn')).toBeFocused();
    await expect(page.locator('#mainContainer')).not.toHaveAttribute('aria-hidden', 'true');

    await expect(page.locator('#librarySearchInput')).toHaveAttribute('aria-label', 'Search your library');
    await expect(page.locator('#searchInput')).toHaveAttribute('aria-label', 'Find in book');
    await expect(page.locator('#fileInput')).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('#libraryImportInput')).toHaveAttribute('aria-hidden', 'true');
  });

  test('the built-in demo starts without a book and focus scrubbing seeks precisely', async ({ page }) => {
    await openReader(page);
    await expect(page.locator('#tryDemoBtn')).toHaveText('Try the 45-second demo');
    await page.locator('#tryDemoBtn').click();

    await expect(page.locator('#rsvpReadingSection')).toBeVisible();
    await expect(page.locator('#rsvpBookTitle')).toHaveText('A quiet reading demo');
    await expect(page.locator('#textInput')).toHaveValue(/The first light reached the kitchen table/);
    await expect(page.locator('#playPauseBtn')).toHaveAttribute('aria-label', 'Continue');

    const before = await page.evaluate(() => window.rsvpReader.wordOrdinalAtIndex(window.rsvpReader.currentIndex));
    await page.locator('#rsvpScrubber').fill('750');
    const position = await page.evaluate(() => {
      const reader = window.rsvpReader;
      return {
        current: reader.wordOrdinalAtIndex(reader.currentIndex),
        total: reader.countReadableWords(),
        playing: reader.isPlaying,
        valueText: reader.rsvpScrubber.getAttribute('aria-valuetext')
      };
    });
    expect(position.current).toBeGreaterThan(before);
    expect(position.current / position.total).toBeGreaterThan(0.7);
    expect(position.current / position.total).toBeLessThan(0.8);
    expect(position.playing).toBe(false);
    expect(position.valueText).toContain(`word ${position.current} of ${position.total}`);

    await page.locator('#stopRSVPBtn').click();
    await page.locator('#backToInputBtn').click();
    await page.evaluate(() => window.rsvpReader.setLanguage('ru'));
    await page.locator('#textInput').fill('Несохранённый черновик');
    await page.locator('#tryDemoBtn').click();
    await expect(page.locator('#actionDialogTitle')).toHaveText('Открыть демо?');
    await page.locator('#actionDialogCancelBtn').click();
    await expect(page.locator('#textInput')).toHaveValue('Несохранённый черновик');
  });

  test('Chrome extension text handoff is nonce-scoped, saved locally and opened in focus mode', async ({ page }) => {
    const nonce = '0123456789abcdef0123456789abcdef';
    await page.goto(`/?paceflow-extension-import=${nonce}`);
    await page.evaluate(() => window.rsvpReader.ready);
    await expect(page.locator('#chromeExtensionDownload')).toHaveAttribute(
      'href',
      'downloads/paceflow-quick-send.zip'
    );

    const ignoredText = 'This payload has the wrong nonce and must remain ignored by the PaceFlow import bridge.';
    await page.evaluate(({ ignoredText }) => {
      window.postMessage({
        channel: 'paceflow-extension',
        type: 'paceflow-extension-import',
        version: 1,
        nonce: 'ffffffffffffffffffffffffffffffff',
        payload: { type: 'text', text: ignoredText, title: 'Ignored' }
      }, window.location.origin);
    }, { ignoredText });
    await page.waitForTimeout(80);
    await expect(page.locator('#textInput')).not.toHaveValue(ignoredText);

    const text = [
      'A selected passage arrives from Chrome without being placed in a URL or uploaded as a book.',
      'PaceFlow stores the handoff locally, opens the reader, and starts focus mode at the first word.',
      'The original page address remains useful as source metadata inside the private local library.'
    ].join('\n\n');
    const result = await page.evaluate(({ nonce, text }) => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Chrome handoff acknowledgement timed out')), 5000);
      const receive = (event) => {
        if (event.data?.type !== 'paceflow-import-result' || event.data?.nonce !== nonce) return;
        clearTimeout(timeout);
        window.removeEventListener('message', receive);
        resolve(event.data);
      };
      window.addEventListener('message', receive);
      window.postMessage({
        channel: 'paceflow-extension',
        type: 'paceflow-extension-import',
        version: 1,
        nonce,
        payload: {
          type: 'text',
          text,
          title: 'Selected research notes',
          sourceUrl: 'https://example.com/notes#selection'
        }
      }, window.location.origin);
    }), { nonce, text });

    expect(result.ok).toBe(true);
    await expect(page.locator('#rsvpReadingSection')).toBeVisible();
    await expect(page.locator('#rsvpBookTitle')).toHaveText('Selected research notes');
    const stored = await page.evaluate(() => {
      const book = window.rsvpReader.library.find((item) => item.name === 'Selected research notes');
      return { sourceType: book?.sourceType, fileName: book?.fileName };
    });
    expect(stored).toEqual({ sourceType: 'extension', fileName: 'https://example.com/notes' });
  });

  test('Chrome extension article handoff uses the guarded URL importer and starts focus mode', async ({ page }) => {
    const nonce = 'abcdef0123456789abcdef0123456789';
    await page.route('**/api/article', async (route) => {
      const submitted = JSON.parse(route.request().postData() || '{}');
      expect(submitted.url).toBe('https://news.example/long-story');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'A Chrome-sent article',
          sourceUrl: 'https://news.example/long-story',
          text: [
            'The article importer keeps the useful opening paragraph and prepares it for paced reading.',
            'A second paragraph makes the saved article long enough to enter focus mode reliably.',
            'The final paragraph verifies that Chrome sends only a URL while the guarded server extracts the text.'
          ].join('\n\n'),
          wordCount: 45
        })
      });
    });
    await page.goto(`/?paceflow-extension-import=${nonce}`);
    await page.evaluate(() => window.rsvpReader.ready);

    const result = await page.evaluate((nonce) => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Article handoff acknowledgement timed out')), 5000);
      const receive = (event) => {
        if (event.data?.type !== 'paceflow-import-result' || event.data?.nonce !== nonce) return;
        clearTimeout(timeout);
        window.removeEventListener('message', receive);
        resolve(event.data);
      };
      window.addEventListener('message', receive);
      window.postMessage({
        channel: 'paceflow-extension',
        type: 'paceflow-extension-import',
        version: 1,
        nonce,
        payload: { type: 'url', url: 'https://news.example/long-story#comments' }
      }, window.location.origin);
    }), nonce);

    expect(result.ok).toBe(true);
    await expect(page.locator('#rsvpReadingSection')).toBeVisible();
    await expect(page.locator('#rsvpBookTitle')).toHaveText('A Chrome-sent article');
    const stored = await page.evaluate(() => {
      const book = window.rsvpReader.library.find((item) => item.name === 'A Chrome-sent article');
      return { sourceType: book?.sourceType, fileName: book?.fileName };
    });
    expect(stored).toEqual({ sourceType: 'url', fileName: 'https://news.example/long-story' });
  });

  test('accessible app dialogs replace browser prompts and expose privacy and support', async ({ page }) => {
    let browserDialogOpened = false;
    page.on('dialog', async (dialog) => {
      browserDialogOpened = true;
      await dialog.dismiss();
    });

    await openReader(page);
    await page.locator('#textInput').fill('dialog regression book text');
    await page.locator('#bookNameInput').fill('Original title');
    await page.evaluate(async () => window.rsvpReader.saveCurrentTextAsBook({ silent: true }));
    await page.evaluate(async () => window.rsvpReader.showLibrary());

    await page.getByRole('button', { name: 'Rename' }).click();
    await expect(page.locator('#actionDialog')).toHaveClass(/active/);
    await expect(page.locator('#actionDialogTitle')).toHaveText('Rename book');
    await page.locator('#actionDialogInput').fill('Renamed safely');
    await page.locator('#actionDialogForm').evaluate((form) => form.requestSubmit());
    await expect(page.locator('.book-title')).toHaveText('Renamed safely');

    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('#actionDialogTitle')).toHaveText('Delete book?');
    await page.locator('#actionDialogCancelBtn').click();
    await expect(page.locator('#actionDialog')).not.toHaveClass(/active/);
    await expect(page.locator('.book-title')).toHaveText('Renamed safely');

    await page.locator('#settingsBtn').click();
    await expect(page.locator('a[href="privacy.html"]')).toHaveText('Privacy policy');
    await expect(page.locator('a[href="support.html"]')).toHaveText('Support');
    await expect(page.locator('[data-i18n="versionLabel"]')).toHaveText('Version 1.0');
    await page.locator('#deleteAllDataBtn').click();
    await expect(page.locator('#actionDialog')).toHaveClass(/active/);
    await expect(page.locator('#settingsModal')).toHaveClass(/active/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#actionDialog')).not.toHaveClass(/active/);
    await expect(page.locator('#settingsModal')).toHaveClass(/active/);
    expect(browserDialogOpened).toBe(false);
  });

  test('resetting settings unregisters optional Media Session handlers', async ({ page }) => {
    await openReader(page);
    const result = await page.evaluate(() => {
      const handlers = {};
      Object.defineProperty(navigator, 'mediaSession', {
        configurable: true,
        value: {
          setActionHandler(action, handler) { handlers[action] = handler; },
          playbackState: 'none'
        }
      });
      const reader = window.rsvpReader;
      reader.settings.hardwareControls = true;
      reader.setupHardwareControls();
      const before = Object.fromEntries(Object.entries(handlers).map(([key, value]) => [key, typeof value]));
      reader.resetSettings();
      const after = Object.fromEntries(Object.entries(handlers));
      return { before, after };
    });
    expect(result.before).toEqual({ play: 'function', pause: 'function', stop: 'function' });
    expect(result.after).toEqual({ play: null, pause: null, stop: null });
  });

  test('Delete all local data clears books, progress and settings', async ({ page }) => {
    await openReader(page, 'en');
    await page.locator('#textInput').fill('private local book words');
    await page.locator('#bookNameInput').fill('Erase me');
    await page.evaluate(async () => {
      const reader = window.rsvpReader;
      await reader.saveCurrentTextAsBook({ silent: true });
      reader.settings.wpm = 777;
      reader.saveSettings();
      reader.showActionDialog = async () => true;
      await reader.deleteAllLocalData();
    });

    await page.waitForTimeout(700);
    await page.waitForFunction(() => Boolean(window.rsvpReader));
    await page.evaluate(async () => window.rsvpReader.ready);
    const state = await page.evaluate(async () => ({
      library: (await window.rsvpReader.getAllBooks()).length,
      text: window.rsvpReader.textInput.value,
      bookId: window.rsvpReader.currentBookId,
      storedSettings: localStorage.getItem('rsvp_settings'),
      storedResume: localStorage.getItem('paceflow_resume')
    }));
    expect(state).toEqual({ library: 0, text: '', bookId: null, storedSettings: null, storedResume: null });
  });

  test('legacy unauthenticated cloud sync is disabled by default', async ({ request }) => {
    const response = await request.post('/api/sync', {
      data: { clientId: 'public-regression-client', books: [] }
    });
    expect(response.status()).toBe(410);
    expect(await response.json()).toMatchObject({ error: expect.stringMatching(/stores books locally/i) });
  });

  test('the web server never exposes private storage and survives malformed URLs', async ({ request }) => {
    const privateResponse = await request.get('/data/sync-store.json');
    expect(privateResponse.status()).toBe(404);

    const malformedStatus = await new Promise((resolve, reject) => {
      const malformedRequest = http.request({ hostname: '127.0.0.1', port: 8081, path: '/%', method: 'GET' }, (response) => {
        response.resume();
        response.on('end', () => resolve(response.statusCode));
      });
      malformedRequest.on('error', reject);
      malformedRequest.end();
    });
    expect(malformedStatus).toBe(400);

    const traversalStatus = await new Promise((resolve, reject) => {
      const traversalRequest = http.request({
        hostname: '127.0.0.1',
        port: 8081,
        path: '/assets/%2e%2e/data/sync-store.json',
        method: 'GET'
      }, (response) => {
        response.resume();
        response.on('end', () => resolve(response.statusCode));
      });
      traversalRequest.on('error', reject);
      traversalRequest.end();
    });
    expect(traversalStatus).toBe(404);

    const healthResponse = await request.get('/index.html');
    expect(healthResponse.status()).toBe(200);
  });
});
