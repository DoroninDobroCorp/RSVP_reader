# HummingRead Android R5 — recover the interrupted R4 run and produce truthful tester evidence

## Mission in one sentence

Continue from the preserved interrupted R4 checkpoint, keep the real product/build improvements, replace the misleading Android QA with real Android-system flows, and leave a reproducible tester candidate whose claims can be independently verified from a clean checkout.

This document is self-contained. Do not depend on chat history, a previous executor's memory, or prose summaries. Read it completely before changing code.

## 1. Canonical execution boundary

- Work only through SSH on `serverforvovka`.
- Canonical worktree: `/srv/RSVP_reader-r2`.
- Required branch: `mission/android-r5-recovery-20260814`.
- Starting source/checkpoint SHA: `8e91d5bcaa96a519de2866240b2f66d08da1738e`.
- Immutable forensic checkpoint: `origin/checkpoint/android-r4-interrupted-20260814` at that same SHA.
- Original partially pushed R4 branch: `origin/mission/android-r4-qa-truth-20260813` at `4bad99546a1e0c8dd838aae5fd18aeff11d4dd45`.
- Production worktree: `/srv/RSVP_reader` at `29b65d7d6631b3ec6c534acb351e6ef3b5a0fcc4`. Do not modify it.
- Remote: `git@github.com:DoroninDobroCorp/RSVP_reader.git`.

Before work:

```bash
ssh serverforvovka
cd /srv/RSVP_reader-r2
git fetch origin
git switch mission/android-r5-recovery-20260814
git pull --ff-only
test "$(git merge-base HEAD origin/checkpoint/android-r4-interrupted-20260814)" = "8e91d5bcaa96a519de2866240b2f66d08da1738e"
git status --short --branch
```

If the required branch or starting SHA is not present, stop and report the exact Git state. Never reconstruct missing history from production.

Forbidden:

- touching, deploying, restarting, or merging `/srv/RSVP_reader`;
- pushing or merging `main`;
- force-push, history rewriting, destructive reset, or deleting the checkpoint;
- PRs, GitHub Actions, or paid GitHub features;
- App Store/Google Play publication or production signing;
- using old evidence as proof of a new pass;
- inventing `PASSED`, filling missing results with defaults, or converting a failure/blocker into prose success;
- describing CDP/JavaScript calls as SAF, DocumentsUI, Sharesheet, system Back, rotation, process death, upgrade, KeepAwake, haptics, or other platform QA.

## 2. State independently reproduced by the auditor

### 2.1 Real progress to preserve

The interrupted executor did leave useful work. Do not restart the product or discard it wholesale.

- Java 21, Android SDK 36, `adb`, emulator 37.1.11.0, AVD tooling, Gradle 8.14.3, and KVM access exist on the server.
- The app builds into a real APK and unsigned review AAB.
- A previous APK was independently installed and launched on API 36 without an immediate app crash.
- Current `npm run test:unit` passes 98/98 in the warm worktree.
- A fresh temporary clone of current HEAD, followed by `npm ci` and `npm run test:unit`, also reaches 98/98.
- The remote R4 work added useful Kotlin/toolchain corrections, hermetic source-build changes, fail-closed verifier work, and 18 negative-test concepts.
- The unpushed portion added an R4 packaging script and began rewriting the Android QA suite.
- Current R4 artifacts physically exist:
  - APK SHA-256 `df66d233a2c90de47b95d84e0756e1bb898ea9480b951e7b8d034de38659eb03`;
  - unsigned AAB SHA-256 `c20d6bac1dfb2c68c85f3c8b5b77a9334ea4ae3aa15c9b6c8a1414876d231f3d`.
- These hashes prove file identity only. They do not prove R5 QA or release readiness.

### 2.2 Why R4 is not accepted

The executor made 101 local commits after the last pushed R4 state, most of them repeated mutually contradictory AVD-launch tweaks. No complete final R4 Android run exists.

At audit time:

- the worktree was clean at checkpoint SHA `8e91d5b...`;
- one stale phone emulator was still running;
- R4 `evidence-summary.json` described build SHA `7c97041...`, remote SHA `4bad995...`, and `gitShaSynced: false`;
- R4 `validation-state.json` came from the earlier 13-step non-emulator pipeline at `4bad995...`;
- emulator logs contained QEMU hanging-thread errors;
- no final R4 phone + tablet result covering `VAL-R4-EMU-001..013` was produced.

Treat every R2/R3/R4 runtime assertion and screenshot as historical input, not current proof.

## 3. Reproduced failing requirements

