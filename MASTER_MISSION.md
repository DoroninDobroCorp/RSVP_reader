# MASTER MISSION: turn the existing RSVP reader into a launch-ready branded ecosystem

This is the repository's active autonomous mission. Read it completely, then execute it from baseline preservation through final handoff. Treat it as the complete task specification, not as brainstorming.

---

## Role and operating mode

You are the senior product engineer, release engineer, UX designer, accessibility reviewer, security reviewer, QA owner, and technical writer for this mission. Work autonomously until every in-scope acceptance gate is satisfied or until an action genuinely requires the owner's account, payment, legal identity, or irreversible external approval.

Do not merely propose changes. Inspect the real project, preserve the existing work, implement the changes, test them, visually inspect them, document them, and leave a reviewable release candidate.

Do not optimize for the number of features or lines of code. Optimize for a coherent, delightful, safe product that a stranger can understand in under ten seconds and try without instruction.

The owner will review the finished work later. Do not pause for ordinary implementation choices that can be resolved from the repository, tests, official documentation, or the decision rules in this mission.

## Project coordinates and known state

- Local repository: `/Users/vladimirdoronin/VovkaNowEngineer/work_fold/new/paceflow-production`
- Existing production checkout: `serverforvovka:/srv/RSVP_reader`
- Current checked-in base commit when this mission was written: `6850bd3` (`Add secure article URL import`)
- Preserved rollback tag: `pre-app-store-polish-20260802`
- Never delete, move, or rewrite that tag.
- The local working tree already contains a large, valuable, uncommitted release candidate. It is not disposable work.
- At the start of this mission the current local validation was:
  - 10/10 Node unit tests passed;
  - 63/63 production Chromium tests passed;
  - `npm run build` passed;
  - `npm run verify:package` passed;
  - `git diff --check` passed.
- Cross-browser, native build, extension, site, and visual checks must be run again by this mission. Do not assume historical green results are sufficient.

Read these files before modifying implementation:

- `docs/CONTINUATION_PLAN.md`
- `docs/GO_NO_GO_2026-08-07.md`
- `docs/BROAD_STRATEGY_2026-08-07.md`
- `docs/APP_STORE_CHECKLIST.md`
- `docs/APP_STORE_COPY.md`
- `docs/PRIVACY_POLICY.md`
- `docs/THIRD_PARTY_NOTICES.md`
- `docs/ARCHITECTURE.md`
- `package.json`
- `.github/workflows/ci.yml`
- `deploy/nginx-rsvp.locations.conf`
- `deploy/rsvp-reader.service`
- `capacitor.config.json`

The current product is a mature vanilla-JavaScript/Capacitor RSVP reader with:

- local/offline EPUB, FB2/FB2.ZIP, DOCX, TXT, HTML, Markdown, and RTF import;
- IndexedDB/local/native persistence and recovery;
- ordinary reading and one-word/two-word RSVP focus modes;
- bookmarks, TOC, search, contextual pause, rewind, scrubber, WPM controls;
- EN/RU localization;
- a web-only article URL importer backed by a server-side Readability endpoint;
- a deliberately local-only iOS build where article URL import is hidden;
- a service worker/PWA;
- extensive production regression coverage;
- hardened deployment files and a Capacitor iOS project.

Do not rewrite this mature product in React, SwiftUI, or another framework. Improve it incrementally and preserve its tested storage and parser behavior.

## Non-negotiable safety and source-control rules

1. Start with read-only inspection:
   - record `git status --short`;
   - record the current branch, commit, remotes, and ignored files relevant to deployment;
   - inspect the full diff and identify user-owned/untracked files;
   - scan for obvious secrets and private/copyrighted test books without printing their contents.
2. Never use `git reset --hard`, destructive checkout, broad recursive deletion, force push, or history rewriting.
3. Preserve all current uncommitted changes. Before new product work, create a recoverable checkpoint on a new local branch such as `mission/hummingread-ecosystem-20260811` after the current baseline tests pass. If a commit would accidentally include private files, create a patch/checkpoint that excludes them and document it.
4. Never commit or publish:
   - `.git` internals;
   - `data/sync-store.json`;
   - user books, private FB2/EPUB/PDF files, local captures, server logs, credentials, certificates, signing material, API keys, or billing data;
   - `.build`, `node_modules`, Playwright reports, temporary archives, or simulator data.
