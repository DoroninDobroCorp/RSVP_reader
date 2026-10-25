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

The final checked source and publication evidence are recorded below.

### First-visit compatibility with older offline workers

A real public-browser check found that a pre-existing v55 service worker could serve its cached full-reader app.js/base helper in response to the new query version. On the Lite DOM, the full bootstrap then failed before it could update that worker. This first-entry failure was not visible in clean browser contexts.

The web build now emits byte-identical aliases lite-core.js and lite-base-url.js from the canonical shared sources. Lite uses those distinct names, which the old worker cannot confuse with its cached full-reader entry. The v57 shell precaches them. No parser/timing/storage code is forked. A browser regression explicitly boots Lite while a representative v55 basename-fallback worker still controls the page, then upgrades to the current worker and verifies reading.

### Release-test granularity

The first e4cc52e broad run passed 281/282 browser tests but exhausted the 45-second deadline in the existing full-reader nine-combination font settings test. All completed geometry assertions passed. The locale/viewport combinations are now independent tests with the same default deadline and all original overflow, text-bound, 44px and selected-font assertions retained. This changes the browser case count without reducing coverage or adding automatic retries.

## Verified result and publication

Validated application source: `b1129030bf63ac7e8d4cf86ddebec3536d202183`. A clean GitHub checkout on the server completed all 16 source/web/package/security checks. Raw summary: `/srv/hummingread/artifacts/lite-preview-20261024/candidate-b112903/artifacts/ios-candidate/summary.json`.

- 108 unit tests passed.
- 306 browser/marketing tests passed in Chromium, Linux WebKit and the mobile-Safari browser configuration, including 45 Lite cases. There were no skipped tests or automatic retries.
- 10 offline tests passed, including Lite under root and /rsvp and the legacy-worker negative control/upgrade.
- Real Chrome extension EN/RU/ES E2E passed; npm audit reported zero vulnerabilities.
- Package, notices, metadata, isolation, built-output and deterministic-build gates passed.
- The Linux runner intentionally exits 2 after successful web checks because native App Store gates remain separate. Its Android build output is not iPhone runtime evidence. No Xcode, signing or device installation was performed for Lite.

The five Lite-specific web payload files (entry, stylesheet, controller and generated core/base aliases) are absent from the native bundle. The generated aliases were checked byte-for-byte against their canonical shared files. The installed iPhone app remains the existing full 1.0 (2) build.

### Measured reading surface

Same synthetic Russian book in a 390×844 Chromium CSS viewport; no simulated safe insets in this comparison:

| Observation | Full web reader | Lite |
| --- | ---: | ---: |
| Text viewport height | 478px | 715px |
| Visible buttons outside ordinary text | 10 | 3 |
| Visible buttons in word-by-word reading | 11 | 6 |
| Ordinary text size | 16.8px | 20px |

This measures the rendered interface, not reading speed, comprehension, binary size or a physical iPhone. Raw measurements: `artifacts/lite-preview-20261024/layout-comparison.json`.

### Live preview

- [Русский](https://145.239.82.124.sslip.io/rsvp/lite.html?lang=ru)
- [English](https://145.239.82.124.sslip.io/rsvp/lite.html?lang=en)
- [Español](https://145.239.82.124.sslip.io/rsvp/lite.html?lang=es)
- [Full reader](https://145.239.82.124.sslip.io/rsvp/) remains the default entry.

Published immutable release: `/srv/hummingread/releases/b1129030bf63ac7e8d4cf86ddebec3536d202183`. Deployment configuration/target backup: `/var/backups/hummingread/ios-launch-20261025T010424Z`. The previous releases are retained.

Independent public verification matched the exact release bytes for all eight checked Lite/shared/worker assets. All 18 HTTP checks passed: full reader and marketing routes remain available in all three languages; private repository/package paths and retired sync remain inaccessible; article GET remains method-rejected. Nginx configuration validation passed. One readiness probe ran before the restarted stateless reader server was listening; subsequent readiness and external checks passed.

The same public in-app-browser origin that exhibited the first-entry failure now boots the Lite UI in Russian without manual cache clearing: ready=true, reader-ui=lite, lite-core.js?v=57, full-version link /rsvp/ru/, zero new console errors after navigation. This is browser evidence, not native iPhone QA.

### Retained evidence

Server namespace: `/srv/hummingread/artifacts/lite-preview-20261024/`.

- `candidate-b112903/artifacts/ios-candidate/`: final per-step raw logs and summary.
- `live-verification-b112903.json`: public response hashes and status checks.
- `browser-live-b112903.json`: bounded public-browser observations.
- `layout-comparison.json`, `screen-evidence.json`, `screenshots/`: final-source dimensions, checksums and original 390×844 browser captures using only the project's synthetic public demo.
- `first-entry-incident.json`: earlier live-cache failure and its fix; earlier candidate/deployment logs remain available.
- The e4cc52e broad run's one full-reader matrix timeout is retained rather than presented as a pass. Final b112903 has the same assertions split into independent locale/viewport cases and passes cleanly.

The web preview remains available for the design/reading trial. A subsequent explicit owner request selected the minimal iOS entry and installed build 3 on the connected iPhone: [installation and evidence](IOS_MINIMAL_BUILD3_2026-10-24.md). Full native acceptance and the main launch plan (domain, donations, Developer enrollment, TestFlight and review) remain open.
