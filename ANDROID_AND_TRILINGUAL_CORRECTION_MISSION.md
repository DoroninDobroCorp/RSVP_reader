# HummingRead mission: correct the trilingual release and deliver a real Android test build

This is an executable implementation mission. It combines an independent correction of the previous EN/RU/ES work with a complete Android release-candidate track. Read the entire file before editing anything, then continue autonomously through implementation, builds, emulator testing, visual QA, documentation, commits, and push.

Do not stop after generating an `android/` directory. Do not stop after making Gradle compile. The required outcome is an installable, exercised Android tester build plus corrected web/PWA/iOS/Chrome behavior and truthful evidence.

## 1. Exact repository state and branch

Work on the remote server checkout:

`/srv/RSVP_reader-r2`

The correction/Android branch already exists on `origin`:

`mission/android-r1-and-i18n-corrections-20260812`

It was created from trilingual implementation commit:

`eb67513a75565b49d5ee259f5f558445b85aea98`

Fetch the branch from `origin` and check it out. Do not recreate it from `main`, do not work in `/srv/RSVP_reader`, and do not assume that a similarly named local branch is current.

Before editing, record:

- `pwd`;
- `git status --short --branch`;
- `git rev-parse HEAD`;
- `git log -12 --oneline --decorate`;
- `git remote -v`;
- `git worktree list`;
- `git ls-remote --heads origin mission/android-r1-and-i18n-corrections-20260812`;
- free disk/memory;
- Node/npm versions;
- Java, Android SDK, `adb`, emulator, KVM, and Gradle availability.

The working tree must be clean except for the committed mission files. Preserve all implementation commits and owner data.

## 2. Why a correction phase is mandatory

The previous executor reported completion at `eb67513`, but independent review found multiple contradictions. Treat the following findings as reproducible defects, not optional suggestions.

### AUDIT-P0-001 — the claimed push did not happen

The completion report said `eb67513` had been pushed, while the remote trilingual branch still pointed to `b368798`. The work existed only as nine local commits. The correction branch now preserves those commits in Git, but all future completion reports must compare local and remote SHAs after push.

Acceptance:

- final `git rev-parse HEAD` equals `git ls-remote origin refs/heads/mission/android-r1-and-i18n-corrections-20260812`;
- final working tree is clean;
- the report never says “pushed” without this proof.

### AUDIT-P0-002 — locale URLs do not provide locale content

`dist/es/index.html` has Spanish metadata but English static body text such as `Long reads.`. The runtime locale constructor ignores the URL and static `<html lang>`; it uses only stored language or `navigator.language`. Therefore an English browser opening `/es/` gets an English UI under Spanish metadata/canonical, and a Spanish browser can get Spanish UI under the English URL.

Acceptance:

- `/`, `/ru/`, and `/es/` each contain crawlable, static, visible body copy in the matching language before JavaScript runs;
- the locale encoded by the URL is authoritative for that document;
- an explicit UI language change updates the equivalent locale URL without losing user text, book, position, bookmarks, search state, or settings;
- a direct load/reload of each locale URL remains in that locale regardless of browser language or an obsolete stored value;
- initial language detection from browser/native system remains useful for a first visit that has no explicit locale choice, but it may not create URL/content/canonical mismatches;
- tests load built output, disable JavaScript for static assertions, and use conflicting browser locales/stored values.

### AUDIT-P0-003 — nested locale routes are functionally broken

The localized HTML adjusts some CSS/JS/image paths, but runtime and download paths remain relative to the locale directory. Examples from the built output:

- `/es/sample_text_es.txt` does not exist;
- `/es/service-worker.js` does not exist;
- `/es/downloads/hummingread-tester.zip` does not exist;
- `/es/api/article` is not the owned article endpoint;
- equivalent Russian paths have the same risk.

The normal owned Node test server also returns 404 for `/es/`, so existing regression tests never exercise the built locale route.

Acceptance:

