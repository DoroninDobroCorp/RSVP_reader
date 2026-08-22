# Android R5 recovery audit

Audit date: 2026-08-22
Review branch: `mission/android-r5-recovery-20260814`
Tested source SHA: `96748319cb506fbbd7f8b5f40f9ef8fd14456ba3`
Final disposition: **NOT READY for Android R5 sign-off**

## Executive summary

The prior R5 result was not trustworthy: its master gate omitted browser and Android runtime work, tracked stale evidence in Git, reused identical-version upgrade bytes, allowed failed platform commands, substituted CDP for visible Android interactions, and emitted hard-coded PASS claims without source/APK-bound proof.

The recovery work removes that false-green path. The replacement gate is fail-closed, runs from an exact remote SHA in a fresh detached clone, requires exactly 105 unit subtests, binds Android artifacts to the tested source SHA and SHA-256, and records required Android scenarios individually.

The final clean-clone master run completed 22 of 24 planned steps: **21 PASS, 0 FAIL, 1 BLOCKED, 2 SKIPPED**. The block is deliberate: all 16 required Android phone/tablet runtime scenarios lack trusted visible-UI evidence. Visual/accessibility capture and final evidence acceptance were therefore skipped as dependent steps.

No production deployment, store upload, pull request, GitHub Actions run, or force push was performed.

## Verified results

| Area | Result | Evidence |
|---|---:|---|
| Git provenance | PASS | clean detached clone; local SHA equals remote release-branch SHA |
| Toolchain | PASS | JDK 21.0.11, SDK/API 36, adb, emulator 37.1.11, aapt2, Gradle 8.14.3, KVM |
| Clean checkout unit gate | PASS | 105/105, 0 failed, 0 skipped |
| Chromium production regression | PASS | 77/77 |
| WebKit + Mobile Safari | PASS | 142/142 |
| Chrome extension E2E | PASS | EN/RU/ES plus interactive reader/shortcuts/Quick Send |
| Lighthouse mobile | PASS | EN 90/96/100/100; RU 100/96/96/100; ES 100/96/96/100 (performance/accessibility/best-practices/SEO) |
| Deterministic web/extension output | PASS | 57 files; SHA-256 `39195411f8b54a50680f94e4a2b05608617d04dcb006473cf95b0dbe682b8dc6` |
| Gradle | PASS | `clean testDebugUnitTest lintDebug assembleDebug bundleRelease` |
| Android privacy/package | PASS | no dangerous or INTERNET permission; local assets; no telemetry SDK; SHA-bound APK/AAB |
| Negative verifier demonstrations | PASS | 25/25 |
| Android API 36 runtime QA | BLOCKED | 0 PASS, 0 FAIL, 16 BLOCKED |
| Visual/accessibility matrix | SKIPPED | depends on trusted runtime execution |
| Final Android evidence acceptance | SKIPPED | depends on runtime and visual evidence |

Lighthouse performance is aggregated as the median of three runs per locale; accessibility, best-practices and SEO use the minimum of the three. Thresholds remain 90/95/95/95.

## Android artifacts

Review-only application ID remains `team.ibet.paceflow`; product configuration still marks the final Android application ID as unapproved. R5 uses versionCode 201 so a genuine R4 versionCode 200 to R5 versionCode 201 upgrade can be tested.

- APK: `/srv/hummingread/artifacts/android-r5/runs/96748319cb506fbbd7f8b5f40f9ef8fd14456ba3/HummingRead-R5-debug.apk`
  - SHA-256: `3f74067a236121315fdc4cb4468526242a9023f368eb6c55703a3d5712c76a26`
- Review AAB: `/srv/hummingread/artifacts/android-r5/runs/96748319cb506fbbd7f8b5f40f9ef8fd14456ba3/HummingRead-R5-review-UNSIGNED-NOT-FOR-UPLOAD.aab`
  - SHA-256: `3e7197dbb4e2fe36e1bc55955551656472d8ad91f3870c12e638418625d71f74`
  - This AAB is unsigned and explicitly not for upload.

## Runtime blockers