5. Do not push directly into a checked-out production `main`. Use a release branch. Do not force push.
6. Do not purchase a domain, enroll in Apple Developer, create paid advertisements, submit to App Review, publish a Chrome extension, accept legal agreements, or enter payment/tax/banking data. Those are explicit owner gates.
7. Do not claim trademark clearance. Product-name research is a collision screen, not legal advice.
8. Do not invent testimonials, download counts, ratings, scientific claims, or customer quotes.
9. Do not add analytics, tracking SDKs, accounts, cloud sync, AI rewriting, OCR, TTS, subscriptions, or an Android app in this mission.
10. Keep all books, reading history, bookmarks, positions, and settings local. The old unauthenticated cloud-sync system must remain permanently disabled, including upgraded legacy browser state.
11. The iOS v1 must remain fully usable offline and local-only. Do not expose the server-assisted URL importer inside the native iOS build.
12. If a change weakens storage durability, parser limits, privacy, CSP, SSRF protection, accessibility, or existing test coverage, reject that approach.

## Product outcome

Transform the current working-name product into one coherent ecosystem consisting of:

1. A polished iPhone/iPad Capacitor application ready for owner signing, device QA, TestFlight, and App Store submission.
2. A beautiful responsive public web experience that is simultaneously:
   - a landing page;
   - a real 45-second interactive demo;
   - the existing full web/PWA reader;
   - the top of the acquisition funnel.
3. A production-quality Chrome Manifest V3 extension for reading selected text and page content with the same RSVP experience.
4. A unified premium hummingbird mascot, visual language, copy system, icons, and release assets across all three surfaces.
5. Reproducible builds, tests, package validation, security documentation, privacy disclosures, release checklists, and safe deployment instructions.

The ecosystem must communicate this value without hype:

> Keep your eyes in one place. Move through long text at a rhythm you control. Pause anytime and recover the surrounding context.

Do not promise that everyone will read three times faster, retain everything, cure ADHD/dyslexia, or eliminate subvocalization. Allowed language includes `speed reader`, `paced reading`, `focus-friendly`, `one word at a time`, `distraction-free`, and `RSVP technology`.

## Brand gate and decision rules

### Desired brand character

The brand should feel calm, intelligent, warm, slightly playful, and premium rather than childish or aggressively “productivity hacker.” The mascot is a hummingbird because it can hover almost motionless while its wings move rapidly: a strong metaphor for a still gaze and fast-moving words.

Working direction:

- provisional product name: `HummingRead`;
- mascot name: `Pip`;
- category descriptor: `RSVP Speed Reader`;
- English working title: `HummingRead: Speed Reader`;
- English working subtitle: `RSVP, one word at a time`;
- Russian category copy should describe focused/accelerated reading naturally rather than transliterating marketing jargon everywhere.

`Fast Reading` is not the preferred customer-facing English category phrase. Prefer `Speed Reader`, `Speed Reading`, `Read Faster`, or `One Word at a Time` according to context.

### Collision screen before applying the brand

Before mass-renaming files or generating final art, perform and document a current collision screen for `HummingRead` and confusingly similar variants:

- Apple App Store;
- Google Play;
- Chrome Web Store;
- ordinary web search;
- GitHub/npm where software-name confusion may occur;
- domain availability for `.com` and `.app` through a real registrar/RDAP/WHOIS check, not merely the absence of a website;
- EUIPO, WIPO Global Brand Database, and USPTO search where accessible.

Also document why these rejected names are not used:

- `PaceFlow`: existing software/running-product conflicts;
- `StillGlyph`: distinctive but abstract and less emotionally approachable;
- `RSVP Reader`: generic, crowded, and already used by direct competitors;
- `RSVPanda`: active scheduling product and occupied domain;
- `StillWing`: active flight-anxiety application;
- `WordFox`, `BlinkFox`, and `WordWing`: existing products/developer identities.

Decision:

- If no exact active reading/productivity/software collision or serious confusing similarity is found, use `HummingRead` as the provisional release brand throughout the code and assets.
- If a serious collision is found, produce 8 hummingbird/reading alternatives, score them for memorability, spelling, pronunciation, search distinctiveness, visual potential, and collision risk, choose the highest-scoring defensible alternative, and use it consistently.
- Record evidence and links in `docs/BRAND_DECISION.md`.
- The result remains `provisional pending owner/legal confirmation`. Never write “trademark cleared.”

### Centralize the brand

Create one authoritative brand configuration/data source used by build scripts and verification. It must cover at least:

- full product name;
- short name;
- mascot name;
- English/Russian taglines;
- support and privacy URLs as explicit configurable values;
- marketing-site URL;
- Chrome Web Store URL placeholder;
- App Store URL placeholder;
- public article API base where applicable;
- version/build identifiers.