- exercise the actual built `dist/` tree through an owned marked test server or a production-equivalent static fixture;
- every EN/RU/ES route loads CSS, JS, images, manifest, demo, service worker, legal/support pages, acknowledgements/notices, extension ZIP, and the intended article API path;
- the optional article importer succeeds from all three locale routes against the same guarded endpoint;
- PWA install/offline navigation works from all locale routes;
- no duplicate service worker scope or locale-specific poisoned cache is created;
- tests assert both status codes and user-visible behavior, not just string presence.

Use an explicit, centralized application base-path/locale-path model. Do not repair this with an expanding list of fragile regex replacements.

### AUDIT-P0-004 — legal pages expose three policies at once

`privacy.html`, `support.html`, and `acknowledgements.html` contain English, Russian, and Spanish articles one after another. No CSS or runtime hides the nonmatching articles. Generated `/es/privacy.html` therefore visibly displays all three full privacy policies while claiming Spanish in its metadata.

Acceptance:

- each generated public information URL contains exactly one human-language version of the wrapper/content;
- `/privacy.html`, `/ru/privacy.html`, and `/es/privacy.html` are semantically equivalent but not concatenated;
- same for support and acknowledgements wrapper content;
- third-party license bodies stay verbatim and need not be translated;
- a visible, keyboard-accessible language switch on information pages links to the equivalent page in the other two languages;
- source architecture avoids maintaining three uncontrolled legal copies inside every shipped page;
- tests assert absence of the other-language policy body, not merely presence of the requested language.

### AUDIT-P0-005 — tester-preview SEO gates were weakened

Before `eb67513`, tester-preview configuration removed canonical and JSON-LD. The new `configureWebText()` stopped removing them, and the verifier was weakened to accept canonical/hreflang on the temporary `sslip.io` IP domain. `docs/RELEASE_EVIDENCE.md` still claims the preview has no canonical or JSON-LD, so documentation and output contradict each other.

Acceptance:

- current tester-preview output remains `noindex,nofollow,noarchive` with `robots.txt` `Disallow: /`;
- tester-preview contains no sitemap, canonical, hreflang cluster, production JSON-LD URL, or approved-looking SEO identity for the temporary `sslip.io` domain;
- a separate deterministic production-mode dry build using a test domain proves correct EN/RU/ES canonical, reciprocal hreflang including `x-default`, JSON-LD language, and sitemap;
- production-mode dry output is never deployed;
- verifiers fail if preview SEO identity leaks or if production locale body and metadata languages differ.

### AUDIT-P1-006 — visual QA did not cover Spanish as reported

`tests/visual/capture-matrix.mjs` currently captures English plus one Russian landing. It does not capture the claimed EN/RU/ES matrix, Chrome Spanish UI, Spanish legal pages, Spanish dialogs/errors, or Spanish focus mode. `docs/VISUAL_QA.md` also still describes only EN/RU.

Acceptance:

- capture and inspect representative EN/RU/ES states required later in this mission;
- report exact filenames and viewports;
- automated geometry checks accompany screenshots;
- no claim of “all three languages” without actual artifacts for all three.

### AUDIT-P1-007 — Chrome runtime errors remain English

Chrome catalogs have key parity, but user-visible errors still originate as hard-coded English in `background.js` and `core.js`, including invalid preview, protected page, empty/oversize text, invalid/expired token, PDF extraction, cancellation, and handoff expiry.

Acceptance:

- every user-visible popup/reader/background/core status or error is localized in EN/RU/ES;
- internal invariant/debug messages may remain English only if they can never reach a user;
- real unpacked-extension tests simulate all three Chrome UI locales and exercise representative success and failure paths;
- verify zero automatic content transfer remains true.

### AUDIT-P1-008 — evidence and claimed validation state are unreliable

