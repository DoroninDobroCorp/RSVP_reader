# HummingRead Android R4 — close the proof gap, do not rebuild the product

Date: 2026-08-13

This mission is a focused correction of Android QA and release evidence. The
product, Android project, server toolchain, and reproducible package build have
made real progress. Preserve them. Do not redesign HummingRead or repeat work
that is already independently confirmed.

The previous R3 final report is not accepted as an end-to-end release proof.
Several claims are contradicted by the files and scripts on the canonical
server. Fix the checks and execute the missing platform flows rather than
editing prose to make the report sound complete.

## 1. Canonical execution boundary

- Host: `serverforvovka`.
- Worktree: `/srv/RSVP_reader-r2`.
- Branch: `mission/android-r4-qa-truth-20260813`.
- R4 baseline: `7dadf6344112175097fbec9023659d2a758a61a8`.
- Work only on the server through SSH.
- Never work in `/srv/RSVP_reader`; never deploy or restart production.
- Do not merge to `main`, create a PR, publish, sign for production, upload to
  Google Play, run GitHub Actions, or use paid services.
- Preserve unresolved owner gates: final application ID approval, brand/legal
  approval, signing, Play account/listing, physical-device owner QA, and
  production deployment.

Before any code change:

```bash
cd /srv/RSVP_reader-r2
test "$(pwd -P)" = /srv/RSVP_reader-r2
test "$(git branch --show-current)" = mission/android-r4-qa-truth-20260813
test "$(git rev-parse HEAD)" = 7dadf6344112175097fbec9023659d2a758a61a8
git status --short --branch
git ls-remote --heads origin mission/android-r3-server-proof-20260813
```

Push the R4 baseline branch early so the starting state is durable. At final
validation, only live `git ls-remote` is authoritative.

## 2. Real R3 progress to preserve

These facts were independently verified and are not to be undone:

1. R3 local and remote SHAs genuinely matched at `7dadf634...`.
2. OpenJDK 21, Android SDK/API 36, build-tools, adb, emulator, AVDs, and KVM
   are genuinely installed on the server.
3. A fresh remote-SHA Gradle build completed successfully and produced a real
   APK and unsigned AAB.
4. The real current R3 files are:

   - `/srv/RSVP_reader-r2/artifacts/android-r3/HummingRead-R3-debug.apk`
     - size: `7,632,216` bytes;
     - SHA-256:
       `3c6217cb688db28cdc9ee70d1c2d6fe8d1e570cca861487cecb02089bddc06c1`.
   - `/srv/RSVP_reader-r2/artifacts/android-r3/HummingRead-R3-review-UNSIGNED-NOT-FOR-UPLOAD.aab`
     - size: `6,450,019` bytes;
     - SHA-256:
       `c20d6bac1dfb2c68c85f3c8b5b77a9334ea4ae3aa15c9b6c8a1414876d231f3d`.

5. The APK metadata is real:

   - package `team.ibet.paceflow`;
   - versionCode `200`, versionName `2.0.0`;
   - minSdk `24`, target/compile SDK `36`;
   - no `android.permission.INTERNET`;
   - `android.permission.VIBRATE` plus the normal non-exported dynamic receiver
     permission;
   - restricted FileProvider source config under `backups/`.

6. The AAB is genuinely unsigned (`jarsigner` reports `jar is unsigned`), as
   required for this review-only artifact.
7. An independent clean full-boot API 36 phone smoke test installed the final
   APK, launched `team.ibet.paceflow/.MainActivity`, obtained a live PID and
   focused app window, and eventually displayed the English HummingRead landing
   UI without an app-process crash.
8. Previously independently confirmed web and extension gates remain useful:
   Chromium production `73/73`, root and `/rsvp/` web builds, and real unpacked
   Chrome extension flows in EN/RU/ES.
9. Production remained on `29b65d7...` and was not modified by this audit.

R4 is not permission to rewrite these areas. It exists to make the claimed
proof match reality.

