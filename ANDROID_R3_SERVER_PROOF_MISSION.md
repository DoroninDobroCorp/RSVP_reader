# HummingRead Android R3: truthful server proof and tester-ready release

Date: 2026-08-13

This is an execution mission, not a planning or reporting exercise. Continue
autonomously until every non-owner acceptance gate below is either proven from
real command output on the canonical server or reported as failed with the exact
blocker. Never convert an unexecuted check into `PASSED`.

## 1. Canonical environment and immutable boundaries

- Work only through SSH on `serverforvovka`.
- Canonical worktree: `/srv/RSVP_reader-r2`.
- Required branch: `mission/android-r3-server-proof-20260813`.
- Inherited implementation baseline: commit
  `51f735bd4a14786c5c94b40aa88f667f0540eb2a`.
- The branch already preserves the 26 useful local R2 commits that were never
  pushed on the former R2 branch. Do not reset, squash away, or reconstruct
  them from the old remote branch.
- Production worktree `/srv/RSVP_reader` is forbidden. Do not edit it, deploy
  it, stop/restart its service, or change nginx, DNS, TLS, firewall, systemd, or
  production data.
- Do not merge to `main`, create a PR, create a release, publish to a store,
  production-sign, create signing keys, or change the approved production app.
- Do not use GitHub Actions or any paid GitHub/service feature. Run all builds
  and tests on `serverforvovka` using free local tools.
- Do not change the Android application ID from `team.ibet.paceflow` while
  `product.config.json` says `applicationIdApproved: false`.
- Do not claim tester-ready until the debug APK exists durably on this server
  and its checksum, package metadata, permissions, source SHA, and runtime QA
  have all been verified.

Before any implementation change, run and save the output of:

```bash
cd /srv/RSVP_reader-r2
test "$(pwd -P)" = /srv/RSVP_reader-r2
test "$(git branch --show-current)" = mission/android-r3-server-proof-20260813
git status --short --branch
git rev-parse HEAD
git ls-remote --heads origin mission/android-r3-server-proof-20260813
```

If the path or branch differs, stop. Do not silently work on a Mac path or a
different clone.

## 2. Independent audit facts that are failing requirements

Treat every item in this section as open until it is reproduced and corrected.
The previous R2 completion report is not acceptable evidence.

### AUDIT-R3-P0-001 — the prior branch was not pushed

At audit time:

- local R2 HEAD was `51f735bd4a14786c5c94b40aa88f667f0540eb2a`;
- real `git ls-remote` for the R2 branch returned
  `51c6b92d3c0843a8c63a205ed7116ae3cd1f3813`;
- the worktree was 26 commits ahead despite a report claiming an exact match.

The R3 branch must be pushed normally. Remote synchronization must be proved by
the live output of `git ls-remote`; a local tracking ref is never a fallback.

### AUDIT-R3-P0-002 — no Android toolchain exists on the server

At audit time on `serverforvovka`:

- `java`, `adb`, `sdkmanager`, `emulator`, `aapt2`, and `avdmanager` were absent;
- `JAVA_HOME`, `ANDROID_HOME`, and `ANDROID_SDK_ROOT` were unset;
- `node scripts/toolchain-doctor.mjs` failed on all required components;
- `/dev/kvm` existed as `root:kvm`, but user `ubuntu` was not in group `kvm`.

The report's claimed JDK 21 / SDK 36 / adb / emulator installation therefore
did not happen on the canonical server.

### AUDIT-R3-P0-003 — claimed release artifacts do not exist

At audit time there was no `/srv/RSVP_reader-r2/artifacts/android-r2/`, no APK,
no AAB, and no `validation-state.json` on the server. The report's claimed APK
hash `a93b2e...` also disagreed with the committed evidence hash `20d153...`.

### AUDIT-R3-P0-004 — the clean unit suite is red and non-hermetic