Eliminate accidental `PaceFlow` strings from user-facing and packaged surfaces while allowing historical strategy documents to retain their original titles if clearly marked as historical. Add a verification script that fails when an obsolete user-facing brand leaks into built web, iOS, extension, manifests, metadata, or legal pages.

Do not silently change or register the iOS bundle identifier. Propose a final identifier in documentation, keep it configurable, and list owner confirmation as a release gate. If the current Xcode project has no App Store record and changing the local identifier is safe, make the change only after documenting the old and proposed values and ensuring all build tests pass.

## Visual system and mascot

Create a coherent original vector-first mascot and visual system. Do not imitate Duolingo, Firefox, SwiftRead, Readwise, or any named artist.

### Art direction

- Elegant editorial illustration with soft geometric forms.
- Hummingbird silhouette must remain recognizable at 32 px.
- Friendly eyes and posture, but not a baby-cartoon aesthetic.
- Motion should be shown through wings, subtle trails, or changing word cards while the head/eye remains visually anchored.
- Avoid excessive gradients, neon cyberpunk, generic AI gloss, 3D plastic icons, fake glassmorphism, and dense decorative detail.
- The ORP/focus accent may be a warm coral or amber; it must not be the sole carrier of meaning.
- Provide day and night palettes with WCAG AA contrast for normal text and controls.

### Required assets

Create and retain editable source assets plus deterministic exports:

- mascot master SVG;
- app icon master source;
- square app icons for all current PWA/iOS/extension requirements;
- Apple App Store 1024×1024 icon without transparency in its final export;
- Chrome extension icons at required sizes;
- favicon and maskable PWA icon;
- social/OG image;
- mascot poses/states: calm idle, reading/focused, pause/context, successful import, empty library, gentle error;
- simple wordmark and horizontal lockup;
- monochrome variant;
- design-token file for colors, spacing, radii, shadows, typography, motion, and reduced-motion behavior.

If image-generation tooling is used, maintain provenance and licensing notes and do not ship an uneditable low-resolution output as the only source. Prefer SVG/code-native assets for icons and interface illustration. Run automated dimension/alpha checks and inspect every raster export visually.

## iOS/web application UX work

Preserve every currently tested feature. Improve information hierarchy and discoverability.

### First launch

The first mobile viewport must immediately show:

1. a concise value proposition;
2. one primary `Import a book` action;
3. one prominent `Try the 45-second demo` action;
4. privacy reassurance: no account, books stay on device;
5. no wall of settings or giant empty text area before the primary use case.

The web-only article URL importer and paste-text composer remain available, but visually secondary to the main demo/import path. The native iOS build must not reveal article URL import.

For returning users with a library, replace generic empty-state messaging with a prominent card such as:

> Continue “{title}” · {progress}% · approximately {remaining time}

The estimate must be honest, derived from remaining words and current WPM, and omitted if it cannot be calculated reliably.

### Guided demo

Turn the current demo into a short guided experience that teaches the product through use:

1. Start immediately after an explicit user action.
2. After several seconds, clearly teach Pause and restore the surrounding sentence/context.
3. Teach `rewind 10 words` and exact scrubbing.
4. End with a clear CTA to import the user's own book or text.
5. Do not add the demo text to the library.
6. Respect reduced motion and screen-reader use.
7. Never trap the user; Skip/Close must be available.

### Reader controls

- Make speed controls unmistakable: `−20`/`+20` must be visually grouped with a central `{WPM} WPM` label and not look like rewind/forward.
- Provide an explicit `rewind 10 words` control.
- Remove or demote duplicated Play/Pause and Search controls rather than showing two competing controls for the same action.
- Preserve keyboard, Media Session where allowed, and accessible labels.
- Do not repurpose iOS volume buttons.
- Correct normal-reader and search-result scroll positioning so the active word/result is not hidden under a sticky toolbar. Use container-relative geometry, not fragile document offsets.
- Keep search scalable: scanning must yield/cancel and highlighting must operate only on the rendered window.
- Preserve contextual pause, punctuation timing, long-word fitting, two-word modes, real active-time WPM, end-of-book behavior, bookmarks, TOC, and exact resume.

### Responsive layouts

Create intentional layouts, not merely compressed desktop CSS, for at least:

- 320×568 portrait;
- 375×667 portrait;
- 390×844 portrait;
- 568×320 compact landscape;
- 667×375 landscape;
- 844×390 landscape;
- current iPhone Pro/Max portrait and landscape;
- iPad portrait and landscape, including 13-inch class;
- desktop widths from 1024 to 1920.

