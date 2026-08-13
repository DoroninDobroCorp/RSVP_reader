# HummingRead Android R2: evidence repair, reproducible server build, and real tester handoff

This is an executable correction mission, not a planning exercise. Read this file completely before editing implementation. Continue autonomously through fixes, clean builds, owned emulator/device-equivalent QA, truthful evidence, commits, and the final branch push.

The inherited Android R1 implementation contains useful code, but its completion report is not accepted. Independent audit found false push claims, non-reproducible server setup, false-positive verifiers, mislabeled screenshots, missing artifacts, and incomplete native behavior. Preserve the useful implementation; repair the product and the proof.

## 1. Exact branch, baseline, and workspace

Work only on the remote server checkout:

`/srv/RSVP_reader-r2`

Work only on branch:

`mission/android-r2-audit-corrections-20260813`

The inherited implementation baseline is:

`c7e9133fb3eeeec2f73facffcc00f20ac63922f7`

The branch also contains this mission commit. Do not recreate it from `main`, do not work in `/srv/RSVP_reader`, and do not use a Mac checkout as the authoritative build environment.

At the start, record and include in the final evidence:

- `pwd`;
- `git status --short --branch`;
- `git rev-parse HEAD`;
- `git log -25 --oneline --decorate`;
- `git remote -v`;
- `git worktree list`;
- `git ls-remote --heads origin mission/android-r2-audit-corrections-20260813`;
- OS, CPU, RAM, disk, KVM ownership, user/group membership;
- Node/npm, Java, Android SDK, build-tools, platform-tools, emulator, Gradle wrapper, and installed system-image versions.

The server audit at mission creation showed:

- `/dev/kvm` exists;
- Java is absent;
- `adb` is absent;
- no Android SDK is installed;
- the server user is not in the `kvm` group;
- `sudo -n` is available for narrow setup;
- the R1 QA script is hard-coded to `/opt/homebrew/...`, which is a Mac-only path.

Install the required free/open toolchain on this server from official Ubuntu/OpenJDK/Google Android sources. Use a stable server path such as `/opt/android-sdk` and a tracked environment helper that discovers or validates paths without embedding a personal home directory. Do not pipe downloaded scripts into a shell. Record package provenance and SDK component versions. Add the server user to KVM access only if necessary and verify acceleration actually works.

## 2. Source-control, production, cost, and owner boundaries

Never:

- modify, deploy, restart, or reload production, nginx, systemd, DNS, or `/srv/RSVP_reader`;
- merge to `main`, `integration/**`, or `release/**`;
- create a pull request;
- trigger, add, or rely on GitHub-hosted Actions;
- use paid GitHub features, Appflow, cloud device farms, Firebase Test Lab billing, or another paid service;
- upload to Google Play, App Store, or Chrome Web Store;
- create or use a production signing key;
- enter account, tax, banking, identity, or agreement data;
- commit APK/AAB files, SDKs, emulator images, Gradle caches, debug keystores, secrets, private books, or raw private logs;
- force-push, rewrite inherited commits, use `git reset --hard`, or broadly delete caches/data.

The `mission/**` branch prefix is intentionally outside current GitHub Actions push patterns. Run all gates on the server and make one ordinary final push to this branch. Verify the exact remote SHA after pushing.

Store generated tester artifacts outside Git but durably on the server under:

`/srv/RSVP_reader-r2/artifacts/android-r2/`

The final handoff must make the debug APK downloadable by the owner via SSH/SCP and give its exact path, size, version, application ID, signing status, and SHA-256. Do not claim an artifact exists if it exists only on another computer.

## 3. Independent audit findings that must be treated as failing tests

Do not mark these optional. Add regression gates first where practical, then fix them.

### AUDIT-R2-P0-001 — the R1 push claim was false again

The R1 report claimed local and remote SHA `c7e9133...` matched. Independent `git fetch` and `git ls-remote` showed the remote R1 branch still at:

`dfc5565f3aca72bb7410addbbae00b2c8811be52`

while the server checkout was 16 commits ahead at `c7e9133...`. The report also listed several commit IDs that do not match the actual repository history (for example, it reported Android evidence commit `4703417`, while the actual commit is `17795cf`).