The report claimed a `validation-state.json` with 62/62 assertions, but no such file exists. It also reported 73 Chromium tests while the mission required broader gates. `docs/RELEASE_EVIDENCE.md` retains stale counts and SEO claims. Lighthouse summary artifacts were not updated to the new three-route format.

Acceptance:

- remove invented/stale completion claims;
- if a machine-readable validation state is kept, generate it from actual command outputs and commit its generator/schema, not a hand-written score;
- evidence records commands, exit codes, actual counts, environment, timestamp, commit, and artifact checksums;
- ignored artifacts may be referenced only if they exist and their current hashes are recorded;
- no test name substitutes for a meaningful assertion.

### AUDIT-P1-009 — PWA install metadata is English-only

The single manifest contains an English name/description and does not express the active locale. Localized install metadata was in scope but is not implemented.

Acceptance:

- each locale route references valid localized install metadata or a documented standards-compliant equivalent;
- all manifests use a single stable app identity so installing from different locale routes does not create three unrelated PWAs;
- localized name/description/start URL/scope/icon paths are correct under `/rsvp/` and a future root domain;
- manifest and installed offline start-route behavior are tested.

## 3. Safety, source control, cost, and external-action rules

Never:

- modify or deploy production;
- reload nginx/systemd or change DNS;
- merge to `main` or an integration/release branch;
- create a pull request;
- trigger or add GitHub-hosted Actions;
- use paid GitHub features, cloud device farms, Appflow, Firebase Test Lab billing, paid SEO tools, or paid build services;
- publish to Google Play, Chrome Web Store, App Store, or any tester track;
- create or upload a production signing key;
- accept developer agreements, create store accounts, enter payment/tax data, or perform identity verification;
- commit APK/AAB files, Gradle caches, Android SDK files, emulator images, debug keystores, signing properties, secrets, user books, server data, or private logs;
- weaken privacy, storage safety, CSP, SSRF protection, parser limits, offline behavior, accessibility, or existing tests;
- force-push, rewrite history, use `git reset --hard`, broad destructive cleanup, or remove rollback tags.

This branch deliberately uses the `mission/**` prefix, which is outside the current GitHub Actions push patterns. Run gates locally on the server. One ordinary final branch push is required; verify that it does not trigger paid automation.

Free, in-scope server setup is authorized for this mission:

- install the minimum required open-source/free JDK and official Android command-line SDK components;
- use noninteractive `sudo` only for narrow package/toolchain setup, KVM group access, or required system libraries;
- prefer a documented `/opt/android-sdk` installation and a task-specific environment script over scattering SDKs in home directories;
- download only from official Android/Google/OpenJDK/Ubuntu sources;
- never pipe a remote script directly into a shell;
- record versions and checksums or authoritative package provenance;
- do not install Android Studio GUI merely to claim it exists on a headless server.

The server audit found 8 CPUs, KVM support, `/dev/kvm`, approximately 63 GB free, 22 GB RAM, and noninteractive sudo. Java/Android SDK/adb/emulator were absent at audit time. Use resources conservatively and remove only narrowly identified disposable emulator/download caches if space becomes tight.

## 4. Product invariants across Web, PWA, iOS, Android, and Chrome

Preserve:

- mature vanilla JS/HTML/CSS + Capacitor architecture;
- EPUB, FB2/FB2.ZIP, DOCX, TXT, HTML, Markdown, RTF, and backup import behavior;
- library, bookmarks, positions, TOC, search, demo, RSVP playback, pause context, rewind, scrubber, WPM, themes, and external media controls where supported;
- storage concurrency, migration, tombstone, rollback, quota, and parser safeguards;
- EN/RU/ES catalogs and user choice persistence;
- local-only native content model;
- no accounts, ads, analytics, tracking, remote code, cloud sync, OCR, AI rewriting, subscriptions, or content upload;
- web-only optional article URL importer backed by the guarded server;
- no native iOS or Android article URL importer or content endpoint;
- Chrome’s local standalone reader and explicit-only Quick Send;
- all current security headers/deployment hardening without deploying this branch.