Fix control overlap, clipped progress stats, compressed search input, clipped privacy/status pills, excessive empty panels, and unsafe-area issues. All primary touch targets must be at least 44×44 CSS px without overlap.

### Accessibility

- Semantic headings and landmarks.
- Logical keyboard order and visible focus.
- Modal focus trap, Escape close, and focus restoration.
- Correct `aria-live` behavior without noisy per-word announcements during playback.
- Screen-reader-friendly status for pause, progress, settings, errors, and search.
- No control identified only by color or icon.
- Day/night contrast checks.
- Reduced-motion mode.
- 200% text zoom without loss of content or controls.
- EN/RU localization must update immediately and persist.

## Public website integrated with the web reader

Do not create a disconnected mock marketing site. Enhance the existing public web entry so the landing page and working reader form one coherent experience at the existing `/rsvp/` path. Avoid a path migration that risks IndexedDB/localStorage or old service-worker users unless there is a compelling, tested reason.

### Landing content

The initial public page should contain:

- hero with hummingbird visual, honest promise, and live demo CTA;
- interactive 45-second RSVP challenge using the real reader engine;
- a simple explanation: words move while the eyes stay in one place;
- pause/context and rewind demonstration;
- supported formats and local-first privacy;
- use cases: article backlog, DRM-free ebooks/FB2, long work text, language practice;
- comparison of ordinary scrolling versus focused paced reading without insulting conventional reading;
- FAQ covering RSVP, comprehension limits, privacy, supported files, offline behavior, and who may not enjoy the method;
- install/extension CTAs that gracefully show `Coming after review` until real store URLs exist;
- real privacy, support, and acknowledgements links;
- no fake pricing table before monetization is implemented.

The full web reader should remain accessible on the same page or through an unambiguous transition. Marketing content must not clutter focus mode or the returning-user workflow.

### Copy and localization

- Write polished native-sounding English and Russian, not literal machine translation.
- Keep `RSVP` in metadata, FAQ, structured copy, and specialist search phrases, but do not require a newcomer to understand the acronym.
- Use `speed reading app`, `speed reader`, `RSVP reader`, `one word at a time`, `paced reader`, `focus reader`, `EPUB`, and `FB2` naturally; never keyword-stuff visible copy.
- Explain RSVP on first use as `Rapid Serial Visual Presentation`.
- Avoid unverifiable superlatives and absolute comprehension claims.

### SEO, sharing, and performance

- Unique title/description/Open Graph/Twitter metadata for EN and RU.
- Canonical URL is configurable until the owner supplies the final domain.
- Appropriate JSON-LD for a software application, using only truthful fields.
- Sitemap/robots files suitable for the final static deployment.
- Shareable campaign URLs preserve ordinary UTM query parameters but do not expose book content or URLs imported by users.
- No third-party fonts or analytics by default. Use system/local fonts.
- Add a documented analytics adapter that is disabled/no-op by default. Do not claim behavioral validation until the owner enables an approved privacy-consistent measurement solution.
- Target Lighthouse on a production build: Performance ≥90, Accessibility ≥95, Best Practices ≥95, SEO ≥95 on representative mobile runs. Document environment and any justified variance.
- Avoid layout shift; optimize SVG/raster assets; lazy-load noncritical art.
- The demo and main interaction must work with JavaScript loaded from the same origin under the existing restrictive CSP.

## Chrome extension

Build a real Chrome Manifest V3 extension in a dedicated `extension/` tree with deterministic unpacked and ZIP builds. It must be useful without an account, server, or mobile app.

### Core workflows

1. User selects text on a page, opens the context menu, and chooses `Read with {Brand}`.
2. User invokes the toolbar action or keyboard shortcut and can read selected text; if nothing is selected, offer a clear option to extract readable page content locally.
3. User can paste text into the extension surface.
4. A clean overlay or side panel provides:
   - Play/Pause;
   - current WPM with ± controls;
   - rewind 10 words;
   - exact progress scrubber;
   - surrounding context while paused;
   - close/restore focus;
   - day/night theme;
   - basic punctuation timing consistent with the app.
5. Settings and last position may be kept in `chrome.storage.local` only.
6. Optional explicit links open the public web demo or App Store placeholder. Never upload selected/page text automatically.

### Permission and privacy requirements