### R5-P0-001 — the clean-checkout command lies about a successful unit run

`npm run test:clean-checkout` creates a fresh clone, runs `npm ci`, and the nested unit suite reaches 98 pass / 0 fail / 0 skip. The wrapper then reports `0 passed, -1 failed, -1 skipped` and exits 1 because it expects TAP lines such as `# pass`, while the current Node reporter prints summary lines such as `ℹ pass`.

Required correction:

- select an explicit machine-parseable reporter instead of parsing human console decoration;
- check the child exit code;
- parse an exact structured count;
- require exactly the expected test count, 0 failed, 0 skipped/cancelled/todo;
- verify the clone contains no copied `node_modules`, `dist`, `dist-native`, artifacts, or evidence;
- never overlay uncommitted work for the release gate;
- add a separate developer convenience mode if overlay behavior is still desired, clearly named non-release.

### R5-P0-002 — a unit test still manufactures emulator success

`tests/unit/android-emulator-smoke.test.js` constructs a default summary and fills legacy emulator assertions with `PASSED` when evidence is absent. Therefore a clean checkout can claim a “Real Android API 36 Emulator QA Suite” in about two milliseconds without an emulator or evidence.

Required correction:

- remove every default/generated `PASSED`;
- unit tests may validate a committed synthetic schema fixture, but their title must say schema/verifier contract, not real emulator QA;
- real Android execution must be a separate mandatory command;
- absent runtime evidence must fail the runtime verifier, not silently pass or be skipped;
- unit tests must remain hermetic and must not depend on ignored runtime artifacts.

### R5-P0-003 — current “real SAF import” is still JavaScript file injection

`scripts/run-android-qa-suite.mjs` only searches for a DocumentsUI package. It then creates a browser `File` over CDP, calls `extractBookFromFile`, and inserts the result directly into the library.

Required correction:

- push synthetic fixtures to an explicit device-visible location;
- activate the app's visible Import control;
- prove the top activity/package changed to Android DocumentsUI or the configured system picker;
- select the physical fixture through the Android UI;
- prove the app returned from the picker and imported the selected filename/content;
- run EPUB, FB2, DOCX, TXT, HTML, Markdown, and RTF through that boundary;
- save command outputs, UI hierarchy, top-activity evidence, fixture hashes, and screenshots;
- CDP may inspect final app state, but it may not create the input file or call the import parser for this assertion.

### R5-P0-004 — current Sharesheet proof is fabricated

The script builds backup JSON in JavaScript, empties the library, and calls `importLibrary` with a browser File. It writes a hard-coded `content://...` URI and chooser activity into the log without observing either.

Required correction:

- trigger Export Backup through the visible app UI;
- prove an Android Resolver/Chooser activity is actually foregrounded;
- capture the real share intent, MIME type, and granted `content://` URI using system evidence;
- prove the URI is restricted to the intended FileProvider path;
- complete a deterministic receiving/saving route or a purpose-built local test receiver, then re-import the exact resulting bytes through the real picker;
- verify the restored book/settings payload and cleanup behavior;
- if the server image cannot complete this boundary reliably, mark the assertion `BLOCKED` with raw evidence. Do not synthesize a pass.

### R5-P0-005 — Back and Delete All use forbidden fallbacks

The script sends KEYCODE_BACK but calls `handleBackButton()` directly if the platform action fails. Delete All replaces `showActionDialog` with an always-true function.

Required correction:

- use actual UI actions to open the modal/reader/RSVP state;
- send real `adb shell input keyevent KEYCODE_BACK` for each layer;
- remove all direct-handler fallback;
- test Delete All twice through real UI: Cancel preserves data, Confirm deletes it;
- capture the Android/app UI state before and after each action;
- any missing platform response is a failure.

### R5-P0-006 — airplane mode and rotation remain assertions by declaration

Airplane commands use `allowFail`, the proof sets `offlineCapable: true` as a constant, and rotation only reads current focus. It never proves display orientation changed.

Required correction:

- platform commands used as proof must have checked exit codes and preserved stdout/stderr;
- enable airplane mode, verify global setting and network/radio state, then open a stored book and visibly advance playback while offline;
- restore the initial radio state in `finally`, even on failure;
- disable auto-rotate deterministically, rotate to landscape, prove actual display orientation/geometry changed, verify exact book/index/WPM, rotate back, and prove restoration;
- screenshots and sidecars must carry the measured device/display state.

### R5-P0-007 — process-death and upgrade checks are incomplete

