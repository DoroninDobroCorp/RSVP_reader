# iOS minimal reader — HummingRead 1.0 (3)

The owner explicitly requested installing the new minimal interface on the connected iPhone. Canonical application edits were made through SSH on serverforvovka:/srv/hummingread, on mission/android-r5-recovery-20260814. The Mac was used only for a checksummed build export, Xcode, existing Personal Team signing, backup, installation and observations.

## Installed result

Source: a8db8bfcd0242c37db93e9d475fbe57f5b45be0d. Version 1.0, build 3, unchanged bundle ID team.ibet.paceflow. Installed over build 2 on the physical iPhone 13 Pro / iOS 26.6.1 without uninstalling. An independent installed-app query and running-process query confirmed build 3 after launch. Xcode's device screenshot shows the minimal home with the existing library and Continue card.

The iOS default is the minimal interface: books, import/paste, ordinary text, single-word reading and the compact Aa sheet. EN/RU/ES remain available. “All tools” opens packaged full.html locally; its home action returns to the minimal interface. Both entries use the existing database and native storage; no migration, reset, new origin or book upload is introduced. Native wording describes on-device storage. The old advanced reader remains available during the transition.

The public website was not redeployed for this phone update. Its current release remains b1129030bf63ac7e8d4cf86ddebec3536d202183, with the full web entry and optional Lite preview. Android retains its existing full entry.

## Verification and data preservation

- 108 unit tests, 9 packaged-iOS browser scenarios and 45 Lite web regressions passed. Packaged-iOS scenarios use mocked Capacitor plugins: shared book/bookmark/settings/position, local full-tools navigation and language changes, lifecycle pause/Keep Awake, native-share backup and mirror recovery. These are browser evidence.
- Source/package verification passed. The export contains 244 hashed input files and 41 packaged web assets.
- Actual Xcode 26.6 / SDK 26.5 Release build + Analyze passed for device and Simulator. Existing Personal Team signing and strict codesign verification passed. All 41 signed bundled assets match the server export; all 244 build inputs remained unchanged.
- Before updating, only HummingRead was stopped. Documents and Library were copied into a private Mac backup, inventoried and hashed: 31 files, 13,056,991 bytes. After installation and before first launch, all 31 preexisting files matched exactly: zero missing or changed. The protected Documents/Preferences/WebKit subset also matched (16 files).
- The signed build-2 rollback, old source/manifest/results, pre-update private backup and post-install snapshot are retained on the Mac. Apple/device identifiers, provisioning material, private screenshots and reading files are not published.
- The development profile expires 2026-10-31 19:47:27 UTC. This remains a Personal Team trial.

## Explicit QA limits

The current build-3 Simulator UI run did not pass: the first installation exceeded 90 seconds; after restarting only the dedicated QA iPhone Simulator, boot readiness exceeded 150 seconds. The dedicated Simulator was shut down afterward. Compilation/Analyze succeeded, but old build-2 Simulator observations are not reused as build-3 UI evidence.

The physical iPhone launch and minimal first screen were observed. Automation did not open or modify private books for interactive testing. Complete physical Files import, long reading sessions, background/restart checkpoints, native Share/restore, VoiceOver, iPad and multi-day testing remain in the launch plan. No paid enrollment, TestFlight upload, App Store submission or production-readiness claim is made.

## Retained evidence

Server: /srv/hummingread/artifacts/ios-lite-build3-20261024/.

- build-kit-info.json, build-kit-a8db8bf/BUILD_KIT_MANIFEST.json and the checksummed source archive.
- unit.log, native-browser.log, lite-web.log, sync.log, package.log, source.log.
- native-build3-sanitized.json: actual Xcode step results, signing/payload checks, installation/running confirmation, preservation counts and Simulator limitation.

Raw Xcode/signing/device logs and private data remain in the Mac build host's results and backup folders. Continue the [launch plan](IOS_LAUNCH_2026-10-24.md) with own-device use before paid membership; domain and donation setup remain separate open tasks.