Do not translate or modify user content when the interface language changes. Do not change stable database names/keys without a tested backward-compatible migration.

## 5. Correct localization architecture

Refactor toward one authoritative, build-readable locale catalog/definition for `en`, `ru`, and `es`. Avoid regex/eval extraction of JavaScript source as the long-term catalog API. A small dependency-free JSON/module catalog is preferred.

Required properties:

- exact key and placeholder parity;
- correct plural rules and number/date formatting;
- English fallback at runtime, but verification fails missing shipped translations;
- no unsafe HTML interpolation;
- static fallback HTML generated from the same authoritative catalog;
- locale-aware document titles, descriptions, ARIA labels, placeholders, tooltips, and statuses;
- route-to-locale mapping shared by build/runtime/tests;
- explicit base path shared by article API, assets, samples, service worker, PWA manifests, extension download, and navigation;
- support for `/rsvp/` and a future root deployment without hard-coded path accidents.

Review Spanish quality for neutral international Spanish. Correct awkward phrases such as literal technical/legal calques. Keep the claims conservative: HummingRead controls presentation pace and does not guarantee comprehension or a fixed speed multiplier.

## 6. Android platform implementation

### 6.1 Toolchain and Capacitor platform

Use Capacitor 8.5.x consistently. At mission start, `@capacitor/core` and iOS are 8.5.0 and `@capacitor/android` is absent.

- install and pin `@capacitor/android` to the exact compatible version used by core (`8.5.0` unless the lockfile proves the baseline changed before implementation);
- do not opportunistically upgrade other dependencies;
- add the Android platform using the supported Capacitor workflow;
- retain the Gradle wrapper and dependency locks/config generated by the platform;
- use Node 22+ (server currently has Node 24);
- use the JDK version required by the generated Capacitor 8/Gradle project, expected to be JDK 21; prove it with the build rather than guessing;
- install official Android SDK platform/build-tools for API 36 plus platform-tools, emulator, and a suitable x86_64 API 36 image;
- accept only the SDK licenses required for these free components and document them;
- keep SDK/emulator files outside Git.

Current official requirements to encode in docs/verifiers:

- Capacitor 8 Android supports API 24+;
- Capacitor Android 8.x targets SDK 36;
- Google Play submission requirements as of this mission date require new apps/updates to target Android 16/API 36 beginning 31 August 2026.

Do not lower target SDK to make an old toolchain compile. Do not raise or customize beyond the Capacitor-supported target matrix.

### 6.2 Android identity and versions

The current shared Capacitor ID is `team.ibet.paceflow`; the proposed HummingRead ID is not owner-approved. Package/application ID becomes irreversible after first Play upload.

Therefore:

- keep the current ID for the test APK unless the repository already contains explicit owner approval;
- add explicit Android current/proposed/approved fields to authoritative product configuration and verification;
- label artifacts built with the unapproved ID as tester/review artifacts, never uploadable production artifacts;
- refuse any “Play upload” packaging command while `applicationIdApproved` is false;
- centralize `versionName` and monotonically increasing integer `versionCode`;
- never silently change the iOS bundle ID while adding Android.

Use `HummingRead` as the app label. Add correct EN/RU/ES Android resource/localization declarations where native Android UI or launcher metadata uses language.

### 6.3 Native asset build separation

The existing `build:native` script was written around iOS wording. Make native packaging truthfully support both platforms.

Either produce explicit deterministic `dist-ios` and `dist-android` trees or a genuinely platform-neutral `dist-native` tree. Whichever design is chosen must prove:

- native bundles contain EN/RU/ES reader, samples, privacy/support, notices, and required icons/assets;
- no web article form, article service URL, Chrome tester panel/download, PWA manifest/service worker/robots/sitemap, canonical/hreflang/JSON-LD, or web-only handoff bridge leaks into either native bundle;
- native privacy text covers iOS and Android accurately instead of saying “iOS” inside the Android app;
- iOS-specific hardware-control text is shown only on iOS;
- Android-specific controls/text are shown only on Android;
- `npx cap sync ios` and `npx cap sync android` copy the correct tree without stale files;
- iOS package verification remains green.