## 3. Reproduced R3 defects — all are failing requirements

### R4-P0-001 — the final report contains wrong artifact facts

The report stated APK/AAB sizes and hashes that do not match the actual durable
files. The correct values are in section 2. Never hand-copy artifact metadata
into the final response. Generate it immediately before reporting by `stat`,
`sha256sum`, and package inspection.

The checksum manifest is valid only when checked from its containing directory:

```bash
cd /srv/RSVP_reader-r2/artifacts/android-r3
sha256sum --check checksums.sha256
```

Document that context or emit absolute paths in a future manifest.

### R4-P0-002 — clean-clone unit tests are still red

The R3 report claimed `98/98` hermetic unit tests. An independent clone of the
live final remote SHA followed by only `npm ci && npm run test:unit` produced:

- 98 total;
- 88 passed;
- 10 failed;
- 0 skipped.

The canonical warm worktree passed only because ignored/generated `dist/`
already existed and contained previous build state. Failures included missing
localized `dist/ru` and `dist/es` pages/manifests, routing assertions, and SEO
preview expectations.

This is order dependence, not hermeticity. Unit tests must not consume shared
ignored output. Tests needing a build must create an isolated build fixture
inside a temporary directory, or belong to an explicit build integration suite.

Also, `tests/unit/android-emulator-smoke.test.js` is false-positive by design:
when evidence is absent, it constructs a default object and fills sixteen
emulator/cross-QA fields with `PASSED`. Delete this fallback. Unit tests must not
claim emulator execution.

### R4-P0-003 — the master verifier omits the release-critical suites

`artifacts/android-r3/validation-state.json` contains 13 executed steps and
only 19 distinct assertion IDs, not the reported `40/40`. It does not execute
or link raw logs for:

- Android phone QA;
- Android tablet QA;
- visual matrix generation/validation;
- accessibility coverage;
- Chromium production regression;
- WebKit/Mobile Safari regression;
- unpacked Chrome extension E2E;
- actual browser PWA offline behavior at both mounts;
- Lighthouse/performance if the report claims it;
- real upgrade, SAF, share, airplane, Keep Awake, or haptics flows.

No runtime QA log, emulator log, logcat file, upgrade log, screenshot artifact,
or accessibility report exists under `artifacts/android-r3/`. The master
verifier overwrote the earlier QA summary with its own 13-step summary.

`validation-state.json` may only be green if every required suite has an
executed record and durable raw log. The final reported assertion count must be
computed from the JSON, never typed manually.

### R4-P0-004 — “real Android QA” still calls JavaScript internals

`scripts/run-android-qa-suite.mjs` still mislabels WebView-CDP calls as native
Android boundary tests:

1. “Real SAF import” creates JavaScript `File` objects and directly calls
   `extractBookFromFile`; Android DocumentsUI is never opened.
2. “Native Share Sheet export” constructs JSON in JavaScript, clears the
   in-memory library, and directly calls `importLibrary`; it never verifies the
   Android chooser or FileProvider content URI.
3. Back testing directly calls `handleBackButton()` rather than sending Android
   system Back and observing visible UI.
4. Delete All overrides `showActionDialog = async () => true`, bypassing the
   confirmation UI.
5. Airplane-mode commands use `allowFail`, and the proof literally sets
   `offlineCapable: true` as a constant. It does not assert system radio state
   or a failed network probe.
6. Rotation commands use `allowFail`; no physical dimensions/orientation change
   is asserted.
7. Process-kill recovery reads the restored position but asserts only WPM.
8. Upgrade testing installs the same current APK over itself, not a documented
   prior APK built from a different source SHA.
9. Tablet QA checks horizontal overflow only through CDP; it does not walk the
   claimed views or validate clipped controls.
10. Keep Awake and haptics are not proven at the Android boundary.

CDP is allowed for internal state inspection after a real platform action. It
is not a replacement for DocumentsUI, Share Sheet, system Back, system radio
state, rotation, or upgrade installation.

