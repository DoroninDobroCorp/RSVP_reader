# HummingRead R2 release evidence — 2026-08-13

This packet records the final server and environment checks for the HummingRead Android R2 Audit Corrections Release and tester release.

## Android R2 Audit Corrections Evidence (2026-08-13)

- **Toolchain Doctor Diagnostic (`scripts/toolchain-doctor.mjs`)**: Verified OpenJDK 21 (`JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`), Android SDK 36 (`ANDROID_HOME=/opt/homebrew/share/android-commandlinetools`), `adb` v36.0.2, `emulator` v36.3.10, `aapt2`, `avdmanager`, and `./gradlew` execution.
- **Fail-Closed Verifiers & Negative Self-Tests (`verify-all.mjs`)**: Enforced strict fail-closed execution without warning fallbacks. Negative self-tests confirmed that simulated missing tools or corrupted APKs fail fast with non-zero exit codes (`VAL-R2-VERIFY-001..006`).
- **Base-Aware PWA Subpath Deployment**: Dynamic base URL helper `getAppBaseUrl()` resolves root `/` and subpath `/rsvp/` cleanly without duplicated slashes or 404 asset errors. Service worker registers with scope `${getAppBaseUrl()}/` and uses scope-relative APP_SHELL precache assets (`VAL-R2-PWA-001..006`).
- **Native Multi-Locale Legal Pages**: Native assets in `dist-native/android` contain localized legal pages (`privacy.html`, `ru/privacy.html`, `es/privacy.html`). Changing app locale in native Settings navigates to localized legal pages offline (`VAL-R2-LEGAL-001..006`).
- **Hermetic & Built-Output Test Suites**: `npm run test:unit` runs 100% hermetically without network or SDK dependencies. `npm run test:web-built` tests static HTML output under root `/` and subpath `/rsvp/` (`VAL-R2-TEST-001..006`).
- **Chrome 3-Locale Extension E2E**: Chrome extension E2E runner tested unpacked MV3 extension across 3 isolated browser profiles (`--lang=en-US`, `--lang=ru-RU`, `--lang=es-ES`) verifying localized popups, context menus, and error messages (`VAL-R2-EXT-001..006`).
- **Android Security & Permission Hardening**: Verified `android:allowBackup="false"`, `android:usesCleartextTraffic="false"`, zero dangerous runtime permissions, and FileProvider scope restricted to app-private cache `<cache-path name="backup_share" path="backups/" />` (`VAL-R2-PRIV-001..006`).
- **Real Phone & Tablet API 36 Emulator QA**: Automated QA suite executed on real API 36 Phone AVD (`test_avd_api36`) and Tablet AVD (`test_tablet_api36`). Verified cold launch (<3s), guided demo in EN/RU/ES, SAF document picker import (7 formats: EPUB, FB2, DOCX, TXT, HTML, MD, RTF), screen rotation, Back gesture, app minimize, process kill survival, Delete All, and Airplane mode offline functionality (`VAL-R2-EMU-001..008`).
- **Truthful Visual Screenshot Matrix & 44px Touch Target Gate**: Captured true visual screenshot matrix with sidecar metadata JSON manifests (`<filename>.png.json`). Verified zero black/blank frames and 100% 44x44 CSS px touch target & ARIA label accessibility compliance (`VAL-R2-SCREEN-001..006`).
- **Git Push Verification**: Verified local branch commit SHA matches remote `origin/mission/android-r2-audit-corrections-20260813` HEAD SHA (`VAL-R2-ARTIFACT-006`).

## Durably Stored Server Release Artifacts (artifacts/android-r2/)

- **Debug Tester APK**: `artifacts/android-r2/HummingRead-R2-debug.apk`
- **Unsigned Review AAB**: `artifacts/android-r2/HummingRead-R2-review-UNSIGNED-NOT-FOR-UPLOAD.aab`
- **SHA-256 Checksums**: `artifacts/android-r2/checksums.sha256`
- **Evidence Summary**: `artifacts/android-r2/evidence-summary.json`

## Review artifact checksums

| Artifact | Location | SHA-256 |
| --- | --- | --- |
| Debug Tester APK | `artifacts/android-r2/HummingRead-R2-debug.apk` | `20d15323067e20832eb23977a308e414cd1f06f08d68794b2d6887fc5ba9cbc3` |
| Unsigned Review AAB | `artifacts/android-r2/HummingRead-R2-review-UNSIGNED-NOT-FOR-UPLOAD.aab` | `62b142739410434c1afcecbf599bfa845693c0fdd33652f489b34297d4341338` |
| Tester Chrome ZIP | `dist/downloads/hummingread-tester.zip` | `4587cd6460dda213fee0853eb285f938b18dbc10092a1bfa5efd1042855a1ac9` |
| Third Party Notices | `THIRD_PARTY_NOTICES.txt` | `f784a31085afd12657b8226ecbf1f199096c6a222eb6003bb3dc733e3c78938a` |

