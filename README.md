# HummingRead: Speed Reader

HummingRead is a calm, local-first RSVP (Rapid Serial Visual Presentation) speed reader for EPUB, FB2/ZIP, DOCX, TXT, HTML, Markdown, RTF, pasted text, and optional public web articles. Pico—the hummingbird focus pilot—anchors a calm, graphic interface built around a still gaze and moving words.

This release features complete **trilingual support** across English (`en`), Russian (`ru`), and neutral international Spanish (`es`).

Tester preview: <https://145.239.82.124.sslip.io/rsvp/>. The website includes the deterministic unpacked Chrome tester ZIP. See `docs/TESTER_GUIDE.md` for the three-surface test scope and the honest iOS distribution boundary.

The release brand is **provisional pending owner/legal confirmation**. The current public URLs are tester-preview values. The existing iOS bundle identifier stays unchanged until the owner approves and registers the final identifier.

## Surfaces and Languages

HummingRead is available across three primary surfaces with consistent trilingual localization in English (`en`), Russian (`ru`), and neutral international Spanish (`es`):

- **Web / PWA Reader**: Fully offline-capable progressive web application with local library storage, dark/light themes, and responsive RSVP player.
- **Native iOS App**: Local-only native app shell powered by Capacitor iOS with zero network telemetry or cloud reliance.
- **Chrome Extension (Manifest V3)**: Extension popup and standalone reader for reading selection, extracted page text, or pasted text.

## What works

- **Trilingual UI & Localization**: Full language switcher and localized strings for English (`en`), Russian (`ru`), and neutral international Spanish (`es`) across Web/PWA, native iOS, and Chrome extension surfaces.
- **RSVP Engine**: One- or two-word RSVP with ORP (Optimal Recognition Point) focus, punctuation timing, explicit WPM control, 10-word rewind, exact scrubber, and anchored context on pause.
- **Local Library & Storage**: Local library, bookmarks, exact reading position, search, table of contents, backup/restore, light/dark themes, and offline PWA reopening.
- **Guided Demo**: Interactive 45-second demo available in all three supported languages teaching play, pause, rewind, scrub, and book import.
- **Native iOS Shell**: Local-only reader shell with local books, native language matching, and offline performance without analytics or cloud tracking.
- **Chrome Extension**: Manifest V3 extension reading selected text, page text, or explicit paste in its own localized reader interface.
- **Optional Web Article Importer**: Strict HTTP(S) article URL importer with DNS pinning, redirect restrictions, content-type checks, size limits, and global-unicast SSRF protections.

HummingRead controls presentation pace; it does not promise a particular improvement in comprehension or reading speed.

## Privacy boundaries and offline local-only guarantees

HummingRead operates under strict offline local-only privacy guarantees:

| Surface | Behavior |
| --- | --- |
| Web/PWA books and pasted text | Stored entirely locally in browser storage (IndexedDB/localStorage); no account required, no tracking, and no cloud sync. Core reading functions 100% offline. |
| Web article import | Sends the entered public URL to the first-party extraction service. The service fetches transiently, stores no article/library record, disables article access logging in the prepared nginx policy, and expires raw-IP abuse buckets after the hard limit. |
| Native iOS | 100% local-only; article URL importer is absent, core reading operates fully offline with no analytics or background data collection. |
| Chrome standalone reader | Selection/page/paste text and reading progress remain strictly in local extension storage; zero background content transmission. |
| Chrome Quick Send | Sends the chosen payload only after the user presses the labelled secondary action; pending session data expires within ten minutes. |

See `privacy.html`, `docs/PRIVACY_POLICY.md`, and `docs/DEPLOYMENT_RUNBOOK.md` for the exact policy and deployment match.

## Development

```sh
npm ci
npm start
```

The server defaults to `127.0.0.1:8081`. Override `HOST` and `PORT` only in a controlled environment; production remains loopback behind nginx.

## Build commands

- `npm run build:all`: Build web, extension, and native assets.
- `npm run build:web`: Build the Web/PWA distribution in `dist/`.
- `npm run build:native`: Build web assets and sync Capacitor iOS.
- `npm run build:extension`: Build the Manifest V3 Chrome extension package.

```sh
npm run build:all
npm run build:web
npm run build:native
npm run build:extension
```

## Testing and verification commands

- `npm run test:unit`: Run unit test suite.
- `npm run test:extension`: Run end-to-end Chrome extension tests.
- `npm run verify:all`: Execute complete verification suite.

```sh
npm run test:unit
npm run test:extension
npm run test:production
npm run test:cross-browser
npm run test:visual
npm run verify:all
```

`npm run build:web` creates `dist/` and the deterministic tester archive at `dist/downloads/hummingread-tester.zip`. The ZIP injects exactly the centrally configured preview origin; the tracked extension source has no host permission. Until Chrome Web Store review, it is a tester build to install unpacked—not a consumer-store download.

Production configuration is centralized in `product.config.json`. Preview builds intentionally allow the documented `sslip.io` and `example.invalid` owner gates. This command must fail until final domain/store URLs and owner approval are recorded:

```sh
HUMMINGREAD_RELEASE_MODE=production npm run verify:brand
```

## Source-control and deployment safety

Work on a review branch, keep the production `main` checkout untouched, and never serve the repository root. The prepared unit runs direct Node as locked user `paceflow` on loopback; nginx exposes only `dist/`, keeps `/api/sync` at 404, makes `/api/article` POST-only/rate-limited/unlogged/no-store, and denies repository, data, native, test, dependency, and book paths.

Deployment is not automatic. The current tester preview was activated through `docs/DEPLOYMENT_RUNBOOK.md`; subsequent releases use the same versioned backup, activation, smoke-test, and rollback path without `git reset --hard`.

## Key artifacts

- Brand decision and visual rules: `docs/BRAND_DECISION.md`, `docs/BRAND_SYSTEM.md`
- Editable artwork and provenance: `assets/brand/`, `docs/ASSET_PROVENANCE.md`
- Chrome source and store notes: `chrome-extension/`, `docs/CHROME_EXTENSION.md`
- iOS store copy and owner gates: `docs/APP_STORE_COPY.md`, `docs/APP_STORE_CHECKLIST.md`
- Website, unpacked Chrome, and iOS tester workflow: `docs/TESTER_GUIDE.md`
- Licenses: `docs/THIRD_PARTY_NOTICES.md`, `acknowledgements.html`
- Final local test counts, checksums, and external gates: `docs/RELEASE_EVIDENCE.md`
- Baseline and reconciliation: `docs/MISSION_BASELINE.md`, `docs/INTEGRATION_LEDGER.md`