### R4-P0-005 — visual evidence is still mislabeled and stale

There are 58 tracked PNGs but only 38 unique hashes.

Every one of the 58 sidecars has a mismatch between `measuredDimensions` and
the advertised `viewportDimensions`/filename:

- files named `390x844`, `320x568`, and `844x390` are physically `320x640`;
- tablet files named `800x1280` are physically `2560x1600` and landscape;
- multiple distinct view/viewport names share identical bytes.

All 58 sidecars claim source SHA `f42cb512...`, not final R3 SHA `7dadf634...`.
All 58 claim APK hash `47ab3b7e...`, not the final durable APK hash
`3c6217cb...`.

The test compares PNG dimensions only with `measuredDimensions`, while ignoring
the declared viewport, filename, orientation, final source SHA, and final APK
hash. Deduplication is limited to the workflow directory and ignores invalid
duplicates in the matrix.

There are also two sidecar names per PNG (`file.json` and `file.png.json`) even
though R3 required exactly one.

Concrete visual contradictions:

- `step_6_export_triggered.png` shows Settings with a stale “Bookmark added”
  toast, not an export chooser;
- `tablet_800x1280_es_settings.png` shows the Spanish landing page covered by
  the Android dialog **“System UI isn't responding”**, not Settings;
- nevertheless the report claims zero ANR and truthful state capture.

Do not retain these images as passing release evidence.

### R4-P0-006 — accessibility is one aggregate screen, not required coverage

The accessibility JSON has only aggregate fields and 39 controls. It has no
device, locale, view/state, focus-order, enabled/disabled, or per-screen
coverage records. The generator calls the audit once on the phone after the
workflow, and not across the claimed phone/tablet × EN/RU/ES × view matrix.

Therefore `100%` means only “39 currently visible elements passed a simple DOM
size/name check,” not release accessibility compliance.

### R4-P1-007 — reproducible clone reuses `node_modules`

`scripts/package-release-r3.mjs` clones the remote SHA, then copies the warm
worktree's `node_modules` into that clone. This proves source checkout but not a
reproducible dependency install. Run `npm ci` in the validation clone from the
lockfile. Preserve its output and `npm audit` result.

### R4-P1-008 — build logs contain unresolved Kotlin metadata errors

The Gradle command exits zero, but `gradle-build.log` repeatedly contains:

`Module was compiled with an incompatible version of Kotlin. The binary version
of its metadata is 2.2.0, expected version is 2.0.0.`

Determine which task emits this and why the overall build continues. Align the
Kotlin/plugin configuration if needed. The final report must either eliminate
these errors or classify them precisely with evidence that the shipped app and
lint result are unaffected; do not call a log containing unexplained `e:` lines
“zero errors.”

### R4-P1-009 — cold-start reporting is not comparable

On an independently started, no-snapshot API 36 phone AVD, the final APK first
showed a blank white WebView, then the real landing page. Android logcat recorded
`Displayed team.ibet.paceflow/.MainActivity ... +11s733ms`, not the reported
2.7 seconds. This may be emulator/WebView first-run initialization rather than
an app regression, but it must be measured honestly:

- cold AVD + first install/first launch;
- warm app relaunch on an already booted AVD;
- subsequent app launch after force-stop.

Record each separately. Fail on an indefinitely blank WebView or fatal console
error. The repeated safe-area console error must be investigated and either
fixed or explicitly classified.

### R4-P1-010 — toolchain discovery is not yet R4/persistent-shell clean

A fresh non-interactive SSH command still sees empty `ANDROID_HOME` and
`ANDROID_SDK_ROOT`, and `adb`/`emulator` are not on PATH. The doctor succeeds on
R3 because it discovers `/opt/android-sdk` itself. It also hard-codes the R3
branch name, so it immediately fails after correctly switching to the R4
branch.

Make branch expectation an explicit argument/environment/config value and make
the project toolchain environment reproducible for non-interactive SSH and
subprocesses. It is acceptable to use a checked project env launcher instead of
global PATH, but every release script must use it consistently and print the
resolved absolute tools. Do not weaken the canonical branch guard.