This R2 branch preserves all 16 commits. At completion:

- `git rev-parse HEAD` must equal the SHA returned by `git ls-remote origin refs/heads/mission/android-r2-audit-corrections-20260813`;
- the tracked working tree must be clean;
- show the exact push output and both full SHAs;
- never infer remote state from the local tracking label alone.

### AUDIT-R2-P0-002 — `validation-state.json` and “80/80” do not exist

The report claims a generated `validation-state.json` with 80/80 assertions. No such file exists in the repository, ignored output, or evidence directories. The only machine-readable Android summary is `evidence/android/evidence-summary.json`, which contains eight string statuses, not 80 assertions.

Acceptance:

- remove every unsupported 80/80, 30/30, and validation-state claim;
- either do not create a validation-state file, or create it only through a tracked generator that consumes actual current-run result files and fails closed;
- every counted assertion must map to a named test with a meaningful failing condition;
- the generated state must contain commit SHA, dirty-state flag, environment, command, start/end timestamps, exit code, and artifact hashes;
- evidence from a different SHA or dirty tree is stale and must fail validation.

### AUDIT-R2-P0-003 — Android work is not reproducible on the required server

On the authoritative server:

- `java` is not found;
- `adb` is not found;
- `./gradlew ...` exits because `JAVA_HOME`/Java is absent;
- no APK or AAB exists under the server checkout or its artifacts directory;
- `scripts/run-android-qa-suite.mjs` hard-codes Homebrew JDK and SDK paths from a Mac.

Acceptance:

- install the official server toolchain;
- remove all `/Users/...`, `/opt/homebrew/...`, personal machine paths, and assumed global tools from tracked scripts/evidence;
- use `JAVA_HOME`, `ANDROID_SDK_ROOT`, and tool discovery validated by a preflight command;
- from a fresh temporary clone of the final SHA on the server, `npm ci`, web/native builds, Gradle unit/lint/build, APK inspection, and emulator gates must run without copying untracked state from the working checkout;
- document one exact bootstrap and one exact clean verification command.

### AUDIT-R2-P0-004 — pure unit testing is not a clean or truthful gate

Independent checks found:

- `npm run test:unit` on the existing checkout produced 53 pass / 14 fail because tests read stale/missing ignored `dist` output and attempted to call missing `adb`;
- from a fresh clone after `npm ci && npm run build:web`, it produced 66 pass / 1 fail because `tests/unit/android-emulator-smoke.test.js` is not a unit test and unconditionally shells out to `adb`;
- the report claimed `npm run test:unit -> 67/67 PASSED` without preserving the prerequisite/environment contract.

Acceptance:

- `npm run test:unit` is hermetic: it passes from a fresh clone after `npm ci`, does not require `dist`, Java, SDK, ADB, an emulator, network, or committed evidence;
- built-output tests use a separate command that deterministically creates a temporary or current build first;
- Android emulator/instrumentation tests use a separate explicit command and fail clearly when prerequisites are absent;
- no test silently consumes stale `dist`, APK, screenshots, or evidence;
- the final report lists each distinct command and count rather than adding incompatible suites into an invented total.

### AUDIT-R2-P0-005 — Android verifiers fail open

`npm run verify:all` returned success on the server even though neither `aapt2` nor an APK existed. Specific defects:

- `verify-android-privacy.mjs` catches missing `aapt2` and degrades to a warning;
- its DEX command uses a shell pipeline where `unzip` can fail on a nonexistent APK while `strings` exits successfully, producing an empty scan that is reported as “100% free”;
- `run-android-qa-suite.mjs` invokes lint, aapt2, badging, and build-log commands with `allowFail: true`, then records the enclosing assertion as PASSED;
- `tests/android-emulator-smoke.spec.js` skips running QA whenever a pre-existing summary file exists;
- the evidence test trusts string values from committed JSON without proving freshness, current APK hash, installed package hash, device identity, or current SHA.

Acceptance:

- release/package/privacy/QA commands fail closed on missing tools, missing artifacts, nonzero exit status, malformed output, stale SHA, or mismatched APK hash;
- never use shell pipelines to infer success unless `pipefail` and each producer status are enforced; prefer direct process APIs with argument arrays;
- no `allowFail` on a mandatory gate;
- a warning cannot be followed by “ALL ... PASSED” for the same missing check;
- QA always installs the APK built from the current clean SHA and verifies package/version/hash before testing;
- committed evidence is never a substitute for rerunning a gate;
- add negative self-tests that intentionally remove/rename `adb`, `aapt2`, APK, lint result, and evidence, and prove the verifier exits nonzero;
- add stale-evidence and altered-APK negative tests.

### AUDIT-R2-P0-006 — screenshots and workflow evidence are mislabeled and unusable

Manual inspection and SHA comparison found:

- `phone_390x844_es_library.png` shows the Android Share Sheet, not the library;
- `phone_390x844_es_reader.png` is effectively a black screen;
- `phone_390x844_es_legal.png` shows the English Privacy Policy, not Spanish;
- several workflow stages are byte-identical despite claiming different app states;
- `step_1_demo_loaded.png` shows the Share Sheet rather than a demo;
- `step_3_rsvp_playing.png` is black;
- `scripts/run-android-qa-suite.mjs` never generates any `*_legal.png` files, yet such files were committed and claimed as products of the suite;
- the matrix changes `wm size` on one device; that is not proof of distinct phone/tablet profiles or real rotation lifecycle.

Acceptance:

- delete all invalid Android screenshots/evidence and regenerate from the final SHA;
- each screenshot has a sidecar manifest entry with SHA, current commit, APK SHA, package version, AVD name, API, ABI, density, physical/override size, orientation, locale, font scale, theme, state assertion, capture command, and timestamp;
- before capture, programmatically assert the intended visible state and absence of system overlays; after capture, assert nonblank image entropy and expected dimensions;
- the screenshot generator itself must create every documented filename;
- detect exact duplicate images across states/locales and fail unless explicitly allowlisted with a human explanation;
- visually inspect all final screenshots and update `docs/VISUAL_QA.md` with the actual matrix;
- use at least one real phone AVD profile and one real tablet AVD profile; exercise actual portrait/landscape rotation, not only `wm size`;
- do not capture or commit share sheets containing owner accounts/app suggestions; redact nothing by hiding a failed state—use a sterile emulator profile and capture only what the mission requires.

### AUDIT-R2-P0-007 — the accessibility gate reports failure data as PASSED

The committed `accessibility-audit.json` says:

- `totalControls: 72`;
- `validControls: 10`;
- many controls have zero dimensions because hidden and visible controls are mixed indiscriminately.

The QA script performs no assertion against these numbers and prints PASS. It also uses a 32×32 threshold while project UI requirements use 44 CSS px for touch actions.

Acceptance:

- evaluate only visible, enabled interactive controls in each explicit UI state;
- distinguish intentionally hidden file inputs from user-operable controls;
- require an accessible name, valid role/state, focusability, and a 44×44 CSS-pixel target (or documented inline-link exception);
- fail on every visible invalid control and report selector/state/locale/viewport;
- run accessibility checks across representative EN/RU/ES home, settings, library, normal reader, focus, dialogs, and legal/support states;
- include Android Accessibility Scanner-equivalent semantic checks where feasible, but do not claim such a tool ran unless it did;
- `validControls` must equal the applicable visible-control total for a PASS.

### AUDIT-R2-P0-008 — emulator QA bypasses real user and platform behavior

The current runner mostly invokes internal JavaScript methods through WebView CDP. It does not prove the native surfaces required by the original mission. Examples:

- export is marked successful whenever `exportLibrary()` resolves, but the function catches its own errors and resolves after showing a toast;
- no share target receives the backup and verifies exact JSON bytes;
- no exported backup is re-imported;
- no Android document picker is operated to import EPUB/FB2/FB2.ZIP/DOCX/TXT/HTML/Markdown/RTF;
- no `adb install -r` upgrade path, force-stop/process kill, app data migration, uninstall boundary, rotation lifecycle, Back gesture sequence, Delete All, Airplane Mode, or app relaunch state proof exists;
- the default generated instrumentation test only checks the package context;
- source-string tests for Back/Haptics/KeepAwake are not runtime platform verification.

Acceptance requires real UI/platform exercises on the installed current APK:

1. Clean install and launch from launcher.
2. First-run demo via visible taps; play, pause, context, rewind, scrub, final-word stop.
3. EN/RU/ES switch through Settings with visible localized assertions.
4. Import real synthetic fixtures through the Android system document picker for every supported format; verify parsed title/text/TOC where applicable.
5. Save, bookmark, search, close/force-stop, relaunch, and verify exact state.
6. Rotate while input, normal reading, focus paused/playing, settings, and picker transitions are active.
7. Exercise Android Back from modal -> search -> focus -> normal reader -> library -> minimize boundary.
8. Export through the actual share surface to a controlled local test receiver or document destination, hash/parse the received JSON, then re-import it and verify books/settings/bookmarks/positions.
9. Delete All and inspect WebView/Preferences/Filesystem/app-private state for absence; relaunch and prove nothing resurrects.
10. Build an earlier fixture version, install it with data, then `adb install -r` the current APK and verify non-destructive migration.
11. Run offline/Airplane Mode and block networking while all core flows work.
12. Exercise background/resume and force-stop during pending saves; prove atomic recovery.
13. Verify KeepAwake while playing and release on pause/background using platform-observable state.
14. Verify haptic calls through a test hook/instrumentation boundary without claiming perceptual hardware vibration on an emulator.
15. Run at least one meaningful `connectedAndroidTest`/instrumentation suite; replace generated example tests.

Automation may use Appium/UIAutomator/Espresso/CDP where appropriate, but it must drive public UI/platform surfaces for end-to-end claims. Internal method calls can supplement, not replace, user-flow testing.

### AUDIT-R2-P0-009 — Android native legal pages are English-only

`build-native.mjs` deletes `ru/` and `es/`. The native footer/settings links resolve to root `privacy.html`, `support.html`, and `acknowledgements.html`. The audited screenshot named Spanish legal displays the English Privacy Policy. Some Russian/Spanish replacement code in `build-native.mjs` is dead because localized articles were already removed by the web build.

Acceptance:

- Android users selecting EN/RU/ES must see the matching native privacy, support, and acknowledgements wrapper text;
- exactly one language body is visible at a time;
- navigation remains inside the native app and Back returns predictably;
- no web-only article-import/IP/server wording leaks into native;
- licenses remain verbatim where translation is inappropriate;
- native legal links and locale selection are real emulator-tested in all three languages;
- apply the same correction to iOS native packaging without regressing its existing behavior.

### AUDIT-R2-P0-010 — the new PWA paths break the actual `/rsvp/` deployment model

The implementation changed previously relative paths to origin-root absolute paths:

- service-worker `APP_SHELL` requests `/style.css`, `/assets/...`, `/ru/...`, etc.;
- localized manifests use `id: "/"`, `start_url: "/"` or `/ru/`/`/es/`, and origin-root icon URLs;
- the hero image is forcibly rewritten to `/assets/brand/pico-hero-640.webp`;
- tests explicitly require these leading-root paths;
- production preview currently lives under `/rsvp/`, where those paths point outside the app.

This can make service-worker installation fail and PWA installs/navigation/assets target the wrong application root.

Acceptance:

- support both a subpath deployment such as `https://host.example/rsvp/` and a future root deployment without source edits;
- build the base path into manifests/service worker/assets deterministically, or use correct scope-relative URLs;
- EN/RU/ES manifests share one app identity within the selected deployment base;
- install/start/scope/icons/shortcuts and offline shell remain inside that base;
- test actual built output under both `/rsvp/` and `/` using production-equivalent marked static servers;
- install the PWA in Chromium from `/rsvp/es/`, go offline, relaunch, and prove Spanish route/assets/legal/demo work;
- test the root dry build separately;
- remove tests that assert the incorrect leading slash and replace them with base-aware behavioral assertions.

### AUDIT-R2-P0-011 — Android local-only claims and manifest/provider scope disagree

The manifest declares `android.permission.INTERNET` even though the Android build is described as air-gapped/local-only and has no article importer. The committed permission dump also contains `VIBRATE` and an app-private receiver permission; the report only said “zero dangerous permissions,” which is technically narrower than “no network capability.” Additionally, `file_paths.xml` exposes the entire external storage root through `<external-path path="." />`, although backup sharing only needs a narrowly scoped cache path.