- Use the smallest practical permissions, ideally `activeTab`, `scripting`, `storage`, and `contextMenus`, plus only permissions demonstrably required by the chosen UI.
- Do not request blanket host access if `activeTab` and explicit user gestures are sufficient.
- Do not use remotely hosted code, `eval`, dynamic executable downloads, or CDN libraries.
- Extract selected/readable page text locally in the browser. The existing article server must not be required for extension reading.
- Do not read password fields, private browser UI, other tabs, browsing history, or unrelated page data.
- Explain each permission in `docs/CHROME_EXTENSION_RELEASE.md` and in store-review copy.
- Add an accurate extension privacy disclosure. Selected text/page text, settings, and progress stay local unless the user explicitly chooses an external link/action.
- Overlay/side-panel CSS must be isolated from host-page CSS and must not permanently mutate the page.
- Clean up DOM, event listeners, and state on close/navigation.

### Extension compatibility and accessibility

- Handle ordinary articles, SPAs, dynamically selected text, iframes where permissions allow, and pages where script injection is forbidden with a clear fallback message.
- Do not promise operation on `chrome://`, Chrome Web Store, or other protected pages.
- Keyboard navigable, visible focus, screen-reader labels, reduced motion, high contrast, and no focus theft after closing.
- No per-word screen-reader spam.
- Test at common zoom levels and on dense host pages with hostile CSS.

### Extension packaging

Produce:

- valid Manifest V3 manifest;
- extension icons;
- context-menu/background service worker;
- content/overlay or side-panel implementation;
- localized EN/RU strings where Chrome localization supports them;
- privacy page and support link;
- Chrome Web Store title, short description, full description, permission rationale, screenshot plan, promo-tile plan, and review notes;
- deterministic `npm run build:extension` and `npm run verify:extension` commands;
- a distributable ZIP that contains only store-safe files and no source maps/secrets/private artifacts.

## Architecture and build system

Preserve the existing low-dependency approach. Do not introduce a heavy framework merely to create the site or extension.

### Shared behavior

Where safe, extract only pure, well-tested RSVP functions into a small shared module usable by the app/site demo and extension, such as:

- tokenization contract;
- ORP selection;
- punctuation delay calculation;
- progress/time calculations;
- safe settings normalization.

Before moving mature logic, add characterization tests. Do not combine native persistence, DOM-heavy reader state, or server code into the shared module. If extracting a function risks the stable application, keep the app implementation and add parity tests against the extension implementation rather than performing a dangerous rewrite.

### Required scripts

Add clear scripts, names may vary if better conventions already exist:

- `npm run build`
- `npm run build:web`
- `npm run build:extension`
- `npm run build:all`
- `npm run test:unit`
- `npm run test:production`
- `npm run test:cross-browser`
- `npm run test:extension`
- `npm run test:visual`
- `npm run verify:package`
- `npm run verify:extension`
- `npm run release:check`

Build outputs must be regenerated, deterministic, ignored or tracked consistently with current repository policy, and never mix server/private source into public roots.

Keep web deployment restricted to built public assets. Never alias or publish the repository root. Add automated negative checks for `.git/config`, `server.js`, `package.json`, `data/sync-store.json`, tests, native sources, `node_modules`, and common private book extensions.

### Service worker and upgrade safety

- Preserve installed PWA offline reopening.
- A text/static asset navigation must not poison the app shell.
- Update the cache version once, after final asset paths stabilize.
- Test upgrade from the existing `v47` cache/service worker behavior.
- Do not cache user-imported book content or article API responses in a way that violates privacy.
- Ensure renamed branded assets do not strand an old installed app on broken cached paths.

## Security and backend hardening

Preserve all existing SSRF, size, redirect, timeout, rate-limit, and Readability protections. Close any remaining gaps before release.

### Article-import SSRF

Review `server.js` address classification using the pinned `ipaddr.js` or another maintained, pinned classifier. The policy must be allow-public-global-unicast, not a small denylist. Add regression coverage for at least:

- IPv4 loopback, private, link-local, carrier-grade NAT, multicast, documentation, reserved, and unspecified ranges;
- IPv4-mapped IPv6;
- IPv6 loopback, unspecified, link-local, unique-local, multicast, documentation, and other non-global ranges;
- local-use NAT64 such as `64:ff9b:1::/48` including an embedded `127.0.0.1`;
- 6to4 `2002::/16` with embedded private/loopback IPv4;
- Teredo/special `2001::/32`;
- ORCHID ranges including `2001:10::/28` and `2001:20::/28` where applicable;
- deprecated/special ranges such as `fec0::/10` and `::/96` as appropriate;
- mixed DNS answers where any address is unsafe;
- every redirect target;
- DNS pinning/rebinding assumptions.

Do not weaken the current rejection of credentials, non-HTTP(S), nonstandard ports, oversized bodies, excessive redirects, non-HTML responses, or timeouts. Keep the backend on loopback behind nginx and retain defense-in-depth deployment limits.

### Headers and CSP