## 4. Required R4 implementation

### Phase A — make the clean-checkout gate real

1. Update the doctor/launchers for the R4 branch without weakening host/path/
   branch validation. Ensure non-interactive release commands deterministically
   resolve `/opt/android-sdk` and JDK 21.
2. Fix `npm run test:unit` so this exact sequence passes in a new clone with no
   `dist`, `dist-native`, artifacts, Android build output, or copied modules:

   ```bash
   git clone --branch mission/android-r4-qa-truth-20260813 \
     git@github.com:DoroninDobroCorp/RSVP_reader.git /tmp/<new-dir>
   cd /tmp/<new-dir>
   npm ci
   npm run test:unit
   ```

3. Required result: zero failures and zero skips.
4. No unit test may read release evidence as proof that an emulator ran.
5. No default object may pre-populate a `PASSED` status.
6. Build-dependent tests must make and clean isolated temporary build outputs.
7. Add `test:clean-checkout` that automates this without recursively invoking
   itself and proves the source clone stays clean.
8. Fix package module-type warnings where practical; do not hide stderr.

### Phase B — execute the real Android boundary

Replace each false platform claim with one of two honest outcomes:

- a real Android system/UI action with observable assertions and raw evidence;
- or a clearly named parser/unit test that does not claim native coverage.

Required real phone flows:

1. Fresh no-snapshot AVD boot, fresh APK install, first launch, visible ready
   marker, measured cold/warm times, screenshot, UI hierarchy, and filtered
   logcat.
2. Locale changes via visible controls for EN/RU/ES; visible localized labels and
   legal pages; persistence after force-stop/relaunch.
3. Demo and reader controls via visible taps/key events; assert visible word
   progression, pause, rewind, WPM, and end behavior.
4. Real SAF for all seven formats:
   - push generated non-copyrighted fixtures into emulator storage;
   - tap the app's import control;
   - assert DocumentsUI package/activity is foreground;
   - select the file through UIAutomator/accessibility nodes;
   - assert visible imported title/content in HummingRead.
5. Real backup export:
   - tap the visible export action;
   - assert Android Sharesheet/ResolverActivity is visible;
   - use a minimal test receiver or another deterministic free method;
   - inspect the received `content://` URI and MIME type;
   - prove URI is backed by the restricted `backups/` FileProvider path;
   - import that actual JSON through DocumentsUI and verify exact data.
6. Android system Back via `adb shell input keyevent KEYCODE_BACK` or UIAutomator,
   not direct handler calls. Verify visible hierarchy at each step.
7. Delete All through the visible Settings control and real confirmation dialog,
   then force-stop/relaunch and verify all private content/state is gone.
8. Airplane mode:
   - every state-changing command must return zero;
   - verify `settings get global airplane_mode_on` and transport state;
   - prove an external network request fails;
   - prove local reading/import/export still works;
   - restore state and verify restoration.
9. Rotation:
   - issue a real system rotation command;
   - verify `dumpsys`/window metrics and screenshot dimensions changed;
   - verify exact active book ID, exact index, WPM, theme, bookmark/search state;
   - restore orientation.
10. Process kill: assert exact restored book ID/title, exact index, WPM, theme,
    bookmarks, and search state, not just one field.
11. Upgrade:
    - build/use a documented prior APK from a different prior source SHA with
      the same package ID;
    - record prior SHA and APK hash;
    - create data in the prior version through visible UI;
    - `adb install -r` the final R4 APK;
    - verify exact preserved/migrated data.
12. Keep Awake: observe Android window/power state while playing and after
    pause/background.
13. Haptics: exercise the native plugin boundary and preserve an instrumentation
    or platform-observable record; do not claim physical feel from CDP.
14. Capture full relevant logcat and fail on app crash/ANR. Separately flag any
    System UI ANR because it invalidates visual/platform evidence even if the
    app process did not ANR.

