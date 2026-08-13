# HummingRead Android Architecture (R3 Truthful Server Proof Release)

HummingRead R3 Android Architecture builds upon the verified HummingRead R2 Android Architecture baseline.

## 1. System Overview

HummingRead Android is a calm, local-first RSVP (Rapid Serial Visual Presentation) speed reader for Android devices (targeting API Level 36, Android 16). The Android application shell is built on Capacitor 8.5.0 (`@capacitor/android@8.5.0` pinned), compiled with Java 21 OpenJDK and Android Gradle Plugin (AGP) 8.5.0. Historical R2 artifacts remain at `artifacts/android-r2/`. R3 release binaries and evidence packages are stored at `artifacts/android-r3/`.

```
+-----------------------------------------------------------------------------------+
|                        HummingRead R3 Android Architecture                       |
+-----------------------------------------------------------------------------------+

                         +-----------------------------------+
                         |   Toolchain Doctor Diagnostic     |
                         |   (scripts/toolchain-doctor.mjs)  |
                         +-----------------+-----------------+
                                           |
                 +-------------------------+-------------------------+
                 |                                                   |
                 v                                                   v
+----------------------------------+               +----------------------------------+
| Dynamic Subpath Web/PWA Engine   |               | Native Android Shell (Capacitor) |
| (Base-aware / and /rsvp/ support)|               | (Target SDK 36, AGP 8.5, Java 21)|
+----------------+-----------------+               +----------------+-----------------+
                 |                                                   |
                 v                                                   v
+----------------------------------+               +----------------------------------+
| Fail-Closed Verifier Pipeline    |               | Real API 36 Emulator QA Suite    |
| (18 Negative Tests, verify-all)  |               | (Phone & Tablet AVDs + SAF UI)   |
+----------------+-----------------+               +----------------+-----------------+
                 |                                                   |
                 +-------------------------+-------------------------+
                                           |
                                           v
                         +-----------------------------------+
                         |  Durably Stored Server Artifacts  |
                         |  (artifacts/android-r3/APK & AAB) |
                         +-----------------------------------+
```

---

## 2. Product Identity & Review Packaging Gate

- **Application ID (Review)**: `team.ibet.paceflow`
- **Proposed Application ID**: `team.ibet.hummingread`
- **Upload Approval Gate**: `applicationIdApproved: false` in `product.config.json`.
- **Version Pinning**: `versionCode` 200, `versionName` "2.0.0".
- **Capacitor Android Pinning**: `@capacitor/android` is pinned strictly to `8.5.0` in `package.json` and `package-lock.json`.
- **Build Packaging Policy**: Review builds enforce `applicationIdApproved: false` to prevent accidental production store uploads until owner registration.

---

## 3. Privacy, Permissions & Security Hardening

- **Zero Dangerous Runtime Permissions**: `AndroidManifest.xml` declares zero dangerous permissions (no camera, contacts, microphone, external storage, or location permissions).
- **Offline Local Storage Security**: Android manifest enforces `android:allowBackup="false"` to prevent unencrypted cloud backups of user reading material.
- **Cleartext Restrictions**: Enforces `android:usesCleartextTraffic="false"` across all Android webview instances.
- **Restricted FileProvider Scope**: `res/xml/file_paths.xml` restricts FileProvider strictly to the app-private cache directory: `<cache-path name="backup_share" path="backups/" />`. Broad external paths (`<external-path path="." />`) are omitted.
- **Post-Share Cleanup**: Temporary JSON export files created for Capacitor Share in `cache/backups/` are automatically deleted in a `finally` block post-share.

---

## 4. Native Multi-Locale Legal Page Architecture

- **Native Asset Localized Bundling**: `scripts/build-native.mjs` generates localized legal wrapper pages in `dist-native/android`:
  - English: `privacy.html`, `support.html`, `acknowledgements.html`
  - Russian: `ru/privacy.html`, `ru/support.html`, `ru/acknowledgements.html`
  - Spanish: `es/privacy.html`, `es/support.html`, `es/acknowledgements.html`
- **Single-Language Article Filtering**: Each localized legal file contains exactly ONE localized `<article lang="...">` block matching its locale folder, ensuring clean single-language presentation offline.
- **Dynamic Legal Link Navigation**: Toggling active UI language in native Settings dynamically routes legal link buttons to matching localized offline pages inside WebView.

---

## 5. SAF Document Import & Format Processing

- **Storage Access Framework (SAF)**: Native document import uses `OPEN_DOCUMENT` intent, reading file streams securely via `content://` URIs.
- **7 Supported Document Formats**:
  1. `.epub` (EPUB 2 / 3 parser)
  2. `.fb2` / `.fb2.zip` (FB2 FictionBook parser)
  3. `.docx` (Office Open XML document parser)
  4. `.txt` (Plain text with encoding detection)
  5. `.html` / `.htm` (DOM HTML reader)
  6. `.md` / `.markdown` (Markdown parser)
  7. `.rtf` (Rich Text Format parser)
- **100MB Import Limit**: Enforces a strict 100MB maximum source file size to guarantee zero UI thread locking or out-of-memory exceptions during parsing.

---

## 6. Real API 36 Phone & Tablet Emulator QA Suite

Automated smoke tests run on real Android API 36 emulators:
- **Phone AVD**: `test_avd_api36` (6.7" portrait/landscape viewport)
- **Tablet AVD**: `test_tablet_api36` (10.1" wide landscape viewport)

Workflows tested:
1. Cold launch & initial view rendering (< 3s launch)
2. Interactive 45-second demo in EN, RU, ES
3. Multi-locale UI switching and native legal page navigation
4. Multi-format SAF document import suite
5. Device rotation and viewport responsiveness
6. System Back gesture hierarchy and navigation recoil
7. App minimization, backgrounding, and process kill survival
8. Data reset ("Delete All Data") & Airplane mode 100% offline functionality

---

## 7. Visual QA Matrix & Touch Target Accessibility Gate

- **Truthful Screenshot Matrix**: Captured across Phone and Tablet AVDs in EN, RU, ES across key app views.
- **Sidecar JSON Metadata Manifests**: Every `.png` screenshot artifact is paired with a `<filename>.png.json` manifest containing `gitCommitSha`, `apkSha256`, `avdName`, `locale`, `viewportDimensions`, and `appState`.
- **Automated Black/Blank Frame Filter**: Entropy/variance audit detects and rejects uniform black or blank frames.
- **44x44 CSS px Accessibility Gate**: All visible interactive controls must meet a minimum 44x44 CSS px (48x48 dp native) touch target threshold and contain ARIA labels or `contentDescription` attributes.

---

## 8. Server Artifacts & Reproducible Release Package

Compiled binaries and machine-readable evidence summaries are durably stored under `artifacts/android-r2/`:
- `HummingRead-R2-debug.apk`: Debug tester APK (API Level 36)
- `HummingRead-R2-review-UNSIGNED-NOT-FOR-UPLOAD.aab`: Unsigned review AAB candidate
- `checksums.sha256`: SHA-256 hash manifest
- `evidence-summary.json`: Comprehensive evidence package containing commit SHAs, toolchain details, test outputs, and assertion statuses.