- Maintain a restrictive CSP compatible with the app and extension.
- No inline executable script if it can be avoided; never add `unsafe-eval`.
- Keep `object-src 'none'`, safe `base-uri`, safe `frame-ancestors`, `nosniff`, referrer policy, HSTS on TLS, and no-store API responses.
- Restrict `connect-src` to the minimum required origin.
- Do not expose Capacitor plugins to untrusted remote content.

### Server privacy

- The web article URL and fetched text may be processed transiently only as documented.
- Do not persist URL/article text to server files or databases.
- Production nginx access logging for the article endpoint must remain disabled.
- The in-memory raw-IP rate-limit bucket must have the documented hard expiry, no sliding extension, bounded size, and tests.
- If implementation and policy diverge, fix both before release. Do not choose `Data Not Collected` for native/web metadata unless it is strictly true for that surface.

### Runtime and dependencies

- Production service runs as the dedicated locked `paceflow` user, binds `127.0.0.1:8081`, and keeps systemd sandboxing.
- Keep lockfiles and Swift `Package.resolved` reproducible.
- Run dependency audit and license verification.
- Update `THIRD_PARTY_NOTICES.md` and packaged acknowledgements for any shipped dependency or asset license.
- Avoid adding a dependency when a small auditable implementation is safer.

## Privacy, legal, and store copy

Maintain separate truthful statements for each surface:

### Native iOS

- No account.
- No analytics/tracking SDK.
- No cloud sync.
- No article URL import.
- Imported books, text, positions, bookmarks, and settings remain on device.
- Core reading works offline.

### Public web/PWA

- Local books, pasted text, library, settings, and progress remain in browser storage.
- Optional article import sends the entered URL to the documented first-party extraction service.
- Explain transient page processing, destination-site requests, raw-IP abuse prevention, exact retention, and lack of server content storage.

### Chrome extension

- Selected/page/pasted text and settings remain local.
- No automatic server transmission.
- Explicitly opening the website/App Store is a user-directed navigation.

Create/update:

- privacy policy in English and Russian;
- accessible public privacy HTML;
- support page with a no-login contact path placeholder plus GitHub issues as an optional technical channel;
- App Store copy and review notes;
- Chrome Web Store copy and review notes;
- content-rights language for user-imported DRM-free/local files and user-directed public articles;
- age-rating notes without casually classifying the narrow article extractor as unrestricted browsing;
- third-party notices;
- release checklist.

The final branded privacy/support URL and real support email are owner gates. Clearly mark placeholders and make verification fail for production release mode while allowing local preview mode.

## Testing and quality gates

No feature is complete merely because it looks correct once. Add regression tests before or with each fix.

### Baseline and continuous testing

Run and preserve baseline evidence before major changes:

```sh
node --check app.js
node --check epub-parser.js
node --check i18n.js
node --check server.js
node --check service-worker.js
git diff --check
npm audit
npm test
npm run test:cross-browser
npm run build
npm run cap:sync
npm run verify:package
```

After each logical phase, run the smallest relevant targeted tests. At the end, run all release gates from a clean dependency install where practical.

### Application regressions that must remain green

At minimum preserve existing coverage for:

- article import and native hiding;
- SSRF rejection;
- app background persistence/pause;
- native and web wake-lock races;
- real active-time WPM;
- final-word pause;
- exact reload resume and bookmark restore;
- multi-format import;
- ZIP/parser safety;
- concurrency and delete/save races;
- native mirror/draft/index recovery;
- settings recovery and backup atomicity;
- quarantine behavior;
- large-book search performance;
- accessibility dialogs and focus;
- EN/RU localization;
- retired cloud sync never uploading private content;
- static/private-file exposure tests;
- offline service-worker behavior.

Add targeted tests for every UX, branding, extension, service-worker upgrade, and SSRF change introduced by this mission.

### Cross-browser

- Chromium desktop;
- WebKit desktop;
- Playwright Mobile Safari profile;
- test compact portrait and landscape geometry;
- no intentional skip without a written reason;
- do not hide a flaky test with retries; find the cause.

### Extension tests

At minimum:

- manifest schema and forbidden-permission validation;
- no remote-code references;
- build ZIP allowlist;
- selected-text workflow;
- empty-selection/page-extraction workflow;
- protected-page fallback;
- play/pause, WPM, rewind, scrubber, punctuation timing;
- persistence in local extension storage;
- overlay isolation and cleanup;
- keyboard/focus/accessibility;
- no network transmission of selected/page text;
- CSP compliance;
- EN/RU strings;
- large selection performance and cancellation.