An independent clean clone of final R2 local HEAD followed by `npm ci` and
`npm run test:unit` produced:

- 84 total tests;
- 62 passed;
- 5 failed;
- 17 skipped.

Failures depended on absent APK/build outputs, absent generated native legal
pages, and a negative checksum test that itself required a prebuilt APK.
This contradicts the claimed `84/84` and the claim of hermetic unit tests.

### AUDIT-R3-P0-005 — verification fabricates results

`scripts/verify-all.mjs` currently runs only 13 limited steps and then writes a
summary with hard-coded tool versions and many unconditional `PASSED` values,
including emulator QA, screenshot QA, PWA, extension, cross-browser, and
artifact assertions it did not execute.

`scripts/package-release-r2.mjs` has the same defect: it hard-codes many
statuses, can accept stale pre-existing artifacts, and falls back from a failed
live remote query to `origin/<branch>`.

No verifier may infer success from a file's existence or from a previous JSON
field that says `PASSED`.

### AUDIT-R3-P0-006 — screenshot evidence is mislabeled and duplicated

The committed R2 matrix is not truthful:

- every phone, compact-phone, and landscape PNG is physically `320x640`, even
  when its filename/sidecar says `390x844`, `320x568`, or `844x390`;
- every tablet PNG is physically `2560x1600`, even when labeled `800x1280`;
- all eight workflow PNGs and the font-scale PNG have the exact same SHA-256
  `bf1706e9b9408b9290705efa0e05e29ecbef5038c0fa40d3872524b463c33a3d`;
- the file named `step_3_rsvp_playing.png` visibly shows the Spanish landing
  page, not active RSVP playback;
- the file named `tablet_800x1280_es_settings.png` visibly shows the Spanish
  landing page, not Settings;
- many unrelated locale/view/device files are also byte-identical;
- sidecars claim commit `9b2788e...`, not current source HEAD;
- the capture script takes the same screen repeatedly while merely changing
  filenames and metadata. It does not change the device size/orientation for
  the three claimed phone viewports and does not perform workflow transitions.

Entropy/non-black checks alone are insufficient. Delete the known-false current
R2 generated screenshots and summaries from the current tree, or explicitly
quarantine them as invalid historical evidence. They must not remain presented
as passing release evidence.

### AUDIT-R3-P0-007 — emulator QA bypasses the Android boundary

The current emulator script calls internal JavaScript through WebView CDP for
many claims:

- the alleged SAF import constructs `File` objects in JavaScript and calls
  `extractBookFromFile`; it never opens Android DocumentsUI;
- Delete All overrides the confirmation function and never exercises the real
  dialog;
- airplane-mode commands are allowed to fail and `offlineCapable: true` is a
  constant;
- rotation commands are allowed to fail and physical orientation is not
  checked;
- process-kill recovery asserts only WPM, not exact book/position/state;
- eight `VAL-CROSS-QA-*` assertions are set to `PASSED` without executing any
  checks;
- the tablet test checks only horizontal overflow through CDP;
- there is no real Android share sheet/receiver verification, real JSON export
  and picker re-import, or real upgrade path.

CDP may remain as a supplemental inspection tool. It cannot be the sole proof
for Android platform features.

### AUDIT-R3-P1-008 — accessibility gate covers one Spanish screen only

The committed accessibility file contains 13 controls from one Spanish screen.
The capture script runs the audit once, not across EN/RU/ES and not across
library, reader, focus playback, settings, dialogs, and legal pages. It also
does not validate focusability, disabled state, or state-specific accessible
names.

### AUDIT-R3-P1-009 — toolchain code contains personal Mac paths

`scripts/toolchain-doctor.mjs` contains Homebrew and `~/Library/Android/sdk`
paths. The R3 authoritative workflow is Linux server-only. Remove personal Mac
paths from the server doctor and make configuration explicit and reproducible.

### AUDIT-R3-P1-010 — extension locale proof is partly synthetic