## Automated evidence

- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm run test:isolation`: 1/1 passed while an unrelated process occupied port
  8081; the Playwright suite connected only to its owned marked server on 43181.
- `npm run test:unit`: 25/25 passed, including locale detection/fallback, Intl.PluralRules (EN, RU, ES), safe string interpolation, key/placeholder parity, and UI counter pluralization.
- `npm run test:production`: 200/200 passed with one worker across Chromium,
  desktop WebKit, and Mobile Safari; `test-results/.last-run.json` recorded
  `status: passed` with no failed tests.
- `npm run test:extension`: passed in real Chromium with an unpacked MV3 build,
  covering local selection/page extraction, standalone RSVP controls,
  persistence, keyboard/focus, protected-page error, explicit Quick Send, and
  zero automatic transmission of sentinel content.
- `npm run test:visual`: passed the fresh/returning/native/focus matrix. The
  568×320 regression now asserts that the scrubber and all three progress stats
  end above the bottom `Continue` control; the corrected screenshot was manually
  inspected.
- `npm run test:lighthouse`: on the deterministic final-channel SEO render,
  Performance 95, Accessibility 100, Best Practices 100, SEO 100 with
  Lighthouse 13.4.1. The actual tester-preview remains intentionally
  `noindex,nofollow,noarchive`, has `robots.txt` `Disallow: /`, no canonical or
  JSON-LD, and no sitemap; package verification checks that separate contract.
- `npm run cap:sync`: passed and copied only the filtered `dist-native` tree.
  Five Capacitor plugins include pinned Keep Awake 8.0.1. iOS `CFBundleLocalizations` includes `en`, `ru`, and `es`.
- Xcode 26.3 resolved the pinned Swift packages, completed an unsigned Release
  build, and completed Analyze. The Release app launched on iOS 18.5 iPhone 16
  Pro and 13-inch iPad Pro simulators.
- Real Simulator interaction covered the guided demo, pause/continue, portrait
  and landscape, background/resume, and the native document picker. The picker
  now opens Files directly instead of offering irrelevant camera/photo sources;
  package verification prevents the wildcard media type from returning.
- `npm run verify:all`: brand, complete notices, web/native package separation,
  extension, service-worker, deployment, deterministic-build, and store-copy character limits gates passed.
  The deterministic web/extension output contains 49 files with tree SHA-256
  `56a75bb3ebafd02ebcfd009f0bb616b6632edff112cddf8665a8d719bc6332c3`.
- Deployment verification rendered both observed live nginx files without
  modifying them, preserved unrelated locations, passed a real `nginx -t`, and
  executed rollback against an isolated fixture. The fixture restored the old
  public build, exact `rsvp-reader.service`, both nginx files, previous release
  symlink, and private legacy store while preserving the failed build.
- `git diff --check`, Node syntax checks, private-file filename scan, and the
  production dependency audit passed.

## Durable review artifacts on the server

- Server Android R2 Artifacts: `/srv/RSVP_reader-r2/artifacts/android-r2/`
- Visual matrix: `/srv/RSVP_reader-r2/artifacts/visual/`
- Extension screenshots: `/srv/RSVP_reader-r2/artifacts/r2-extension-final/`
- Lighthouse full report: `/srv/RSVP_reader-r2/artifacts/lighthouse-mobile.json`
- Lighthouse summary: `/srv/RSVP_reader-r2/artifacts/lighthouse-summary.json`
- Playwright final status: `/srv/RSVP_reader-r2/test-results/.last-run.json`

These ignored QA outputs are not part of the public package. CI uploads its own
web/extension/visual/Lighthouse and unsigned-iOS evidence artifacts.

## CI, deployment, and owner gates

The complete Linux/browser gate and the macOS Xcode gate were executed directly
because GitHub-hosted jobs were unavailable for the account. GitHub Actions is
optional replication, not the source of this evidence and not required to test
the delivered artifacts.

The tester preview is deployed from an immutable release behind
`/srv/hummingread/current`; nginx exposes only the built public tree and the
guarded article endpoint. Positive/negative smoke checks cover public pages,
method restrictions, SSRF rejection, security headers, and denial of repository,
dependency, data, native, and test paths. Fresh root-only backups and the prior
production checkout remain rollback anchors as documented in
`DEPLOYMENT_RUNBOOK.md`.

External iOS distribution still requires the owner to choose the registered
bundle identifier and Apple Developer Team, sign an Archive, upload it to App
Store Connect, and invite testers through TestFlight. Chrome Web Store listing
likewise requires its developer account and review. These account gates do not
block testing the live website or unpacked Chrome ZIP.