### 6.4 Android permissions and privacy hardening

HummingRead Android v1 is local-only. Make that technically enforceable.

- native Android must not expose article URL import;
- remove or override unnecessary network permission if the app and all required plugins function without it;
- verify the merged release manifest and packaged APK/AAB permissions with Android build tools;
- target zero dangerous runtime permissions;
- do not request broad storage/media/photo/video/audio permissions;
- use the system document picker for imports;
- disable cleartext traffic;
- do not add analytics, crash reporting, advertising ID, Firebase, remote config, WebView remote code, or tracking;
- set a privacy-first backup/data-extraction policy. Prefer excluding books, text, progress, bookmarks, and settings from automatic cloud backup/device transfer because the app provides explicit export; document the decision;
- ensure release WebView debugging is disabled;
- ensure no user content is written to shared/external storage except after an explicit export/share action;
- audit logcat so book text and pasted text are never logged.

If removing `INTERNET` breaks an essential local Capacitor function, prove it with a minimal test and document the exact reason before retaining it. “Capacitor generated it” is not sufficient justification.

Prepare a truthful EN/RU/ES Google Play Data Safety draft. Do not submit it. It must distinguish on-device processing, explicit user export/share, and developer collection. If no data leaves the device, do not invent collection.

### 6.5 Native import and export

Exercise actual Android document picker flows for every supported format with synthetic safe fixtures.

- import EPUB, FB2/ZIP, DOCX, TXT, HTML, Markdown, and RTF;
- reject unsupported/binary/oversize/zip-bomb fixtures safely;
- no storage permission prompt;
- file picker cancellation leaves state intact;
- import after process/activity recreation does not corrupt storage.

The current backup export uses a browser Blob/download anchor and is not proven on Android WebView. Implement and test a native-safe explicit export flow. A small official Capacitor Share capability or a narrowly scoped native document-create flow is acceptable. Requirements:

- the user initiates it;
- the JSON backup is complete and re-importable;
- temporary files are in app-private/cache storage and cleaned up;
- no automatic upload or background share;
- cancellation is safe;
- EN/RU/ES labels and errors are localized;
- the web export continues to work;
- iOS behavior does not regress.

Pin any new official plugin exactly, update OSS notices, and justify every new permission. Avoid a broad third-party file-picker dependency if the system picker or existing Capacitor APIs suffice.

### 6.6 Android navigation and lifecycle

Implement/test platform-appropriate Back behavior, including gesture Back:

1. close the topmost action/settings/bookmarks/TOC dialog;
2. close search or return from focus mode appropriately;
3. return from library/reader to the composer/home without losing data;
4. only at the root allow the system/default handler to minimize/exit according to Android convention.

Do not install a listener that disables default behavior without fully replacing it. Use the official Capacitor App API carefully.

Test:

- cold launch;
- warm resume;
- background/foreground during playback;
- pause/background releases keep-awake and haptics safely;
- resume does not unexpectedly restart playback;
- portrait/landscape rotation preserves mode, index, book, settings, and dialog safety;
- process kill/relaunch restores durable state;
- app update with `adb install -r` preserves library/settings;
- Delete All removes IndexedDB, Preferences, native mirror, cache/temp export, and resume state without resurrection;
- keyboard appearance does not hide primary controls;
- status/navigation bars, cutouts, gesture insets, edge-to-edge, and dark/light system UI remain readable.

### 6.7 Android keep-awake and haptics

The existing community Keep Awake plugin and Haptics plugin must be verified on a real emulator/device path, not only browser mocks.

