# HummingRead: Speed Reader

HummingRead is a calm, local-first RSVP (Rapid Serial Visual Presentation) speed reader for EPUB, FB2/ZIP, DOCX, TXT, HTML, Markdown, RTF, pasted text, and optional public web articles. Pico—the hummingbird focus pilot—anchors a calm, graphic interface built around a still gaze and moving words.

This release features complete **Android R1 platform support** alongside **trilingual localization** across English (`en`), Russian (`ru`), and neutral international Spanish (`es`).

Tester preview: <https://145.239.82.124.sslip.io/rsvp/>. The website includes the deterministic unpacked Chrome tester ZIP. See `docs/TESTER_GUIDE.md` for the three-surface test scope and the honest iOS/Android distribution boundaries.

The release brand is **provisional pending owner/legal confirmation**. The current public URLs are tester-preview values. Existing native app identifiers stay unchanged until the owner approves and registers final identifiers.

## Surfaces and Languages

HummingRead is available across four primary surfaces with consistent trilingual localization in English (`en`), Russian (`ru`), and neutral international Spanish (`es`):

- **Web / PWA Reader**: Fully offline-capable progressive web application with static pre-rendered HTML body copy, locale route authority (`/`, `/ru/`, `/es/`), localized PWA manifests (`manifest.webmanifest`), local library storage, dark/light themes, and responsive RSVP player.
- **Native Android App**: Local-only native app shell powered by Capacitor 8.5, compiled with Java 21 and Gradle, targeting Android 16 (SDK 36). Operates with zero dangerous permissions, system document picker, and zero network telemetry.
- **Native iOS App**: Local-only native app shell powered by Capacitor iOS with zero network telemetry or cloud reliance.
- **Chrome Extension (Manifest V3)**: Extension popup and standalone reader for reading selection, extracted page text, or pasted text with localized manifests (`_locales/`).

## What works

- **Android R1 Platform**: Capacitor 8.5 integration targeting SDK 36 (Java 21, Gradle, APK/AAB build targets). Features native system document picker import, back button & gesture navigation handling, native-safe backup export (Capacitor Share), offline sandboxed local storage, `allowBackup="false"` cloud backup exclusion, and cleartext traffic blocking with zero dangerous runtime permissions.
- **Trilingual UI & Localization**: Pre-rendered HTML body copy and route authority (`/`, `/ru/`, `/es/`), single-language legal policy pages (`privacy.html`, `support.html`, `acknowledgements.html`), localized Chrome Extension manifests (`_locales/`), localized PWA manifests, and key/placeholder parity across English (`en`), Russian (`ru`), and neutral international Spanish (`es`).
- **RSVP Engine**: One- or two-word RSVP with ORP (Optimal Recognition Point) focus, punctuation timing, explicit WPM control, 10-word rewind, exact scrubber, and anchored context on pause.
- **Local Library & Storage**: Local library, bookmarks, exact reading position, search, table of contents, backup/restore, light/dark themes, and offline PWA reopening.
- **Guided Demo**: Interactive 45-second demo available in all three supported languages teaching play, pause, rewind, scrub, and book import.
- **Native Mobile Shells (iOS & Android)**: Local-only reader shells with local books, native language matching, system file pickers, and offline performance without analytics or cloud tracking.
- **Chrome Extension**: Manifest V3 extension reading selected text, page text, or explicit paste in its own localized reader interface.
- **Optional Web Article Importer**: Strict HTTP(S) article URL importer with DNS pinning, redirect restrictions, content-type checks, size limits, and global-unicast SSRF protections (web surface only).

HummingRead controls presentation pace; it does not promise a particular improvement in comprehension or reading speed.

## Privacy boundaries and offline local-only guarantees

HummingRead operates under strict offline local-only privacy guarantees:

| Surface | Behavior |
| --- | --- |
| Web/PWA books and pasted text | Stored entirely locally in browser storage (IndexedDB/localStorage); no account required, no tracking, and no cloud sync. Core reading functions 100% offline. |
| Web article import | Sends the entered public URL to the first-party extraction service. The service fetches transiently, stores no article/library record, disables article access logging in the prepared nginx policy, and expires raw-IP abuse buckets after the hard limit. |
| Native Android | 100% local-only; article URL importer is absent, core reading operates fully offline in internal sandbox storage (`/data/data/team.ibet.paceflow`) with zero dangerous runtime permissions, `allowBackup="false"`, cleartext disabled, and no analytics or background data collection. |
| Native iOS | 100% local-only; article URL importer is absent, core reading operates fully offline with no analytics or background data collection. |
| Chrome standalone reader | Selection/page/paste text and reading progress remain strictly in local extension storage; zero background content transmission. |
| Chrome Quick Send | Sends the chosen payload only after the user presses the labelled secondary action; pending session data expires within ten minutes. |

See `privacy.html`, `docs/PRIVACY_POLICY.md`, `docs/GOOGLE_PLAY_COPY.md`, and `docs/DEPLOYMENT_RUNBOOK.md` for the exact policy and deployment match.

## Project Setup & Development

Prerequisites: Node.js 22+, JDK 21, and Android SDK (API 36 build-tools & platform-tools) for Android builds.