Use a real unpacked-extension browser test where the environment supports it. If a platform limitation prevents one automated scenario, provide a precise manual test with captured evidence rather than silently omitting it.

### Native checks

Run on macOS/Xcode:

```sh
npx cap doctor
npx cap ls
plutil -lint <all changed plists>
xcodebuild -project ios/App/App.xcodeproj -scheme App -resolvePackageDependencies
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO analyze
```

Launch representative iPhone and iPad simulators, wait through realistic cold-start timing, and inspect actual screenshots. Verify packaged privacy manifest, icons, app display name, version, supported orientations, safe areas, local-only UI, Keep Awake behavior, and no blank launch screen.

Archive/signing, TestFlight, and physical-device QA remain owner gates if credentials/devices are unavailable.

### Visual QA

Capture a deterministic screenshot matrix for:

- landing first viewport EN/RU, day/night;
- first-time user;
- returning-user continue card;
- guided demo play/pause/context/rewind;
- normal reader and focus reader;
- library, settings, search, bookmarks, TOC;
- import success/error/empty states with mascot;
- iPhone portrait/landscape;
- iPad portrait/landscape;
- desktop;
- Chrome extension popup/overlay or side panel on light and dark host pages.

Inspect screenshots visually. Automated dimensions alone are not visual QA. Fix clipping, overlap, inconsistent spacing, illegible type, broken mascot crops, and unsafe areas.

### Performance and large content

- No full-book DOM rendering for very large books.
- No synchronous search over hundreds of thousands of matches without yielding/cancellation.
- Token/source limits apply before large arrays or DOM allocations.
- Test dense punctuation, extremely long tokens, >1M-token rejection, compressed archives, corrupt files, and repeated import/delete cycles.
- Extension large-selection work must remain responsive and cancellable.
- Record representative landing/app/extension performance measurements.

## CI and reproducibility

Extend CI so a pull request verifies:

- clean install;
- unit/application Chromium tests;
- WebKit/Mobile Safari regressions;
- branded web build and package verification;
- extension build/tests/package verification;
- source/asset/license checks;
- unsigned iOS Release build and analyze on macOS;
- no obsolete brand leakage;
- no private/public-root leakage.

Keep CI time bounded and cache dependencies safely. Do not commit generated credentials or require owner secrets for ordinary validation.

## Deployment preparation and server safety

Build the public site/web reader and extension locally first. Do not publish the Chrome extension or use a final domain without owner approval.

Prepare a reversible deployment plan for the existing server:

- Never serve `/srv/RSVP_reader/` as a static root. Only serve the built public directory.
- Existing `/rsvp/` URLs and browser storage/service-worker upgrades must remain safe.
- Keep `/rsvp/api/sync` disabled/404.
- Keep `/rsvp/api/article` POST-only, rate-limited, unlogged, no-store, and proxied only to loopback.
- Verify nginx config before reload.
- Back up the current nginx snippets, unit, built public assets, and current commit into a fresh root-readable backup location.
- Do not reuse historical backups known to predate the repository-exposure fix.
- Preserve the ignored legacy `data/sync-store.json`; move it only recoverably to a root-only non-public location if still present, and never publish it.
- Ensure service runs as dedicated `paceflow`, not broad `ubuntu`.
- Create a release branch rather than pushing production `main` directly.
- Provide exact smoke tests and rollback commands.

This mission may prepare and validate all deployment artifacts. Actual production deployment is allowed only if the surrounding task/environment contains explicit owner authorization to update the existing server. Otherwise stop at a deployment-ready release branch and report the one remaining owner action. Do not interpret permission to edit the repository as permission to buy infrastructure or publish stores.

Production verification must include positive checks for public index/privacy/support/assets and negative checks returning 404/403 for repository, `.git`, server, data, node_modules, tests, native sources, and private-book paths.

## Release and marketing artifacts

Prepare, but do not falsely publish:

### App Store

- localized name/subtitle/keywords within current Apple limits;
- description, promotional text, review notes, privacy answers draft, age/content-rights rationale;
- final screenshot copy and deterministic screenshot sources for current required iPhone and 13-inch iPad classes;
- optional 30-second preview storyboard using only real app footage;
- proposed one-time pricing experiments documented, but no StoreKit/subscription implementation in this mission;
- explicit placeholders for seller identity, team ID, signing, bundle ID approval, tax/banking, price, and territories.

### Chrome Web Store

- title, short/full descriptions;
- exact permission rationale;
- privacy disclosure;
- screenshots and promo assets;
- review notes and manual reviewer workflow;
- versioned ZIP plus checksum;
- explicit publish/account owner gate.

