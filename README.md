# HummingRead: Speed Reader

HummingRead is a local-first RSVP reader for EPUB, FB2/ZIP, DOCX, TXT, HTML, Markdown, RTF, pasted text, and optional public web articles. Pico—the hummingbird focus pilot—anchors a calm, graphic interface built around a still gaze and moving words.

Tester preview: <https://145.239.82.124.sslip.io/rsvp/>. The website includes the deterministic unpacked Chrome tester ZIP. See `docs/TESTER_GUIDE.md` for the three-surface test scope and the honest iOS distribution boundary.

The release brand is **provisional pending owner/legal confirmation**. The current public URLs are tester-preview values. The existing iOS bundle identifier stays unchanged until the owner approves and registers the final identifier.

## What works

- Local library, bookmarks, exact reading position, search, contents, backup/restore, light/dark themes, and offline PWA reopening.
- One- or two-word RSVP with ORP focus, punctuation timing, explicit WPM control, rewind 10 words, exact scrubber, and anchored context on pause.
- Guided 45-second demo that teaches play, pause/context, rewind, scrub, and book import.
- Native iOS shell with local-only books and no article importer, account, analytics, cloud sync, or library upload.
- Optional web article URL importer with strict HTTP(S), DNS pinning, redirect, content-type, size, time, and global-unicast SSRF controls.
- Manifest V3 Chrome extension that reads selected text, locally extracted page text, or explicit paste in its own reader. Optional Quick Send to the configured tester website is secondary and explicit.

HummingRead controls presentation pace; it does not promise a particular improvement in comprehension or reading speed.

## Privacy boundaries

| Surface | Behavior |
| --- | --- |
| Web/PWA books and pasted text | Stored locally in browser storage; no account or cloud sync. |
| Web article import | Sends the entered public URL to the first-party extraction service. The service fetches transiently, stores no article/library record, disables article access logging in the prepared nginx policy, and expires raw-IP abuse buckets after the documented hard limit. |
| Native iOS | Local-only; article URL import is absent and core reading works offline. |
| Chrome standalone reader | Selection/page/paste text and progress stay in extension storage; no content transmission. |
| Chrome Quick Send | Sends the chosen payload only after the user presses the labelled secondary action; pending session data expires within ten minutes. |

See `privacy.html`, `docs/PRIVACY_POLICY.md`, and `docs/DEPLOYMENT_RUNBOOK.md` for the exact policy and deployment match.

## Development

```sh
npm ci
npm start
```

The server defaults to `127.0.0.1:8081`. Override `HOST` and `PORT` only in a controlled environment; production remains loopback behind nginx.

## Build and verification

```sh
npm run build:all
npm run cap:sync
npm run test:unit
npm run test:production
npm run test:cross-browser
npm run test:extension
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