The extension E2E genuinely passes useful selection, reader, extraction,
Quick Send, and catalog tests. Preserve it. However, the test writes
`hummingreadProfileLocale` into extension storage, so it does not independently
prove that Chrome's actual `chrome.i18n` UI locale follows `--lang`.

Report app/extension locale override testing honestly, and add a separate
browser-locale assertion if claiming browser-profile locale behavior.

### AUDIT-R3-P1-011 — master verification dirties its own tree

`verify-all.mjs` writes tracked evidence after first checking for a clean tree.
That makes a passing verifier incompatible with a clean final worktree and
creates the impossible pattern of repeatedly committing evidence that embeds a
previous commit SHA. Final evidence must be generated after the final source
commit/push into ignored runtime artifacts, not into tracked self-referential
files.

## 3. Real progress to preserve

Do not regress these independently confirmed improvements:

- a clean `npm run build:web` followed by `npm run test:web-built` passes for
  both root `/` and subpath `/rsvp/`;
- a clean real Chromium production suite passes `73/73`;
- the real unpacked Chrome extension E2E passes EN/RU/ES application locale
  flows plus selection, extraction, private standalone reader, keyboard,
  persistence, protected-page errors, and Quick Send;
- `@capacitor/android` is exactly pinned to `8.5.0`;
- Android `INTERNET` permission was removed for the local-only build;
- FileProvider was narrowed to app-private cache path `backups/`;
- product config now records Android version and unresolved application-ID
  approval;
- base-aware asset paths, service-worker scope handling, and native localized
  legal generation are materially improved;
- `npm audit` found zero known vulnerabilities in the clean install.

These are real engineering gains. R3 should fix proof and remaining release
mechanics without rewriting the product.

## 4. Required implementation sequence

### Phase A — push the inherited baseline and establish provenance

1. Confirm the branch/path invariants from section 1.
2. Push `mission/android-r3-server-proof-20260813` to origin before substantial
   implementation so the 26 inherited commits are durably preserved.
3. Save live local and remote SHAs in a runtime log.
4. Never use `origin/<branch>` as proof of remote state. Only
   `git ls-remote --heads origin <exact-branch>` is authoritative.

### Phase B — install an official, persistent, free server toolchain

Create an idempotent Linux server bootstrap, for example
`scripts/bootstrap-android-server.sh`, and document it. It must:

1. Fail unless the host is Linux and the canonical worktree is correct.
2. Install or verify OpenJDK 21 using the server package manager or another
   official freely redistributable source.
3. Install official Android command-line tools in a stable server location,
   preferably `/opt/android-sdk`, not inside a user download directory.
4. Install and verify at minimum:
   - `platform-tools`;
   - current official `cmdline-tools`;
   - `platforms;android-36`;
   - `build-tools;36.0.0`;
   - Android emulator;
   - a compatible API 36 x86_64 phone/tablet system image.
5. Accept required Android SDK licenses non-interactively while preserving the
   actual command output.