Acceptance:

- determine whether Capacitor Android can operate this app with no `INTERNET` permission; if yes, remove it and prove all core flows work; if a documented runtime requirement makes it unavoidable, do not call the build air-gapped and give an exact threat/behavior explanation plus a runtime no-egress test;
- enumerate every merged-manifest permission from the final APK and classify it as normal/dangerous/signature/app-private with its reason;
- no unexplained permission is allowed;
- remove the broad `external-path`; expose only the minimum private cache subtree needed for a backup share URI;
- inspect the merged release manifest, not only source XML;
- verify no arbitrary app-private/external files can be shared through the provider;
- test an actual backup handoff and cleanup timing without deleting the file before the receiver has read it.

### AUDIT-R2-P1-012 — dependency/identity/release gates are incomplete

The original mission required exact compatible Android pinning and authoritative Android identity fields. Current `package.json` uses `"@capacitor/android": "^8.5.0"`; product configuration contains only iOS identity fields; there is no `applicationIdApproved` owner gate; version code is duplicated in Gradle rather than authoritative configuration.

Acceptance:

- pin `@capacitor/android` exactly to the compatible Capacitor core version and keep the lockfile reproducible;
- add Android current/proposed/approved ID fields, versionName/versionCode, min/target SDK, and review status to authoritative product config;
- generate/verify Gradle and store evidence from that source or fail on divergence;
- any bundle/release artifact intended for Play upload must fail while `applicationIdApproved` is false;
- debug tester APK remains clearly labeled with `team.ibet.paceflow` as an unapproved review identity;
- do not create a production key or upload artifact.

### AUDIT-R2-P1-013 — release documentation is stale and contradictory

`docs/RELEASE_EVIDENCE.md` still reports old 25/25, 200/200, old checksums, earlier dates, deployed preview claims, and no Android R1 truth. `docs/VISUAL_QA.md` still describes the older EN/RU browser matrix. Required Android architecture/tester/localization documents were not added. Google Play Data Safety copy says “Data transferred over HTTPS (when applicable locally),” which is unclear and inconsistent with local-only positioning.

Acceptance:

- update `docs/RELEASE_EVIDENCE.md` to results actually rerun on final R2 SHA;
- update `docs/VISUAL_QA.md` with real final web/extension/Android matrices;
- add `docs/ANDROID_ARCHITECTURE.md`, `docs/ANDROID_TESTER_GUIDE.md`, and `docs/LOCALIZATION_ARCHITECTURE.md`;
- correct README commands so a fresh server clone works;
- revise Google Play copy/Data Safety using the final merged permissions/network behavior and conservative wording;
- distinguish historical inherited evidence from current reruns;
- never claim production deployment, physical-device testing, publication, legal/native-speaker approval, or signed Play-ready AAB;
- remove every stale checksum/count/path and regenerate current hashes.

### AUDIT-R2-P1-014 — Chrome localization is catalog-checked but not real-locale E2E tested

The unpacked extension E2E runs only one default locale. It checks English protected-page wording and does not launch Chrome with EN/RU/ES UI locale or exercise localized error surfaces.

Acceptance:

- run the unpacked extension in three isolated Chrome profiles/locales;
- assert popup, reader, protected-page error, expired/invalid handoff, empty/oversize selection, cancellation, and Quick Send confirmation in the expected language;
- keep zero automatic content transfer and minimal permissions;
- capture representative clean EN/RU/ES extension screenshots;
- a catalog key-parity unit test is necessary but not sufficient.

## 4. Preserve useful R1 implementation

Do not throw away working changes merely because evidence is invalid. Preserve and reverify:

- URL-locale authority and static EN/RU/ES copy;
- single-language public legal generation;
- preview `noindex` SEO isolation and production-dry hreflang/canonical generation;
- centralized base-path concept, corrected for root and subpath behavior;
- localized PWA manifest concept, corrected for scope/base;
- Chrome EN/RU/ES catalogs and runtime message keys;
- Capacitor Android 8.5 / target SDK 36 / min SDK 24;
- local native storage, parser safety, migrations, bookmarks, search, RSVP behavior;
- Back/lifecycle/KeepAwake/Haptics integration after real verification;
- native document import and share-based export after real system-surface tests;
- adaptive/round/monochrome icon and splash assets after visual validation;
- `allowBackup=false`, cleartext denial, release WebView debugging denial, and absence of tracking SDKs.