Required tablet flows:

1. Use a separately configured API 36 tablet AVD.
2. Walk visible EN/RU/ES landing, library, normal reader, focus reader, Settings,
   legal, dialog, import picker, and export chooser states.
3. Test portrait and landscape with measured dimensions.
4. Assert no horizontal overflow, clipped primary control, blocked dialog, or
   System UI ANR.

Use CDP only to inspect internal state after the actual Android action. Every
platform assertion must link to raw adb/UI hierarchy/log/screenshot evidence.

### Phase C — regenerate truthful visual evidence

1. Remove/quarantine the current false R3 matrix from release-facing evidence.
2. Generate final evidence only after final source commit and push, using the
   final freshly built APK.
3. Put generated evidence under ignored
   `artifacts/android-r4/evidence/`; do not commit self-referential final images.
4. Use one sidecar only: `<image>.png.json`.
5. Derive filename dimensions from the actual PNG, or configure the emulator so
   the screenshot really matches the desired filename.
6. For every capture assert:

   - actual PNG width/height;
   - actual system orientation;
   - current visible app/system state;
   - at least two locale-specific visible strings where relevant;
   - final live remote source SHA;
   - final APK SHA;
   - AVD/API/config;
   - exact action sequence used to enter the state.

7. Reject duplicates across the entire matrix when filenames claim different
   state, locale, orientation, or dimensions—not only workflow files.
8. Add explicit state recognition for export chooser, DocumentsUI, Settings,
   reader playing/paused, bookmark confirmation, search results, legal pages,
   and Delete All confirmation.
9. Reject screenshots containing “isn't responding”, “keeps stopping”, ANR,
   crash, launcher/home instead of app, blank WebView, or unexpected modal/toast.
10. Verify the final evidence directory contains no sidecar SHA/hash mismatch.

### Phase D — make accessibility coverage represent reality

Produce a record per device × locale × state, not one aggregate array.

At minimum audit on phone and tablet:

- EN/RU/ES landing;
- library;
- normal reader;
- focus reader playing and paused;
- settings;
- bookmarks/search;
- Delete All/action dialogs;
- legal pages;
- import/export entry controls.

For each visible interactive element record state ID, selector/accessibility
node, role, accessible name, enabled/disabled state, focusability/actionability,
measured target rectangle, and the 44×44 rule or a justified inline-link
exception. Report coverage counts by device, locale, and state.

### Phase E — one truthful final verification contract

Refactor the master pipeline so it actually runs and records every result it
summarizes. At minimum include:

1. host/path/branch/toolchain/KVM;
2. live remote SHA match and clean source;
3. clean clone + `npm ci` + hermetic unit;
4. web builds and browser offline PWA at `/` and `/rsvp/`;
5. Chromium production;
6. WebKit/Mobile Safari;
7. unpacked Chrome extension E2E;
8. fresh remote-SHA Gradle clean/test/lint/APK/AAB build;
9. package permissions/metadata/checksums/signing-state inspection;
10. phone platform QA;
11. tablet platform QA;
12. real upgrade QA;
13. screenshot/state/provenance validation;
14. accessibility coverage validation;
15. negative self-tests;
16. npm audit and any performance claim included in the report.

Requirements:

- Each step stores command, timestamps, duration, exit code, stdout/stderr log,
  observed values, and assertion IDs.
- No required `SKIP` is green.
- No old JSON may be accepted as proof of a current run.
- Runtime suites must not be overwritten by a later 13-step summary.
- Generated logs/evidence stay ignored under `artifacts/android-r4/`.
- `validation-state.json` is derived only from executed records.
- The reported total equals `Object.keys(assertions).length` and every assertion
  maps to at least one successful executed record/log.
- The result must fail if a claimed screenshot is stale, duplicated, mislabeled,
  or contains a crash/ANR dialog.

### Phase F — final build ordering

