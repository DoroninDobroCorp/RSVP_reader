# HummingRead Lite — optional web preview, 24 October 2026

## Owner request and boundaries

Provide a calmer, intuitive alternative to the current feature-rich reader, including a reading view designed around iPhone 13 Pro. Keep the full version available. Do not install or replace anything on the connected iPhone.

Canonical implementation stays on serverforvovka:/srv/hummingread and the existing review branch. The preview entry is `/rsvp/lite.html?lang=ru` (also `en` and `es`). The existing full reader remains the default at `/rsvp/` and its localized routes. There is no native version bump, Xcode invocation, signing or device installation for this work. The Lite entry, controller, styles and two generated core/base aliases are explicitly excluded from the native web bundle.

## Product changes

- Home is a small bookshelf: open a book, paste text, continue the last book. A short reading sample appears only when the shelf is empty.
- Reading shows the book itself, a compact back/title/Aa bar, one progress figure and one action to read word by word. Contents appears only when the imported book has chapters.
- Ordinary scrolling saves a reading anchor automatically; a word tap can still select an exact position.
- Word-by-word reading uses a single primary play/pause button, rewind ten words, a speed stepper and one position slider. No duplicate play area, session statistics, bookmark toolbar, search panel, guide or ORP configuration is shown.
- Aa opens a small sheet with speed, size, two typefaces, light/dark themes and EN/RU/ES. Backup export and a link to the full version remain available.
- Book rename/removal lives in a contextual menu; removal still requires the existing confirmation.
- Light paper, quiet colors and system/Georgia fonts need no external font or decorative image download.

Lite has its own HTML, CSS and presentation controller. It reuses the existing file parsers, safety limits, storage transactions, deletion tombstones and timing engine. It does not insert the full landing page and hide its controls with CSS. A `singleWord` frame option keeps Lite to one word without overwriting the full reader's pairing preference.

## Data behavior

Both web readers use the same browser origin and the same library schema, books and progress. No migration, reset or book deletion occurs merely by opening Lite. Opening a book, importing, changing settings or removing a book acts on that shared browser library. The native installed app has separate storage and is not touched.

An unsaved full-reader text draft is guarded before another book/demo/import can replace it. The owner can cancel, save the draft in the full version or download a backup. Removing the currently selected book clears only that deleted book's working draft after successful confirmed removal, so it cannot return as an orphan draft.

## Reference study

Official screenshots and documentation inspected on 24 October 2026:

- [Readwise Reader — Appearance and long-form reading view](https://docs.readwise.io/reader/docs/faqs/appearance): dedicated long-form reading removes the action-heavy bottom bar; appearance is grouped under Aa.
- [Readwise's Aa screenshot](https://docs.readwise.io/images/reader-appearance_long-form-aa-icon.png) and [standard/long-form comparison](https://docs.readwise.io/images/reading-view_standard-vs-long-form.gif): inspected visually in the browser.
- [Outread](https://outreadapp.com/) and its [official flash-mode image](https://outreadapp.com/_next/image?q=75&url=%2F_next%2Fstatic%2Fmedia%2Ffeature-rsvp.a2d48fdd.png&w=384): an uncluttered centered-word presentation.

These are design references; no third-party screenshots, branding or app assets are included in HummingRead.

## Acceptance evidence

The automated suite `tests/test-lite.spec.js` covers import through the file input for all seven advertised formats, paste, playback, pause/rewind/speed, exact saved position across reload and full/Lite transitions, settings and language persistence, safe HTML titles, rename/removal cancellation, draft protection and backup export. The existing offline suite adds Lite navigation at root and /rsvp, including changing language offline while retaining the saved book position.

The layout matrix includes EN/RU/ES at 320×568, 390×844 (iPhone 13 Pro CSS viewport), 390×660 (short browser viewport) and 844×390 landscape. Portrait 390px tests additionally model 47px top and 34px bottom safe-area insets; landscape tests model 47px left/right and 21px bottom insets; this is a browser simulation. It verifies long-word fitting, absence of horizontal overflow and visible controls at least 44×44px.

Ordinary scroll is exercised with a real desktop browser wheel; Playwright mobile WebKit lacks wheel support, so that project's touch event path uses a synthetic DOM touchmove followed by scrolling. None of these tests constitutes a physical iPhone/VoiceOver/native-Safari acceptance. A future user-approved native trial remains separate.

Current validation/deployment results are recorded below after the checked source is committed.

### First-visit compatibility with older offline workers

A real public-browser check found that a pre-existing v55 service worker could serve its cached full-reader app.js/base helper in response to the new query version. On the Lite DOM, the full bootstrap then failed before it could update that worker. This first-entry failure was not visible in clean browser contexts.

The web build now emits byte-identical aliases lite-core.js and lite-base-url.js from the canonical shared sources. Lite uses those distinct names, which the old worker cannot confuse with its cached full-reader entry. The v57 shell precaches them. No parser/timing/storage code is forked. A browser regression explicitly boots Lite while a representative v55 basename-fallback worker still controls the page, then upgrades to the current worker and verifies reading.

### Release-test granularity

The first e4cc52e broad run passed 281/282 browser tests but exhausted the 45-second deadline in the existing full-reader nine-combination font settings test. All completed geometry assertions passed. The locale/viewport combinations are now independent tests with the same default deadline and all original overflow, text-bound, 44px and selected-font assertions retained. This changes the browser case count without reducing coverage or adding automatic retries.