- during active RSVP playback, the Android keep-screen-on state is active;
- pause, stop, modal, background, end-of-book, and app teardown release it;
- delayed plugin races remain covered;
- haptics failure/unsupported state never interrupts reading;
- no wake lock remains after the app is backgrounded.

Use `adb shell dumpsys` or another objective platform signal where possible.

### 6.8 Android icons, splash, and system surfaces

Reuse the original HummingRead/Pico source assets. Do not generate a new mascot.

Provide deterministic Android resources:

- adaptive icon foreground/background;
- legacy launcher icons at required densities;
- monochrome/themed icon for supported Android versions;
- Android 12+ splash screen with correct light/dark background and safe icon scale;
- app label and theme resources;
- no transparency/edge clipping where prohibited;
- no tiny unreadable wordmark in launcher icon.

Generate via repository scripts from authoritative source assets, verify dimensions/alpha/safe zone, and visually inspect launcher, splash, recent-apps card, light/dark theme, and themed icon if emulator supports it.

### 6.9 Google Play preparation without publication

Add `docs/GOOGLE_PLAY_COPY.md` with EN/RU/ES:

- app name;
- short description;
- full description;
- release notes;
- privacy summary;
- data-safety draft;
- content-rating notes;
- category/tags recommendation;
- support/privacy/marketing URL placeholders from product config;
- phone, 7-inch/8-inch where applicable, and tablet screenshot plan;
- explicit owner/legal/native-speaker review gates.

Add deterministic verification for current Google Play character limits from official documentation. Do not copy App Store limits. Do not invent ratings, installs, reviews, awards, performance multipliers, or medical claims.

Prepare but do not publish:

- 512×512 Play icon derived from source;
- 1024×500 feature graphic derived from existing brand assets;
- EN/RU/ES phone screenshots;
- representative tablet screenshots;
- provenance and checksums.

Do not purchase a Google Play account or perform developer verification. Record these as owner gates.

## 7. Android build artifacts

Produce locally on the server:

1. an installable debug-signed tester APK using only the standard disposable debug key outside Git;
2. a clean Release build proving compilation/resource shrinking/lint compatibility;
3. an unsigned, clearly named review AAB only if useful for bundle inspection; it must contain `UNSIGNED-NOT-FOR-UPLOAD` in the copied artifact filename while the application ID is unapproved.

Do not create a production keystore. Do not commit artifacts.

Store review outputs under a narrow ignored path such as:

`/srv/RSVP_reader-r2/artifacts/android/`

Record:

- source commit;
- app ID;
- versionName/versionCode;
- min/target/compile SDK;
- Gradle/AGP/JDK/SDK versions;
- APK/AAB paths, sizes, SHA-256;
- APK signature verification (debug only);
- manifest permissions/features;
- package file inventory and native-library inventory;
- whether any `.so` files exist and applicable 16 KB page-size result;
- SBOM/dependency list and updated notices.

Never call an unsigned artifact “Play-ready.”

## 8. Real emulator/device testing

Set up an owned, uniquely named emulator using the server KVM capability. Do not collide with other tasks. Prefer an API 36 x86_64 image without Play account dependencies.

Run full smoke on at least:

- modern phone portrait and landscape;
- tablet-sized configuration portrait and landscape;
- light and dark system themes;
- EN, RU, and ES;
- network disabled/airplane-mode core reading.

If disk permits, add a lower supported API smoke. If an old emulator WebView is below Capacitor’s supported Chrome 60 requirement, document it honestly rather than claiming a valid minimum-API UI test.

Required real Android journeys:

- first launch and privacy promise;
- language detection and switching/persistence;
- 45-second demo through play/pause/context/rewind/scrub/end;
- import a synthetic book through Android document picker;
- normal reading and focus mode;
- bookmark, TOC, search, WPM/theme settings;
- background/resume, rotation, process kill/restart, app update;
- Back/gesture navigation hierarchy;
- export backup through Android-native safe flow and re-import it;
- Delete All and verify no resurrection;
- no web article importer/Chrome panel/native network request;
- offline cold/warm launch;
- launcher/splash/icon/system-bar inspection.