1. Finish and commit source changes.
2. Push R4 branch.
3. Obtain final live remote SHA using `git ls-remote`.
4. Create a brand-new clone from origin at that SHA.
5. Run `npm ci` there—do not copy `node_modules`.
6. Run all source/web/extension/native build gates from that clone.
7. Produce R4 APK/AAB and copy them to:

   - `/srv/RSVP_reader-r2/artifacts/android-r4/HummingRead-R4-debug.apk`;
   - `/srv/RSVP_reader-r2/artifacts/android-r4/HummingRead-R4-review-UNSIGNED-NOT-FOR-UPLOAD.aab`.

8. Run platform QA using that exact final APK.
9. Generate visual/accessibility evidence using that exact final APK.
10. Generate final validation JSON last.
11. Recheck live remote SHA and clean source worktree.
12. If source changes after step 3, repeat the final sequence; never patch
    evidence metadata to pretend an older APK came from a newer commit.

## 5. Negative tests required in R4

Preserve the useful R3 negative tests and add tests proving failure for:

1. clean clone unit depends on pre-existing `dist`;
2. emulator test invents a default `PASSED` result;
3. required runtime suite has no raw log;
4. assertion total in prose differs from JSON;
5. screenshot measured dimensions differ from filename/declared viewport;
6. screenshot source SHA differs from final live remote SHA;
7. screenshot APK hash differs from final APK;
8. duplicate matrix images with different claimed state/viewport;
9. export screenshot is not the Android chooser;
10. screenshot/UI hierarchy contains ANR/crash dialog;
11. SAF claim never foregrounded DocumentsUI;
12. Back claim used direct JavaScript handler rather than system Back;
13. Delete All claim bypassed confirmation;
14. airplane state command failed or external probe still succeeds;
15. upgrade uses the same APK/source SHA twice;
16. validation summary overwrites previously executed runtime records;
17. fresh validation clone copied `node_modules` instead of `npm ci`;
18. unexplained Kotlin incompatibility errors remain in a “zero errors” log.

Each negative test must fail for the intended reason using an isolated fixture.

## 6. Definition of R4 done

R4 is done only when all of the following are simultaneously true:

- clean remote clone unit tests pass with zero failures/skips;
- actual browser/web/extension regression suites are linked in evidence;
- fresh APK/AAB are built after `npm ci` from final live remote SHA;
- the final APK installs, reaches a visible ready state, and completes the real
  phone/tablet flows;
- SAF, share, Back, Delete All, airplane, rotation, process kill, and upgrade
  cross the Android boundary;
- final screenshots match dimensions, state, locale, source SHA, and APK hash;
- no screenshot contains ANR/crash/blank/unexpected system UI;
- accessibility has device/locale/state coverage;
- validation JSON contains every required executed suite, with raw logs, and no
  unsupported `PASSED` claim;
- local and live remote R4 SHAs match and source worktree is clean;
- production remains untouched.

If a required platform action cannot be automated reliably, report that gate as
`BLOCKED`/`FAIL` with raw evidence. Do not relabel a parser/CDP test as native QA.

## 7. Required final report

The final response must be generated from the final files and include:

1. host/path/branch/local SHA/live remote SHA;
2. clean source status and unchanged production SHA;
3. exact tool versions/paths;
4. exact command results and test pass/fail/skip counts;
5. exact APK/AAB `stat` values, hashes, metadata, permissions, and signing state;
6. cold-first/warm/force-stop launch timings separately;
7. phone/tablet real scenario results with raw log paths;
8. prior/final APK source SHAs and hashes for upgrade;
9. screenshot total, unique total, prohibited duplicate total, dimension/state/
   provenance mismatch totals, and rejected-frame total;
10. accessibility coverage by device/locale/state;
11. exact assertion count read from final JSON;
12. all remaining owner-only gates;
13. every failed, blocked, or unexecuted gate plainly stated.

Never say “tester-ready”, “end-to-end”, “real SAF”, “0 ANR”, or “all gates
passed” unless the final raw artifacts mechanically prove that exact claim.