The force-stop test only fails on a wrong WPM; it writes the restored position to a log without asserting it. The upgrade test installs the same current APK over itself.

Required correction:

- select a named book, exact book ID, exact word index (for example 24), exact WPM, and another changed setting;
- persist and drain writes;
- HOME/background, `am force-stop`, prove the old PID is gone, relaunch, then require exact restoration of every value;
- for upgrade, use a distinct earlier APK with a lower version code and compatible signature;
- record old/new APK hashes, package version codes, install output, and signature compatibility;
- create data under the old APK, install the R5 APK with `-r`, and require exact preservation;
- reinstalling the same bytes or same version is not an upgrade test;
- if no compatible prior artifact exists, report `BLOCKED` honestly.

### R5-P0-008 — KeepAwake, haptics, tablet and launch timing are not proven

The script accepts an empty `FLAG_KEEP_SCREEN_ON` result and substitutes prose saying it is active. Haptics are not tested. The tablet AVD had been mutated during the loop and its log identified `test_tablet_api36` while booting a phone-sized `1080x2400` skin. Cold timing is CDP readiness timing, not a controlled first/cold/warm matrix.

Required correction:

- never replace empty command output with affirmative prose;
- prove KeepAwake state while playing and its release while paused/backgrounded using observable Android state;
- exercise the haptic path through actual UI and capture an observable vibrator/service event, or mark it blocked;
- recreate or repair only the dedicated test AVDs so phone and tablet have unambiguous, different hardware profiles and geometry;
- assert AVD name, serial, API, physical size, density, orientation, and model before each suite;
- do not mutate the tablet profile into `pixel_6` to make it boot;
- run phone and tablet sequentially if memory requires it;
- record first launch after install, controlled cold launch, and warm launch as separate metrics;
- capture the initial white-screen duration and time to first meaningful HummingRead paint, not merely `am start` return time.

### R5-P0-009 — AVD lifecycle code is brittle and polluted by the interrupted loop

The current launch code uses unqualified `adb wait-for-device`, broad “first device” selection, detached shell nesting, a fixed insecure gRPC port, and `stopAllEmulators()` returns early when ADB shows no device even if an orphan QEMU process exists. A prior source revision also mutated AVD config files at runtime, so on-disk AVD state cannot be trusted.

Required correction:

- inspect and document current test AVD configuration before changing it;
- preserve a recoverable backup before recreating only `test_avd_api36` and `test_tablet_api36`;
- make AVD creation idempotent from explicit device/system-image parameters;
- own the emulator PID and expected serial; never select the first arbitrary device;
- wait for that serial and verify its AVD name;
- use bounded timeouts with useful diagnostics;
- terminate only the emulator instance started by the suite;
- always clean forwards and temporary state in `finally`;
- no broad `pkill`, no deleting unrelated locks, no kill of production/server processes;
- if QEMU reports hanging CPU/main-loop threads, fail with log path rather than committing another blind flag change.

### R5-P0-010 — runtime evidence and artifact namespaces are contaminated

The current QA script writes R4 results and a checksum line naming an R4 APK into R2 and R3 artifact directories. Existing R4 build summary and validation state refer to different SHAs. Old screenshots are stale and duplicated.

Required correction:

- R5 may write only to a fresh R5 evidence namespace;
- never overwrite R2/R3/R4 evidence or checksums;
- purge/recreate ignored R5 runtime output before a run;
- every result must include tested source SHA, remote source SHA, APK/AAB hash, device serial/profile/API/geometry, command/action method, start/end time, exit code, raw log path, and status;
- assertions must be derived from executed check records; no independent hard-coded assertion map;
- a missing/empty/stale/mismatched record fails closed.

## 4. Required implementation plan

### Phase A — stabilize the repository gates

1. Run `git status`, inspect all 101 interrupted commits as a combined diff, and keep only changes that are coherent at current HEAD.
2. Fix `test:clean-checkout` using an explicit structured/test reporter.
3. Remove the fake emulator-success defaults and rename schema-only tests truthfully.
4. Make negative tests exercise the real verifier/parser or real source/evidence fixtures, not only isolated toy objects.
5. Add checks that fail on:
   - CDP-triggered native boundary assertions;
   - `allowFail` proof commands;
   - hard-coded affirmative fallback text;
   - same-hash/same-version “upgrade”;
   - wrong phone/tablet geometry;
   - cross-milestone writes;
   - missing raw evidence;
   - stale SHA/APK hash;
   - duplicate or dimension-mismatched screenshots.
6. From a genuinely fresh clone run `npm ci`, explicit build prerequisites, and the full hermetic unit gate.