Prefer coordinate-independent UIAutomator/Espresso-Web/accessibility/CDP automation. Raw coordinate taps are allowed only as a documented fallback with screenshot/state verification. A test that only launches the activity is not sufficient.

Capture screenshots and `uiautomator`/logcat evidence without including book contents or secrets. Use synthetic text only. Clear logcat before scenarios and scan for crashes, ANRs, StrictMode, WebView/Capacitor errors, leaked user text, and permission denials.

## 9. Required corrected web/PWA/Chrome/iOS tests

Add failing-before/fixed-after regression tests for every audit issue.

At minimum:

- built `/`, `/ru/`, `/es/` no-JS visible-language assertions;
- conflicting navigator/stored/path locale precedence;
- locale switch URL/state/reload behavior;
- nested route assets, samples, manifests, service worker, extension ZIP, API endpoint;
- real offline install/reopen from all locale routes;
- exactly one legal language per URL plus equivalent language navigation;
- preview SEO identity absent and production dry SEO complete;
- localized PWA manifests with one stable app identity;
- EN/RU/ES Chrome success and error E2E;
- EN/RU/ES visual geometry at 320×568, 568×320, 390×844, 844×390, iPad/tablet portrait/landscape, and desktop;
- iOS native package remains local-only and passes existing build/package gates;
- native generic privacy accurately covers both iOS and Android.

Do not make the test server serve source while claiming to test built locale output. Mark owned server instances and use unique ports.

## 10. Complete local gate matrix

Run all applicable gates from a clean install. Record exact command output and counts.

Web/cross-platform:

1. `npm ci`
2. `npm audit --omit=dev`
3. `npm run test:isolation`
4. `npm run test:unit`
5. `npm run test:production`
6. `npm run test:cross-browser` if not already equivalent; avoid silently double-counting
7. `npm run test:extension`
8. `npm run test:visual`
9. `npm run test:lighthouse`
10. `npm run build:all`
11. `npm run verify:all`
12. `npx cap sync ios`
13. existing unsigned iOS build/analyze on a real Mac if accessible; otherwise preserve the previously verified iOS state and document this environment gate without inventing a rerun
14. `git diff --check`

Android:

1. clean native build + `npx cap sync android`
2. Gradle unit tests
3. Android lint on debug and release-relevant variants
4. `assembleDebug`
5. clean Release compilation
6. bundle/package inspection
7. Android-specific package/privacy/permission verifier
8. emulator instrumentation/smoke suite
9. APK install, upgrade, launch, force-stop/relaunch, offline, rotation, and state checks
10. `apksigner`/`aapt`/bundle inspection and checksums

Do not delete or skip a failing existing test to obtain green output. Do not weaken assertions. If a legacy test is invalid, replace it with a stronger deterministic test in the same commit and document why.

Lighthouse must cover actual static EN/RU/ES production-dry pages with localized body content. Record per-route scores; do not report one old summary as three locales. Performance must remain at least 90 and Accessibility/Best Practices/SEO at least 95 unless an official tool issue is proven.

## 11. Visual QA matrix

Inspect EN/RU/ES on web and Android for:

- first-launch hero/actions;
- settings/language selector;
- returning continue card and library;
- normal reader/search;
- focus playing and paused context;
- confirmation and error states;
- privacy/support language navigation;
- Chrome popup/reader/protected-page error;
- Android launcher, splash, phone/tablet portrait/landscape, light/dark, keyboard, Back, and document picker/export share surface.

Assert:

- no clipping, overlap, horizontal document scroll, hidden primary action, or inaccessible 44 px target;
- localized accessible names match visible labels;
- system bars/cutouts/gesture areas do not cover controls;
- large text does not break critical flows;
- Pico remains decorative/nonblocking;
- Spanish/Russian longer strings wrap naturally rather than shrinking below accessible sizes.