6. Persist `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and required PATH
   entries for later SSH sessions using a documented system or project env
   file. Do not depend on an interactive shell profile that tests do not load.
7. Grant `ubuntu` KVM access with the least privilege needed. Do not chmod
   `/dev/kvm` world-writable. Account for the fact that a current shell does not
   gain new group membership until re-login or `sg/newgrp`.
8. Create deterministic phone and tablet API 36 AVDs, with documented configs.
9. Be safe to rerun and fail loudly on partial installation.
10. Print actual parsed versions and absolute paths; never hard-code them into
    the result.

Revise `scripts/toolchain-doctor.mjs` so it is Linux-server authoritative and
checks:

- JDK major version exactly 21;
- SDK root and Android 36 platform;
- adb server/client functionality;
- emulator and acceleration/KVM usability;
- aapt2 and build-tools version;
- sdkmanager/avdmanager functionality;
- Gradle wrapper functionality;
- required AVD names and API/ABI;
- current user's effective KVM access.

Remove personal Homebrew/macOS candidate paths. Environment overrides may be
supported, but a missing or wrong override must fail closed.

### Phase C — make clean tests genuinely hermetic

From a new temporary clone with no `dist/`, `dist-native/`, `artifacts/`,
Android build output, adb, emulator, or network dependency:

```bash
npm ci
npm run test:unit
```

must pass with zero failures and zero conditional skips.

Requirements:

1. Unit tests may create their own fixtures in `mktemp` directories.
2. Move artifact/build/emulator contract checks out of `test:unit` into named
   integration/release scripts.
3. Do not silently skip a unit test because `dist/`, adb, or an APK is absent.
4. Native legal tests must test source transforms with temporary build output,
   or build the required fixture inside the test. They must not depend on stale
   ignored directories.
5. The checksum negative self-test must create its own minimal temporary binary
   and checksum, corrupt it, and prove the verifier exits non-zero for the right
   reason.
6. Artifact tests must not pass merely because an old file exists.
7. No unit test may mutate tracked repository files.
8. `npm test` must be valid from a clean clone. It must explicitly build the web
   output before a test that requires it, or `test:web-built` must create and
   clean an isolated build itself.
9. Add a clean-checkout test script that clones the current local commit with
   `--no-hardlinks`, runs `npm ci`, unit, web build/test, and verifies the source
   clone remains clean.

### Phase D — replace declarative evidence with an executable result model

Refactor the verification architecture around executed checks.

1. Each check must return a structured record containing:
   - stable ID;
   - command or function name;
   - start/end timestamps and duration;
   - actual exit code;
   - `PASS`, `FAIL`, or `SKIP`;
   - concise observed values;
   - paths/hashes of raw logs or artifacts.
2. `PASS` may only be produced by the function that executed and asserted the
   behavior.
3. A missing prerequisite is `FAIL` for a release-required gate, not an
   unconditional pass and not a warning.
4. Any required `FAIL` or `SKIP` makes the overall release contract non-green.
5. Never load a previous evidence JSON and trust its status as current proof.
6. Never hard-code JDK/SDK versions, AVDs, test counts, APK hashes, git status,
   or `PASSED` values.
7. The master verifier must actually invoke every suite it summarizes, or omit
   that suite from its claims.
8. Preserve stdout/stderr and exit status for every command in
   `artifacts/android-r3/logs/`.
9. Generate `artifacts/android-r3/validation-state.json` from the in-memory
   executed results only.
10. Generate evidence only after source is committed and pushed, from a clean
    checkout of the exact live remote SHA.
11. Runtime evidence belongs under ignored `artifacts/android-r3/`; it must not
    dirty the source worktree.
12. Remove the current known-false tracked R2 screenshot/summary evidence from
    the release-facing tree. Leave a small tracked README explaining how to
    regenerate R3 evidence if helpful.

Delete the `git ls-remote` fallback in the packaging script. A network/auth
failure must be an explicit failure. A remote SHA mismatch must be an explicit
failure.

### Phase E — reproducible Android build from the live remote commit

After all source changes are committed and pushed:

1. Obtain `REMOTE_SHA` from live `git ls-remote`.
2. Create a new temporary validation clone from origin and checkout exactly
   `REMOTE_SHA` in detached HEAD or the exact R3 branch.
3. Confirm clean status and absence of ignored old outputs.
4. Run `npm ci`.
5. Run clean source checks, unit tests, web/native builds, and Android sync.
6. In the Android project run at least:
   - `./gradlew --no-daemon clean`;
   - `./gradlew --no-daemon testDebugUnitTest` if applicable;
   - `./gradlew --no-daemon lintDebug`;
   - `./gradlew --no-daemon assembleDebug`;
   - `./gradlew --no-daemon bundleRelease`.
7. Do not reuse an artifact that existed before this clean build began.
8. Copy the fresh binaries to durable server paths:
   - `/srv/RSVP_reader-r2/artifacts/android-r3/HummingRead-R3-debug.apk`;
   - `/srv/RSVP_reader-r2/artifacts/android-r3/HummingRead-R3-review-UNSIGNED-NOT-FOR-UPLOAD.aab`.
9. Clearly label the AAB unsigned/not-for-upload. Do not create or use a release
   signing key.
10. Use `aapt2`, `apkanalyzer`, or another installed official tool to record:
    - application ID;
    - versionCode/versionName;
    - minSdk/targetSdk;
    - requested permissions;
    - debuggable state;
    - native ABIs if relevant.
11. Assert there is no `android.permission.INTERNET`, no dangerous runtime
    permission, and FileProvider scope is restricted as intended.
12. Compute SHA-256 from the final copied files and validate the checksum file
    with `sha256sum --check`.
13. Record the exact clean-clone source SHA and prove it equals live remote SHA.

The artifact package must never claim that the unresolved application ID is
approved. It is a tester/review candidate only.

### Phase F — real Android platform QA on API 36 phone and tablet

Create or revise tests so platform assertions cross the Android UI/system
boundary. CDP may supplement them, but not replace them.

Required real phone scenarios:

1. Fresh install and cold launch from launcher/activity; assert visible
   HummingRead UI and capture startup time/logcat errors.
2. Switch EN, RU, and ES through visible app UI controls; assert visible labels,
   persistence after force-stop/relaunch, and localized legal pages offline.
3. Start the demo using a visible control; assert actual RSVP progression,
   pause/resume, WPM change, rewind, and end behavior.
4. Import TXT, EPUB, FB2, DOCX, HTML, Markdown, and RTF through the real Android
   Storage Access Framework:
   - place synthetic non-copyrighted fixtures on the emulator;
   - tap the app import control;
   - prove Android DocumentsUI is foreground;
   - choose the file using UIAutomator/accessibility selectors;
   - verify the imported title/text through visible app UI.
   Direct `new File(...)` injection into WebView is parser testing, not SAF QA.
5. Export backup through the visible UI, exercise the real Android share sheet
   or a test-only receiver, and verify a content URI from the restricted
   FileProvider rather than a raw filesystem path.
6. Re-import the actual exported JSON using the real picker and verify books,
   positions, bookmarks, settings, and text.
7. Rotate using Android system controls, assert physical orientation/window
   metrics changed, and verify exact reader position/WPM/state survived.
8. Exercise Android Back from dialog -> focus reader -> normal reader ->
   library/app exit hierarchy using system Back and visible state assertions.
9. Background with HOME, force-stop/kill, relaunch, and assert exact selected
   book ID/title, exact word index, WPM, theme, bookmarks, and search state.
10. Use the real Delete All confirmation UI, confirm it, relaunch, and verify
    library/settings/draft/private text are gone.
11. Enable airplane mode and verify the system state actually changed. Disable
    Wi-Fi/mobile transport, prove an external probe fails, then prove local
    demo/import/read/export continue to work. Restore system state afterward.
12. Verify Keep Awake at the platform boundary while playing and release on
    pause/background, for example via window flags/dumpsys plus app state.
13. Exercise the native haptic call boundary and record a platform-observable
    result or an instrumentation assertion. Do not claim physical vibration
    from a JavaScript mock.
14. Capture uncaught WebView errors, Android crashes/ANRs, and relevant logcat;
    any crash/ANR is a gate failure.

Required real upgrade scenario:

1. Build or retain a known prior compatible debug APK from a documented source
   commit with the same application ID.
2. Install the prior APK, create representative data through visible UI, then
   install R3 with `adb install -r` without clearing data.
3. Verify exact data migration and continued reading.
4. Record both APK hashes and source SHAs.

Required tablet scenarios:

1. Install the same fresh R3 APK on a separate API 36 tablet AVD.
2. Run EN/RU/ES landing, library, reader/focus, settings, legal, dialog, import,
   and rotation checks.
3. Assert no horizontal overflow, clipped primary controls, unreachable dialog
   actions, or focus UI obstruction.
4. Do not label a landscape tablet capture as portrait.

Every `VAL-CROSS-QA-*` or replacement R3 assertion must correspond to a real
executed function with a failing condition. Delete empty blocks that merely set
statuses to `PASSED`.

No `allowFail` is permitted on a command whose success is necessary for the
assertion. Cleanup commands may be best-effort only if clearly recorded and not
used as proof.

### Phase G — truthful screenshot matrix and accessibility proof

Rebuild screenshot generation around measured reality.

1. Before each capture, put the app into the named state using visible UI or a
   clearly documented test fixture plus visible UI transition.
2. Assert the named state from visible DOM/accessibility/UI hierarchy before
   taking the PNG.
3. For locale captures, assert at least two visible locale-specific strings.
4. For each desired viewport, actually configure a matching emulator/window or
   name the file with the real measured physical dimensions.
5. Read PNG dimensions with `sharp`/ImageMagick after capture. Sidecar dimensions
   must be derived from the PNG, never copied from desired input.
6. Assert orientation from Android system state and measured dimensions.
7. Use exactly one sidecar per PNG: `<filename>.png.json`.
8. Sidecar must contain live final remote SHA, fresh APK SHA, AVD config/API,
   measured PNG dimensions, orientation, locale, app state, theme, timestamp,
   capture command, and the state assertions performed.
9. Hash every PNG. Reject byte-identical files with different locale, state,
   orientation, or viewport labels unless an explicit documented equivalence is
   expected; workflow steps must never be duplicates.
10. Keep black/blank/entropy checks, but add duplicate, dimensions, locale, and
    state checks.
11. Capture real distinct workflow states: landing, demo loaded, playing,
    paused context, each locale, bookmark confirmation, search results, export
    chooser, import picker, Settings, legal, and Delete All dialog.
12. Font-scale proof must actually set Android font scale, assert it, relaunch
    if needed, and restore it afterward.

Run accessibility audits on representative states for all three locales on
both phone and tablet. At minimum cover landing/input, library, normal reader,
focus reader playing and paused, settings, action dialogs, search/bookmarks,
legal pages, import picker handoff, and export confirmation.

For each visible enabled interactive control record:

- stable selector or accessibility node identity;
- accessible name and role;
- focusability/actionability;
- disabled state;
- measured CSS target size;
- whether the project's 44x44 target rule applies;
- a documented exception only for genuine inline text links, never primary
  actions.

Do not call one screen with 13 controls a cross-locale accessibility audit.

Store generated screenshots/audits under ignored
`artifacts/android-r3/evidence/`, not tracked self-referential evidence.

### Phase H — preserve and strengthen web/PWA and Chrome extension gates

The existing web and extension work is useful. Preserve the passing suites and
add missing truth checks.

Web/PWA requirements:

1. Keep clean `build:web` + `test:web-built` passing for `/` and `/rsvp/`.
2. Add real browser service-worker registration/offline-navigation tests for
   both mounts. A static fetch of precache URLs is not enough.
3. Assert worker script URL, effective scope, controller acquisition, install,
   cached localized routes/assets, and offline reload under both mounts.
4. Test EN/RU/ES manifest start URLs and direct routes under both mounts.
5. Ensure arbitrary unsupported directory paths are not mistaken for an app
   shell route and cached as the main shell merely because they end in `/`.
6. Preserve CSP/privacy/local-only behavior and zero private-content network
   transfer in native builds.

Chrome extension requirements:

1. Preserve the currently passing real unpacked-extension E2E.
2. Keep catalog key/placeholder parity across EN/RU/ES.
3. Distinguish tests of an explicit stored extension locale override from tests
   of Chrome's actual UI locale.
4. If claiming actual browser-profile locale support, assert
   `chrome.i18n.getUILanguage()` and `chrome.i18n.getMessage(...)` from each
   launched profile without pre-seeding the app's locale override.
5. Preserve the invariant that selected/private text is never sent over an
   external network automatically.

### Phase I — final clean validation, packaging, and push

The final sequence matters:

1. Finish source changes and logical commits without repeatedly committing
   generated evidence that embeds an old SHA.
2. Run `git diff --check`, source syntax checks, `npm audit`, hermetic unit,
   clean web/PWA, production Chromium, cross-browser, extension, Lighthouse,
   native build, Gradle tests/lint/build, phone QA, tablet QA, screenshot QA,
   accessibility QA, security/package inspection, and negative self-tests.
3. Commit all source/documentation corrections.
4. Push the exact R3 branch.
5. Query live remote SHA with `git ls-remote` and assert equality.
6. Create a fresh validation clone from that live remote SHA.
7. Re-run release-critical build/tests from the fresh clone.
8. Copy generated binaries/logs/evidence to durable ignored
   `/srv/RSVP_reader-r2/artifacts/android-r3/`.
9. Generate final `validation-state.json` from actual executed results.
10. Confirm the source worktree is clean and remote SHA still matches.
11. Do not make another source commit after final artifact generation. If a
    source change is necessary, repeat push + fresh clone + full final proof.

## 5. Required negative self-tests

The final verification system must be proven fail-closed. In isolated temporary
copies, demonstrate non-zero exit for at least:

1. missing JDK;
2. wrong JDK major;
3. missing SDK 36 platform;
4. missing APK;
5. stale APK created before the build run;
6. APK checksum mismatch;
7. unexpected `INTERNET` permission;
8. broad FileProvider path;
9. dirty source worktree;
10. local/remote SHA mismatch;
11. unavailable `git ls-remote` with no local-ref fallback;
12. absent validation log for a claimed assertion;
13. duplicate workflow screenshots;
14. PNG/sidecar dimension mismatch;
15. sidecar source SHA mismatch;
16. skipped required emulator scenario;
17. an `allowFail` platform command used as proof;
18. hard-coded `PASSED` assertion without an executed check record.

Each negative test must fail for its intended reason, not because some unrelated
fixture is missing.

## 6. R3 acceptance contract

The mission is complete only when all these statements are true simultaneously:

### Environment and Git

- `R3-ENV-001`: canonical host/path/branch guard passes.
- `R3-ENV-002`: JDK 21 and complete Android 36 toolchain are persistent on the
  server and doctor passes after a new SSH login.
- `R3-ENV-003`: KVM/emulator acceleration is usable by the executing user.
- `R3-GIT-001`: final local HEAD equals live remote R3 branch SHA.
- `R3-GIT-002`: source worktree is clean after final validation.
- `R3-GIT-003`: production worktree and services remain untouched.

### Clean source tests

- `R3-TEST-001`: fresh clone + `npm ci` succeeds.
- `R3-TEST-002`: hermetic unit suite has zero failures and zero conditional
  skips.
- `R3-TEST-003`: root and `/rsvp/` built-output tests pass.
- `R3-TEST-004`: real browser offline PWA tests pass at both mounts.
- `R3-TEST-005`: Chromium production suite remains green.
- `R3-TEST-006`: WebKit and Mobile Safari suites are green except only explicit
  pre-existing intentional skips documented by test name.
- `R3-TEST-007`: real unpacked Chrome extension suite is green and locale claims
  match what was actually tested.
- `R3-TEST-008`: npm audit is zero at the selected threshold.

### Android package

- `R3-APK-001`: fresh debug APK exists at the durable R3 path.
- `R3-APK-002`: fresh unsigned review AAB exists and is clearly not for upload.
- `R3-APK-003`: checksums validate from disk.
- `R3-APK-004`: package identity/version/SDK values match product config.
- `R3-APK-005`: no INTERNET or dangerous permission is requested.
- `R3-APK-006`: FileProvider path is restricted and export works through a
  content URI.
- `R3-APK-007`: both binaries were built from final live remote SHA in a clean
  validation clone.
- `R3-APK-008`: Gradle tests, lint, assemble, and bundle commands all have real
  zero exit codes and stored logs.

### Runtime

- `R3-RUN-001`: real phone API 36 suite passes.
- `R3-RUN-002`: real tablet API 36 suite passes.
- `R3-RUN-003`: real SAF import passes all seven formats.
- `R3-RUN-004`: real export/share and JSON re-import pass.
- `R3-RUN-005`: exact process-kill and rotation persistence pass.
- `R3-RUN-006`: real Back, Delete All, and airplane-mode flows pass.
- `R3-RUN-007`: real upgrade installation preserves data.
- `R3-RUN-008`: no crash, ANR, or uncaught fatal WebView error appears.

### Visual and accessibility evidence

- `R3-VIS-001`: every PNG's measured dimensions and orientation match its name
  and sidecar.
- `R3-VIS-002`: locale/state assertions match visible screenshot contents.
- `R3-VIS-003`: no prohibited duplicate hashes exist.
- `R3-VIS-004`: sidecars match final remote SHA and fresh APK hash.
- `R3-A11Y-001`: all required states/locales/devices were audited.
- `R3-A11Y-002`: every applicable primary control meets the 44x44 project rule,
  has a usable accessible name/role, and is actionable/focusable as intended.

### Evidence integrity

- `R3-EVD-001`: no required assertion is hard-coded to pass.
- `R3-EVD-002`: every pass links to an executed check and raw log/artifact.
- `R3-EVD-003`: any missing prerequisite makes the overall result non-green.
- `R3-EVD-004`: final validation JSON is generated after final push from a
  clean checkout of the live remote SHA.
- `R3-EVD-005`: generated evidence does not dirty tracked source.
- `R3-EVD-006`: all negative self-tests fail for the intended reasons.

## 7. Owner-only gates that must remain open

Do not solve or misrepresent these as complete:

- legal approval of HummingRead/Pico branding;
- approval of final Android application ID;
- production signing key and Play App Signing;
- Google Play developer account, store listing, content rating, privacy forms,
  pricing, territories, tax/banking, and upload;
- final domain/support email/store URLs;
- physical-device testing by the owner;
- production deploy/merge.

The unsigned AAB is not uploadable. The debug APK is for testing only.

## 8. Required final report format

The final response must be concise but mechanically verifiable. Include:

1. canonical host, path, branch, final local SHA, and live remote SHA;
2. a statement that `/srv/RSVP_reader` was untouched;
3. actual installed tool paths and parsed versions;
4. exact test commands, pass/fail/skip counts, durations, and log paths;
5. exact Gradle command results;
6. phone/tablet AVD configs and executed scenario counts;
7. APK/AAB absolute paths, sizes, hashes, package metadata, and permissions;
8. `validation-state.json` absolute path and result counts;
9. screenshot count, unique-hash count, dimension mismatch count, prohibited
   duplicate count, and accessibility coverage count by locale/state/device;
10. all remaining owner-only gates;
11. any failure or unexecuted gate stated plainly. Never say “completed
    end-to-end” if a required gate is failed, skipped, or absent.

Do not cite a Mac path. Do not say a push happened without including the live
`git ls-remote` result. Do not report a binary that cannot be found by `stat` on
the server.

## 9. Definition of done

Done means the owner can SSH to the server, find the fresh APK, verify its hash,
install it on a tester device, and independently regenerate the complete result
from the exact pushed R3 source commit. Until that is true, continue working or
report the precise blocker without inventing success.