| ID | Required scenario | Why it remains blocked |
|---|---|---|
| VAL-R5-EMU-001 | Phone install; first/cold/warm launch | no trusted first meaningful paint and white-frame timing |
| VAL-R5-EMU-002 | Phone EN/RU/ES and offline legal pages | prior locale/legal flow used CDP or incomplete visible UI |
| VAL-R5-EMU-003 | Playback, pause, rewind, WPM | prior controls were invoked through CDP |
| VAL-R5-EMU-004 | SAF imports for seven formats | no fresh SHA-bound screenshots, UI trees, command records and fixture hashes |
| VAL-R5-EMU-005 | Sharesheet export and picker re-import | no deterministic receiver/save route and exact-byte re-import proof |
| VAL-R5-EMU-006 | System Back hierarchy | prior state setup used CDP |
| VAL-R5-EMU-007 | Delete All cancel/confirm | prior actions were issued through CDP |
| VAL-R5-EMU-008 | Airplane-mode offline playback | prior playback used CDP and radio-state proof was incomplete |
| VAL-R5-EMU-009 | Phone rotation survival | no complete before/after screenshots and measured geometry sidecars |
| VAL-R5-EMU-010 | Exact process-death restore | book ID, word index, WPM and changed setting were not all reasserted |
| VAL-R5-EMU-011 | R4→R5 upgrade preservation | new versionCode 201 build exists but the real upgrade has not been executed |
| VAL-R5-EMU-012 | KeepAwake and haptic observation | prior runner treated empty dumpsys output as affirmative and captured no vibrator event |
| VAL-R5-EMU-013 | Tablet install/distinct profile | prior tablet evidence is stale and not source/APK-bound |
| VAL-R5-EMU-014 | Tablet localized layouts/dialogs | no complete EN/RU/ES UI matrix |
| VAL-R5-EMU-015 | Tablet rotation survival | no dedicated measured tablet rotation proof |
| VAL-R5-EMU-016 | Tablet SAF import and system Back | no fresh Android-system-boundary evidence |

## Material corrections made

- Expanded the master gate from a partial static sequence to 24 planned checks covering clean checkout, browsers, extension E2E, Lighthouse, Gradle, privacy, package integrity, negative tests, Android runtime, visual/accessibility and evidence acceptance.
- Made detached validation clones legal only when clean and exactly equal to the remote review-branch SHA.
- Enforced exactly 105 unit tests and prohibited generated output/evidence in a clean clone.
- Removed 180 tracked stale Android evidence files; runtime evidence is now ignored and stored under a tested-SHA namespace.
- Replaced the legacy unit test that manufactured tiny fake APK/AAB artifacts and a fake emulator PASS with a hermetic schema-only fixture.
- Added Android evidence verification for source/APK hashes, one canonical sidecar, PNG dimensions and uniqueness, command records, no `allowFail`, no CDP substitution, raw logs, and accessibility UI trees.
- Bound privacy/package audits to fresh R5 artifacts and `build-summary.json` rather than falling back to R2/R3/R4 outputs.
- Changed R5 versionCode from 200 to 201 to make an actual upgrade test possible.
- Removed a layout-property transition that caused intermittent Mobile Safari overlap; the focused regression reproduced 1/10 before and passed 20/20 after the fix.
- Replaced single-sample Lighthouse scoring with three-run aggregation without lowering thresholds.

## Evidence locations

- Master status: `/srv/hummingread/artifacts/android-r5/runs/96748319cb506fbbd7f8b5f40f9ef8fd14456ba3/validation-state.json`
- Build provenance: `/srv/hummingread/artifacts/android-r5/runs/96748319cb506fbbd7f8b5f40f9ef8fd14456ba3/build-summary.json`
- Android blockers: `/srv/hummingread/artifacts/android-r5/runs/96748319cb506fbbd7f8b5f40f9ef8fd14456ba3/qa-summary.json`
- Master console: `/srv/hummingread/artifacts/android-r5/runs/96748319cb506fbbd7f8b5f40f9ef8fd14456ba3/master-console.log`
- Per-step logs: `/srv/hummingread/artifacts/android-r5/runs/96748319cb506fbbd7f8b5f40f9ef8fd14456ba3/master-logs/`

## Reviewer recommendation

The branch is suitable for source/build review, but **must not be represented as Android R5-ready**. Sign-off requires implementing a trusted Android UI runner, executing all 16 scenarios on the dedicated API 36 phone and tablet profiles, collecting unique SHA-bound screenshots and accessibility hierarchies, then rerunning the same clean-clone master gate to 24/24 PASS.