Update `docs/VISUAL_QA.md` with current artifacts, not historical claims.

## 12. Documentation and truthful evidence

Update/add:

- `docs/LOCALIZATION_ARCHITECTURE.md`;
- `docs/SEO_I18N_STRATEGY.md`;
- `docs/ANDROID_ARCHITECTURE.md`;
- `docs/ANDROID_TESTER_GUIDE.md`;
- `docs/GOOGLE_PLAY_COPY.md`;
- `docs/PRIVACY_POLICY.md` and shipped legal pages where Android changes wording;
- `docs/APP_STORE_COPY.md` only where cross-platform wording requires it;
- `docs/RELEASE_EVIDENCE.md`;
- `docs/VISUAL_QA.md`;
- README commands/surface descriptions;
- OSS notices and asset provenance.

Release evidence must separate:

- historical results inherited from earlier commits;
- results actually rerun on this branch/server;
- Android emulator results;
- owner-only physical-device/signing/publication gates.

Never claim:

- production deployed;
- Play-ready signed AAB;
- physical Android device tested if only emulator was used;
- native-speaker/legal approval;
- Google Play publication/account verification;
- SEO ranking;
- Git push until remote SHA matches;
- a validation file/artifact that does not exist.

## 13. Required commits and push

Use logical commits, for example:

1. correction tests reproducing audit failures;
2. locale/build/SEO/legal/PWA corrections;
3. complete Chrome locale/runtime/visual corrections;
4. Android platform/tooling/build separation;
5. Android privacy/navigation/export/lifecycle fixes;
6. Android tests/assets/store preparation;
7. evidence/documentation reconciliation.

Do not rewrite the inherited commits. Keep the final source working tree clean. Push only:

`HEAD:refs/heads/mission/android-r1-and-i18n-corrections-20260812`

Do not merge or create a PR.

## 14. Final handoff contract

The final response must include:

- exact local branch and full SHA;
- exact remote branch SHA proving push;
- full commit list created by this mission;
- audit defect disposition table for AUDIT-P0-001 through AUDIT-P1-009;
- concise changed-file/surface inventory;
- actual web/unit/cross-browser/extension/visual/Lighthouse command results and counts;
- actual Android Gradle/lint/unit/emulator results and device profiles;
- APK/AAB artifact paths, sizes, versions, IDs, permissions, SHA-256, and signing status;
- Android screenshot/evidence paths;
- extension ZIP path/file count/checksum;
- remaining owner gates;
- explicit confirmation that production, stores, DNS, paid services, signing identities, and GitHub-hosted Actions were not touched.

## 15. Definition of done

Done means all of the following are true:

- EN/RU/ES locale URLs serve matching static and runtime content and function fully;
- preview SEO remains anonymous/non-indexable while production-dry multilingual SEO is valid;
- every locale route works online/offline with correct base paths;
- public information pages show one correct language with equivalent language navigation;
- PWA install metadata is localized without splitting app identity;
- Chrome UI and reachable runtime errors are truly EN/RU/ES and tested;
- visual evidence genuinely covers all three languages;
- stale/invented evidence is removed;
- Android Capacitor platform is committed and reproducibly buildable with target API 36;
- an APK is actually installed and exercised on an owned API 36 emulator;
- Android core reading is local/offline, requires no dangerous permissions, hides article import, and leaks no reading content;
- import/export, storage, Back, lifecycle, rotation, keep-awake, themes, EN/RU/ES, phone/tablet layouts, and Delete All are exercised;
- icons/splash/Play assets and EN/RU/ES listing/data-safety drafts are reviewable;
- iOS/web/extension regression gates remain green;
- no production signing/publishing/deployment/payment/external owner action occurred;
- final branch and remote SHA match with a clean working tree.

If a real external owner gate remains, finish every independent item and report that gate precisely. Missing Android SDK/JDK is not an owner gate on this server; install the free toolchain and continue.