### Website/acquisition

- SEO copy and FAQ;
- campaign-link convention;
- 45-second challenge CTA;
- social preview image;
- small-launch checklist for 100–300 relevant visitors;
- validation metrics from the existing strategy memo, clearly labeled as future measurements rather than achieved results.

Do not spend on advertising or add a newsletter/account backend. A support/contact email and final URLs remain owner inputs.

## Work phases and required checkpoints

Follow this sequence. Do not jump into a giant rewrite.

### Phase 0 — Preserve and baseline

- Read docs and current diff.
- Protect private files.
- Run baseline tests.
- Create recoverable local checkpoint/branch.
- Write `docs/MISSION_BASELINE.md` with commands/results and known owner gates.

### Phase 1 — Brand decision and asset foundations

- Perform collision screen.
- Decide provisional brand according to rules.
- Centralize brand configuration.
- Build design tokens, mascot/wordmark/icon sources and export verification.
- Add obsolete-brand leak tests.

### Phase 2 — UX and integrated public website

- Fix first-launch hierarchy, returning continue card, guided demo, controls, scroll positioning, responsive layouts, accessibility, copy, SEO, and legal surface.
- Keep stable application/storage/parser behavior.
- Add targeted tests and screenshot QA.

### Phase 3 — Chrome extension

- Build Manifest V3 extension with minimal permissions and local processing.
- Reuse/test pure reading behavior safely.
- Add extension test/build/verification and store artifacts.

### Phase 4 — Security, privacy, packaging, and CI

- Close remaining IPv6/special-range SSRF gaps.
- Verify CSP, logs, rate-limit retention, local-only surface contracts.
- Update notices, privacy, support, store copy, build scripts, package verifier, and CI.

### Phase 5 — Full release validation

- Clean install where practical.
- All unit, Chromium, WebKit/Mobile Safari, extension, offline, package, brand, security, and private-file tests.
- Xcode unsigned Release build and analyze.
- Simulator launch/screenshot QA.
- Lighthouse/performance/a11y measurements.
- Final diff review for secrets, debug code, placeholders, generated junk, and accidental regressions.

### Phase 6 — Release candidate and handoff

- Create small, logically separated commits on the mission/release branch.
- Do not squash away useful checkpoints.
- Prepare optional existing-server deployment and rollback instructions.
- Produce final report and owner-only action list.

## Definition of done

The mission is complete only when:

- one provisional, collision-screened brand is applied consistently;
- a polished original hummingbird mascot/icon system exists in editable and exported form;
- first-time and returning-user flows are immediately understandable;
- the demo teaches play, pause/context, rewind, and next action;
- the web entry is a beautiful, honest, fast landing page and a working full reader;
- the iOS build remains local-only and offline;
- a usable, accessible, minimally-permissioned Chrome MV3 extension is built and packaged;
- no selected text or book content is transmitted by the extension;
- obsolete cloud sync cannot revive;
- SSRF/global-address validation is robust, including IPv6 transition/special ranges;
- privacy/legal copy matches actual behavior on each surface;
- public build roots expose no repository/private files;
- application, cross-browser, extension, offline, package, CI, and unsigned iOS gates are green;
- visual QA evidence exists for mobile, tablet, desktop, and extension;
- every account/payment/legal/signing/publishing dependency is isolated into a short owner-only checklist;
- the existing stable rollback point and the pre-mission work remain recoverable.

## Final response format

At completion, return one concise but evidence-rich report with:

1. **Outcome** — what is now usable.
2. **Brand decision** — selected name, mascot, evidence, and provisional/legal caveat.
3. **Product changes** — app/site/extension separately.
4. **Security/privacy changes** — exact behavior and tests.
5. **Build/test evidence** — commands, pass counts, relevant performance scores, Xcode results, and screenshot locations.
6. **Source control** — branch, commits, clean/dirty status, preserved rollback points.
7. **Deployment status** — prepared/deployed, live smoke results if authorized, and rollback location.
8. **Artifacts** — paths to app icons, mascot sources, screenshots, App Store copy, extension ZIP/checksum, Chrome listing copy, privacy/support pages, and release docs.
9. **Owner-only actions** — no more than a precise checklist covering final brand/legal approval, domain, support email, Apple team/signing/bundle ID, App Store Connect, Chrome developer account, store publication, price/territories/tax/banking, real-device QA, and optional analytics choice.
10. **Known limitations** — only real unresolved issues; do not bury failures or describe unrun checks as passed.

Do not end with “the implementation should work.” Demonstrate that it works with tests, builds, screenshots, package inspection, and truthful remaining gates.