```sh
npm ci
npm start
```

The server defaults to `127.0.0.1:8081`. Override `HOST` and `PORT` only in a controlled environment; production remains loopback behind nginx.

## Build commands

- `npm run build:all`: Build web, extension, and native assets (iOS & Android).
- `npm run build:web`: Build the Web/PWA distribution in `dist/`.
- `npm run build:native`: Build web assets and sync Capacitor iOS and Android projects.
- `npm run build:extension`: Build the Manifest V3 Chrome extension package.

```sh
npm run build:all
npm run build:web
npm run build:native
npm run build:extension
```

### Android Gradle Build Commands

```sh
# Build Debug APK
cd android && ./gradlew assembleDebug

# Build Release AAB (Google Play bundle)
cd android && ./gradlew bundleRelease
```

The Debug APK output is located at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Testing and verification commands

- `npm run test:unit`: Run unit test suite (includes Android data & emulator unit tests).
- `npm run test:extension`: Run end-to-end Chrome extension tests.
- `npm run test:production`: Run Playwright regression test suite.
- `npm run verify:android`: Verify Android package configuration, target SDK 36, Java 21, and zero dangerous permissions.
- `npm run verify:all`: Execute complete verification suite across brand, notices, web/native packages, android, extension, precache, deployment, determinism, and store copy.

```sh
npm run test:unit
npm run test:extension
npm run test:production
npm run test:cross-browser
npm run test:visual
npm run verify:android
npm run verify:all
```

`npm run build:web` creates `dist/` and the deterministic tester archive at `dist/downloads/hummingread-tester.zip`. The ZIP injects exactly the centrally configured preview origin; the tracked extension source has no host permission. Until Chrome Web Store review, it is a tester build to install unpacked—not a consumer-store download.

Production configuration is centralized in `product.config.json`. Preview builds intentionally allow the documented `sslip.io` and `example.invalid` owner gates. This command must fail until final domain/store URLs and owner approval are recorded:

```sh
HUMMINGREAD_RELEASE_MODE=production npm run verify:brand
```

## Emulator QA Instructions

To test the Android R1 native app build in an Android API 36 emulator:

1. **Ensure Prerequisites**: Android SDK Platform 36, Build-Tools 36.0.0, Java 21 (OpenJDK 21), and an x86_64 API 36 AVD image are installed.
2. **Start Emulator**:
   ```sh
   emulator -avd <avd_name> -no-window -no-audio &
   adb wait-for-device
   ```
3. **Build & Install Debug APK**:
   ```sh
   npm run build:native
   cd android && ./gradlew assembleDebug
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```
4. **Launch Application**:
   ```sh
   adb shell am start -n team.ibet.paceflow/team.ibet.paceflow.MainActivity
   ```
5. **QA Verification Checklist**:
   - **Launch & UI**: Verify clean cold boot and warm resume in English, Russian, and Spanish.
   - **Navigation**: Test gesture and hardware back button behavior (closing modals/search before minimizing app at root).
   - **Document Import**: Trigger document picker; import synthetic EPUB, FB2, DOCX, TXT, HTML, Markdown, and RTF files without storage permission prompts.
   - **RSVP Playback**: Test ORP display, WPM adjustment, pause/resume context, 10-word rewind, and scrubber.
   - **Backup & Export**: Trigger native safe export via Capacitor Share and verify complete re-importability.
   - **Offline Air-Gap**: Ensure zero network calls occur and local library state persists across app recreations and restarts.

## Source-control and deployment safety

Work on a review branch, keep the production `main` checkout untouched, and never serve the repository root. The prepared unit runs direct Node as locked user `paceflow` on loopback; nginx exposes only `dist/`, keeps `/api/sync` at 404, makes `/api/article` POST-only/rate-limited/unlogged/no-store, and denies repository, data, native, test, dependency, and book paths.

Deployment is not automatic. The current tester preview was activated through `docs/DEPLOYMENT_RUNBOOK.md`; subsequent releases use the same versioned backup, activation, smoke-test, and rollback path without `git reset --hard`.

## Key artifacts

- Brand decision and visual rules: `docs/BRAND_DECISION.md`, `docs/BRAND_SYSTEM.md`
- Editable artwork and provenance: `assets/brand/`, `docs/ASSET_PROVENANCE.md`
- Chrome source and store notes: `chrome-extension/`, `docs/CHROME_EXTENSION.md`
- iOS store copy and owner gates: `docs/APP_STORE_COPY.md`, `docs/APP_STORE_CHECKLIST.md`
- Google Play Store copy & Data Safety draft: `docs/GOOGLE_PLAY_COPY.md`
- Android package & privacy verifiers: `scripts/verify-android-package.mjs`, `scripts/verify-android-privacy.mjs`
- Website, unpacked Chrome, iOS, and Android tester workflow: `docs/TESTER_GUIDE.md`
- Licenses: `docs/THIRD_PARTY_NOTICES.md`, `acknowledgements.html`
- Final local test counts, checksums, and external gates: `docs/RELEASE_EVIDENCE.md`
- Baseline and reconciliation: `docs/MISSION_BASELINE.md`, `docs/INTEGRATION_LEDGER.md`