### Phase B — make emulator orchestration deterministic

1. Stop the stale dedicated test emulator gracefully and record its prior state.
2. Repair/recreate only the two dedicated test AVDs from explicit configurations.
3. Implement serial/PID-owned sequential launch with bounded boot and app-readiness checks.
4. Capture emulator stdout/stderr, `adb devices -l`, getprops, `wm size`, density, orientation, memory, and top activity.
5. Add a small orchestration self-test for stale ADB transport, orphan process, wrong AVD, boot timeout, and cleanup-on-failure.
6. One unsuccessful boot produces one diagnostic result. Do not create dozens of microcommits that alternate launch flags without a controlled hypothesis and verification.

### Phase C — execute real Android boundary tests

Implement a structured test runner. For every assertion store:

- assertion ID and human-readable name;
- preconditions;
- device/serial/profile;
- exact actions and whether each is Android UI, ADB platform command, or supplementary CDP observation;
- checked exit codes;
- before/after state;
- screenshot/UI hierarchy/logcat paths;
- duration;
- `PASS`, `FAIL`, or `BLOCKED` plus reason.

Required phone scenarios:

1. install, first/cold/warm launch, first meaningful paint, crash/ANR scan;
2. EN/RU/ES visible UI and offline legal pages;
3. visible demo playback, pause, rewind, WPM change;
4. real SAF import for all seven formats;
5. real backup Sharesheet, real exported bytes, real picker re-import;
6. real system Back hierarchy with no fallback;
7. real Delete All Cancel then Confirm;
8. verified airplane-mode offline playback and safe restoration;
9. verified portrait/landscape state survival;
10. exact process-force-stop restoration;
11. distinct-version APK upgrade preservation;
12. KeepAwake acquire/release and haptic observation.

Required tablet scenarios:

13. install/launch on a genuinely distinct tablet profile;
14. EN/RU/ES landing, library, reader, RSVP, settings, and dialogs with no clipping/overflow;
15. portrait and landscape state survival;
16. a representative real SAF import and system Back flow.

CDP is permitted only for supplementary app-state setup/inspection when the tested boundary itself is still performed by Android UI/system actions. Every result must label CDP use explicitly.

### Phase D — regenerate visual and accessibility evidence

After the final APK is built from the tested source SHA:

- take screenshots with `adb exec-out screencap -p` from the actual target device;
- record real PNG dimensions by decoding each PNG;
- maintain exactly one sidecar per screenshot;
- sidecar source SHA and APK hash must match the tested candidate;
- matrix filename, measured device geometry, and orientation must agree;
- reject duplicate hashes for states that should visibly differ;
- include system UI screenshots for DocumentsUI, Sharesheet, confirmation dialog, and rotation where relevant;
- scan images for visible ANR/System UI error dialogs before passing.

Accessibility:

- save Android UIAutomator/accessibility hierarchy per critical state, locale, and device class;
- verify actionable controls have nonblank accessible names, enabled/focusable state as appropriate, and sane bounds;
- check touch target sizes, focus order, clipping, contrast, text scaling, and landscape behavior;
- CDP AX-tree/axe may supplement but not replace Android hierarchy evidence;
- do not claim full TalkBack/manual screen-reader QA unless actually performed; leave that as an explicit owner gate if unavailable.

### Phase E — build one real master gate

Create one documented R5 validation command that actually executes, rather than merely scans old files:

- toolchain doctor;
- clean-checkout `npm ci` + hermetic unit tests;
- web/native/extension builds;
- package/privacy/permission checks;
- Chromium production regression;
- WebKit and Mobile Safari regression;
- real extension E2E;
- Lighthouse/visual web checks;
- Gradle clean/test/lint/assemble/bundle;
- Android phone and tablet QA;
- Android visual/accessibility evidence validation;
- artifact/checksum/signing-state validation;
- all negative self-tests.

The master gate must:

- run required suites itself;
- stop on a required failure;
- keep `BLOCKED` distinct from `PASS`;
- report exact passed/failed/blocked/skipped counts;
- never infer success from a filename or prose report;
- preserve raw logs for every child command;
- reject old source SHA, old artifact hash, missing file, empty log, duplicate assertion, and duplicate screenshot.

## 5. Two-SHA evidence model — avoid the final-commit paradox

Use this exact ordering:

1. Finish all source, tests, and scripts.
2. Ensure the source worktree is clean.
3. Commit and push the source candidate.
4. Record this immutable commit as `TESTED_SOURCE_SHA` and verify it with `git ls-remote`.
5. Clone exactly `TESTED_SOURCE_SHA` into a new temporary directory.
6. Run `npm ci`; do not copy `node_modules`, `dist`, Gradle outputs, artifacts, or evidence.
7. Build APK/AAB and execute the entire master gate from that clone.
8. Store raw runtime evidence outside tracked source or under ignored `artifacts/android-r5/<TESTED_SOURCE_SHA>/` on the server.
9. If any source file changes, discard the run and create a new tested source SHA.
10. Optionally commit only a small final report/manifest afterward. It must distinguish:
    - `testedSourceSha` — the release candidate that was built and tested;
    - `reportCommitSha` — the later documentation-only commit.
11. The report commit must contain no source/build/test-script changes. Otherwise rerun everything.

This keeps Git history honest while allowing an auditable report to exist in Git.

## 6. Required negative demonstrations

Deliberately demonstrate that the R5 verifier fails for at least these cases:

1. missing/wrong Java 21;
2. missing SDK 36;
3. dirty source checkout;
4. source SHA absent from remote;
5. copied/pre-existing `node_modules` or `dist` in the validation clone;
6. missing or stale APK;
7. checksum mismatch;
8. unexpected INTERNET/dangerous permission;
9. broad FileProvider path;
10. unit test count mismatch/failure/skip;
11. absent runtime assertion evidence;
12. CDP used to perform SAF/share/system action;
13. platform proof command allowed to fail;
14. hard-coded/default `PASSED`;
15. same APK/version used for upgrade;
16. phone profile used as tablet;
17. screenshot filename/PNG/device dimensions mismatch;
18. stale source SHA/APK hash in sidecar;
19. duplicate workflow screenshot;
20. cross-writing R5 results into R2/R3/R4 directories;
21. empty log or orphan assertion;
22. Android QA child command omitted from master gate.

Every negative case must exercise production verifier logic or a realistic fixture fed through it. A toy helper tested in isolation is insufficient if the real master gate does not call that helper.

## 7. Definition of done

R5 is done only when all of the following are true:

- current source branch and remote tested source SHA match;
- source candidate worktree is clean;
- fresh clone + `npm ci` succeeds with no copied generated state;
- clean-checkout wrapper reports the true exact unit totals and exits 0;
- no test manufactures runtime success;
- Gradle clean/test/lint/assemble/bundle completes without unresolved Kotlin metadata errors;
- final APK installs and launches on controlled API 36 phone and tablet AVDs;
- required native boundaries are performed by Android UI/system actions;
- no direct-handler fallback or affirmative placeholder exists;
- force-stop restores exact book/index/WPM/settings;
- upgrade uses distinct compatible versions/hashes;
- visual evidence is fresh, correctly sized, nonduplicated, and bound to tested source/APK;
- accessibility coverage is truthfully scoped;
- master gate actually executes every required suite;
- all required assertions are PASS, or the final status is honestly NOT READY with explicit FAIL/BLOCKED items;
- tester APK/AAB paths and checksums are correct;
- AAB remains clearly labelled unsigned/not for upload unless owner signing is provided;
- production remains exactly unchanged;
- completed work is committed and pushed to a review branch without PR/Actions.

Passing code is preferred, but an honest reproducible `NOT READY` with precise blockers is acceptable. Fabricated green evidence is not.

## 8. Required final report

Return one concise report containing:

- review branch;
- tested source SHA and verified remote SHA;
- optional report commit SHA, clearly distinguished;
- production SHA proving it was untouched;
- exact toolchain versions and AVD profiles/geometries;
- exact commands, exit codes, and durations;
- unit/browser/extension/Gradle/Android counts;
- each native Android assertion with PASS/FAIL/BLOCKED and raw evidence path;
- APK/AAB paths, sizes, SHA-256, package/version/min/target SDK, permissions, and signing state;
- visual/accessibility counts and validation results;
- first/cold/warm launch measurements;
- negative-test count;
- remaining owner/manual gates;
- statement that no PR, Actions, paid GitHub feature, production deploy, or store upload occurred.

Do not say “fully complete”, “tester-ready”, “real native QA passed”, or “all green” unless the saved records prove every corresponding claim.

## 9. Commit discipline

- Prefer a small number of logical commits: repository gates, emulator orchestration, native scenarios, evidence verifier, final report.
- Do not create a commit for every emulator flag experiment.
- Before each commit run `git diff --check` and the relevant targeted tests.
- Before every push confirm the current branch explicitly.
- Push only the R5 review branch.
- Never open a PR.