Do not weaken parser limits, SSRF protection, CSP, storage transactions, tombstones, privacy, accessibility, offline behavior, iOS packaging, or existing meaningful regression tests.

## 5. Required clean build and test architecture

Create clear scripts with disjoint responsibilities. Suggested names may be adjusted, but the behavior is mandatory:

- `toolchain:android:doctor`: fail-fast versions/paths/KVM/device report;
- `test:unit`: hermetic source unit tests;
- `test:web-built`: build then test actual EN/RU/ES output at root and `/rsvp/`;
- `test:production`: current Chromium web product regressions;
- `test:cross-browser`: WebKit/Mobile Safari regressions with explicitly documented exclusions;
- `test:extension`: real unpacked EN/RU/ES profiles;
- `android:sync`: clean native build + Capacitor sync;
- `android:build`: Gradle clean test lint assembleDebug assembleRelease bundleRelease as applicable;
- `android:test:emulator`: always build/install current APK and run instrumentation plus public-UI smoke suite;
- `android:evidence`: generate evidence only after all mandatory commands succeed;
- `verify:android`: fail-closed source + merged manifest + APK/AAB inspection;
- `verify:all`: cannot report green without mandatory artifact checks for the selected release surface.

Do not make general web/unit development depend on a running Android emulator. Conversely, an Android release-candidate command must not skip Android gates.

All temporary servers/emulators need unique ownership markers and clean teardown. Record exit status. Do not use a pre-existing process/artifact as success unless it is positively identified as created by the current run and SHA.

## 6. Final mandatory gate matrix

Run on the final clean SHA from a fresh temporary clone on the remote server:

### Repository and dependencies

1. `npm ci`
2. `npm audit --omit=dev`
3. dependency integrity/version/pin verification
4. `git diff --check`
5. private filename/content scan with safe non-content logging

### Web/PWA/iOS/extension

1. hermetic unit tests
2. actual built root and `/rsvp/` locale/asset/API/PWA tests
3. Chromium production regressions
4. WebKit and Mobile Safari regressions
5. offline PWA install/relaunch from EN/RU/ES, including `/rsvp/es/`
6. real unpacked Chrome extension EN/RU/ES E2E
7. web visual matrix EN/RU/ES
8. Lighthouse on actual static EN/RU/ES production-dry routes; Performance >=90, Accessibility/Best Practices/SEO >=95
9. deterministic web/native/extension builds
10. package/privacy/deployment-config verifiers without deployment
11. Capacitor iOS sync/package verification; do not invent an Xcode rerun on Linux

### Android

1. toolchain doctor
2. clean `npx cap sync android`
3. Gradle unit tests
4. meaningful instrumentation tests / `connectedAndroidTest`
5. `lintDebug` and release-relevant lint with zero fatal/error exit
6. `assembleDebug`
7. `assembleRelease`
8. `bundleRelease` only as unsigned/review output, blocked from Play-upload semantics while ID unapproved
9. `aapt2`, `apkanalyzer`, `apksigner`, merged-manifest, DEX/native-library inspection
10. phone API 36 AVD install/current-SHA verification and UI/platform suite
11. tablet API 36 AVD install/current-SHA verification and responsive suite
12. install-upgrade migration fixture
13. force-stop/relaunch/rotation/background/offline/Delete All/import/export/Back/KeepAwake checks
14. logcat audit scoped to package and test interval, with failures on crash/ANR/security exception
15. final tester APK copied to `artifacts/android-r2/` with SHA-256

If API 24 behavior cannot be emulated within reasonable disk/time, target/min SDK static gates are not enough to claim API 24 runtime testing. Report it as an owner/lab follow-up. API 36 emulator verification remains mandatory on this capable server.

## 7. Evidence design

Generated evidence must be machine-readable and human-reviewable but not hand-authored success strings.

At minimum record:

- schema version;
- current full Git SHA and clean status;
- command argv, cwd, start/end times, duration, and exit code;
- toolchain versions;
- AVD/device immutable properties;
- APK/AAB paths, sizes, package ID, version, SDKs, permissions, debuggable/signing status, and hashes;
- installed package path/version and hash relationship to built APK;
- test counts from native result formats, not prose parsing where avoidable;
- screenshot manifest and hashes;
- logs with bounded package-specific content and no user books;
- explicit failures/skips/owner gates.

The evidence generator must refuse to mark PASS when:

- working tree is dirty;
- evidence SHA differs;
- APK hash differs;
- device is absent/offline/unauthorized;
- expected test result is missing;
- a mandatory command has nonzero/unknown status;
- screenshot is missing, blank, mislabeled, duplicated unexpectedly, wrong size, or from the wrong locale/state;
- a mandatory permission/artifact inspection did not run.

Do not commit large generated APK/AAB/log caches. Commit only concise sanitized final evidence and intentional screenshots after quality review; keep full artifacts in the server artifact directory.

## 8. Commit structure

Use logical commits without rewriting R1 history, for example:

1. tests: reproduce R2 audit failures and split hermetic/integration gates
2. fix: make web/PWA locale assets deployment-base aware
3. fix: localize native legal/support surfaces
4. fix: harden Android manifest/provider/identity configuration
5. test: replace false-positive Android verifiers with fail-closed gates
6. test: add real Android instrumentation and UI/platform flows
7. test: regenerate truthful Android visual/evidence package
8. docs: reconcile Android architecture, tester guide, store copy, and release evidence

Do not commit generated toolchains, caches, debug keystores, or APK/AAB binaries.

## 9. Final handoff contract

The final response must include:

- exact server path, branch, local full SHA, remote full SHA, and clean status;
- complete list of new commits;
- disposition table for AUDIT-R2-P0-001 through AUDIT-R2-P1-014;
- exact server toolchain versions and setup changes;
- exact command results and counts for unit/web/cross-browser/PWA/extension/visual/Lighthouse/iOS-package gates;
- exact Gradle unit/lint/build/instrumentation/emulator results;
- phone and tablet AVD profiles actually used;
- exact current-SHA APK path, size, application ID, version, min/target SDK, permissions, signing/debuggable status, and SHA-256;
- unsigned AAB details clearly labeled NOT FOR UPLOAD, if generated;
- screenshot/evidence paths and manifest checksum;
- extension ZIP file count and checksum;
- remaining physical-device, final identity, signing, account, legal/native-language, and publication owner gates;
- explicit confirmation that production, stores, DNS, paid services, production signing, PRs, and GitHub-hosted Actions were untouched.

Do not say “completed,” “release candidate,” “real emulator tested,” “pushed,” or “all passed” unless every corresponding proof in this mission exists and is current.

## 10. Definition of done

Done means:

- the inherited 16 R1 implementation commits are safely present on the remote R2 branch;
- all false completion/evidence claims are removed;
- a fresh server clone builds reproducibly with official server Android tooling;
- unit tests are hermetic and Android release tests are explicit/fail-closed;
- Android verifiers cannot pass without real tools/current artifacts/current device/current SHA;
- invalid screenshots are replaced by correctly labeled, visually inspected current-SHA evidence;
- accessibility checks assert outcomes rather than logging them;
- EN/RU/ES native legal/support pages match the selected UI language;
- PWA works from both `/rsvp/` and root builds without escaping scope;
- Chrome EN/RU/ES user-visible errors are exercised in real locale profiles;
- current APK is actually installed and exercised on API 36 phone and tablet AVDs;
- import/export/storage/Back/lifecycle/rotation/offline/upgrade/Delete All/KeepAwake are meaningfully exercised;
- merged Android permissions/provider paths match truthful local-first claims;
- owner can SCP a debug tester APK from the documented server path and verify its checksum;
- final local and remote SHAs match and the tracked tree is clean;
- no production/external paid/publishing/signing action occurred.

If a genuine external owner gate remains, finish every independent item first and report the gate precisely. Missing Java, SDK, ADB, emulator, KVM access, or reproducible scripts is not an owner gate on this server.
