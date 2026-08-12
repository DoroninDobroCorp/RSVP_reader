# TRILINGUAL RELEASE MISSION: English, Russian, and Spanish everywhere

This is an executable implementation mission, not a proposal. Read this file completely before editing code, then work autonomously through implementation, testing, visual QA, documentation, commit, and branch handoff.

## 1. Role and required outcome

Act as the senior localization engineer, product engineer, UX writer, SEO engineer, accessibility reviewer, release engineer, and QA owner for HummingRead.

Turn the existing release candidate into one coherent three-language product:

- English (`en`);
- Russian (`ru`);
- neutral international Spanish (`es`).

“Everywhere” means every user-facing surface that belongs to this product:

1. public web landing page and full web/PWA reader;
2. native iPhone/iPad Capacitor application;
3. standalone Chrome Manifest V3 extension, including popup, reader, context menus, status/error text, manifest metadata, and accessibility labels;
4. privacy, support, acknowledgements wrappers, offline/error states, demo content, install prompts, and downloadable tester instructions;
5. SEO metadata and language discovery infrastructure;
6. prepared App Store and Chrome Web Store listing copy, without publishing it;
7. relevant user/tester documentation.

Internal engineering history and old strategy documents do not need wholesale translation. Do not waste time translating source comments, commit history, licenses, dependency license text, or internal-only runbooks unless a user sees that text in the shipped product.

The final result must feel written for each language, not mechanically translated. Preserve the calm, warm, premium HummingRead/Pico voice. Do not use hype or unsupported claims.

## 2. Exact repository and authoritative baseline

Work only on the remote server checkout:

`/srv/RSVP_reader-r2`

Expected implementation baseline and mission branch:

- implementation branch: `mission/trilingual-en-ru-es-20260812`;
- the mission branch was created from baseline commit `a050c9a396a9cc23d537d9ee1628d31503956dea`;
- `origin/main` and the integration branch both point to `a050c9a`;
- `AGENTS.md` and this mission are committed on the mission branch before implementation begins;
- `/srv/RSVP_reader` is an older checkout and is not the implementation worktree.

Before editing:

1. run `pwd`, `git status --short --branch`, `git rev-parse HEAD`, `git remote -v`, and `git worktree list`;
2. stop if the implementation path is not `/srv/RSVP_reader-r2`;
3. inspect the current implementation and current diff, including untracked mission files;
4. read at minimum:
   - `product.config.json`;
   - `i18n.js`;
   - `index.html`;
   - `privacy.html`;
   - `support.html`;
   - `acknowledgements.html`;
   - `app.js` language and formatting code;
   - `scripts/build-web.mjs`;
   - `scripts/build-native.mjs`;
   - `scripts/build-chrome-extension.mjs`;
   - `service-worker.js`;
   - `chrome-extension/manifest.json`;
   - every file in `chrome-extension/_locales`, plus popup/reader HTML and JS;
   - `tests/unit/i18n.test.js`;
   - the relevant production, extension, visual, build, and deployment verifiers;
   - `docs/APP_STORE_COPY.md`, `docs/PRIVACY_POLICY.md`, `docs/TESTER_GUIDE.md`, and `docs/RELEASE_EVIDENCE.md`.

Record the pre-change baseline test results. Do not trust historical counts without running the current tests.

## 3. Source-control, cost, and external-action rules

Work on the existing branch already created from the exact baseline:

`mission/trilingual-en-ru-es-20260812`

Fetch it from `origin` and check it out if the executor starts from a fresh clone. Do not recreate it from another commit. Verify that `a050c9a` is its baseline ancestor and that the committed mission files are present before implementation.

Never implement on or push directly to `main`, `integration/**`, or a checked-out production branch. Never force-push or rewrite history. Never use `git reset --hard`, destructive checkout, broad deletion, or cleanup that could remove owner data.

This branch name is intentionally outside the current GitHub Actions trigger patterns. Do not manually trigger GitHub Actions, create a pull request, enable paid GitHub features, or use paid APIs/services. Run all gates locally on the server. At the end, one ordinary push of the completed mission branch is allowed; verify the push target before pushing. If pushing would unexpectedly trigger paid automation, do not push and report the exact reason.

Do not purchase a domain, use a paid keyword service, publish the extension, submit to App Review, sign an iOS archive, deploy to production, change DNS, change nginx/systemd, or turn on public indexing. Those are owner gates.

Do not modify or expose:

- `/srv/RSVP_reader/data` or any legacy sync store;
- credentials, certificates, signing identities, API keys, billing data, or server logs;
- user books or private/copyrighted fixtures;
- the preserved rollback tag;
- production services or current public files.

Do not add analytics, tracking, accounts, cloud sync, advertising SDKs, remote translation services, or new runtime dependencies merely for localization.

## 4. Non-negotiable product invariants

Preserve all current product and release guarantees:

- vanilla JavaScript/HTML/CSS and Capacitor architecture; no framework rewrite;
- all current book formats, storage, library, bookmarks, progress, search, RSVP playback, focus controls, context-on-pause, accessibility, responsive behavior, and offline behavior;
- local-only native iOS reading workflow;
- no article URL importer in the native bundle;
- the web article importer remains accurately disclosed as server-assisted;
- no automatic transfer of selected, pasted, extracted, or book text between extension, site, and server;
- Chrome Quick Send remains explicit and optional;
- legacy cloud sync remains permanently disabled;
- no weakening of CSP, SSRF protections, parser limits, storage durability, service-worker isolation, deterministic builds, or deployment verification;
- no user data loss when upgrading from an existing EN/RU installation;
- UI-language changes never translate, alter, re-tokenize incorrectly, or overwrite a user’s book text/title/bookmark.

Do not rename HummingRead, Pico, bundle identifiers, storage databases, or stable public message channels as part of this mission.

## 5. Language policy and writing standards

### English

Keep clear international English. Retain the established phrases `Speed Reader`, `RSVP`, `one word at a time`, `local`, `offline`, and `WPM` where natural. Fix existing awkward or inconsistent English discovered during the audit, but do not gratuitously rewrite the established product voice.

### Russian

Use natural contemporary Russian, not word-for-word English syntax. Prefer `скорость чтения`, `слов/мин`, `чтение по одному слову`, `фокус-режим`, and `локально на устройстве` according to context. Do not call the product a medically beneficial tool or promise “скорочтение” outcomes it cannot prove.

### Spanish

Use neutral international Spanish understandable in Spain and Latin America. Avoid region-specific slang and avoid unnecessary English where a natural Spanish UI term exists. Suitable category language includes:

- `lector de velocidad`;
- `lectura rápida`;
- `lector RSVP`;
- `palabra por palabra`;
- `leer a tu ritmo`;
- `localmente en este dispositivo`;
- `palabras por minuto` or `ppm` where space requires an abbreviation.

Use consistent informal second-person singular (`tú`) or impersonal UI phrasing. Do not mix `tú`, `usted`, and `vosotros` within the product. Prefer calm, direct, concise copy.

The mascot remains `Pico` in all languages. The product remains `HummingRead`. Technical acronyms and file formats remain unchanged.

### Claims and accuracy

Never claim guaranteed comprehension, a fixed multiplier such as “read 3x faster,” treatment of ADHD/dyslexia, elimination of subvocalization, or scientific superiority. The existing honest FAQ principle must exist in all three languages: the app controls presentation pace; comprehension depends on the reader, material, language, and chosen speed.

Translations of privacy and support content must be semantically equivalent. Do not invent legal promises, retention periods, security guarantees, contact details, store availability, customer quotes, ratings, download counts, keyword volumes, or final URLs.

Mark Spanish store/legal copy as requiring owner/native-language legal review before publication. That is a review gate, not a reason to leave it untranslated.

## 6. Locale architecture requirements

Implement one explicit supported-locale definition used consistently by runtime code, builds, and verification. Supported locale codes are exactly `en`, `ru`, and `es`, with `en` as the safe fallback.

The web/native runtime must continue to work fully offline. Do not fetch translation catalogs at runtime from a server or third party.

Required behavior:

1. Existing stored `en` and `ru` choices remain valid.
2. A stored `es` choice is recognized and restored.
3. Browser/system locales beginning with `ru` choose Russian, those beginning with `es` choose Spanish, and every other unsupported locale falls back to English.
4. An explicit user choice overrides automatic detection and persists across reload/restart.
5. Invalid or obsolete stored values safely fall back without throwing.
6. `document.documentElement.lang` always matches the active locale.
7. All dates, numbers, counts, time estimates, word counts, and plural forms use the correct locale.
8. Use `Intl.NumberFormat`, `Intl.DateTimeFormat`, and `Intl.PluralRules` or a comparably small deterministic implementation. Do not pull in a large i18n framework.
9. Fix the existing plural-message weakness rather than carrying literal ICU-like placeholders into the UI. Cover English singular/other, Spanish singular/other, and Russian one/few/many/other with tests.
10. Missing keys fall back to English in production, but verification must fail if a shipped locale is missing a required key. Fallback must not be used to excuse an incomplete Spanish catalog.
11. Parameter interpolation must remain safe text, never executable HTML.
12. Translation catalogs must have key parity, no blank values, no unresolved placeholders, and matching placeholder names/types across locales.

Prefer a single authoritative runtime catalog or a clearly generated set of catalogs. Do not scatter independent copies of the same translations through JavaScript, HTML, build scripts, and tests. Static fallback text in HTML may exist for no-JS resilience, but it must be generated or verified against the authoritative catalog.

Retain the legacy `paceflow_language` storage key if changing it risks migration. A carefully tested migration to a brand-neutral key is allowed only if it is backward compatible and preserves the old value; do not create churn merely for naming aesthetics.

## 7. Main web/PWA and native UI work

Add a third visible language control labelled `Español` beside `English` and `Русский`. It must be keyboard accessible, have correct `aria-pressed`, fit at 320 px width, and remain usable with large text.

Translate every user-visible and accessibility-visible state, including but not limited to:

- hero, Pico labels, value proposition, privacy reassurance, workflow cards, and FAQ;
- import/paste/article/Chrome handoff surfaces and their confirmations/errors;
- demo guide, demo title, demo failure/replacement dialogs, and Spanish demo content;
- library, continue card, search, bookmarks, TOC, rename/delete/export/import flows;
- normal reader, focus reader, WPM/progress/time, playback, rewind, scrubber, keyboard/hardware-control hints;
- settings, themes, storage status, offline/cache/service worker status;
- parser/import errors for all supported formats;
- confirmation dialogs, toasts, empty states, gentle errors, and recovery guidance;
- every placeholder, tooltip, title, `aria-label`, status region, and document title;
- install/download/tester instructions shown on the site;
- any text embedded in generated manifests or install metadata.

Audit hard-coded English/Russian strings in `app.js`, HTML templates, CSS pseudo-content, build-time substitutions, and generated bundles. Convert user-facing strings to the locale system. Do not translate debug-only console messages unless users see them.

When changing language while a modal, library, normal reader, RSVP reader, demo guide, or search result is open, refresh the visible copy without losing playback position, text, selection, search query, modal state, settings, or unsaved draft. Pausing playback during a language change is acceptable only if documented and tested; silently resetting it is not.

Spanish text must tokenize and render correctly with accented graphemes, `ñ`, `ü`, opening punctuation `¿` and `¡`, em dashes, curly quotes, and ellipses. ORP calculation must operate on Unicode grapheme clusters and never split a combining mark. Punctuation timing must behave sensibly for Spanish sentence punctuation.

## 8. Demo and sample content

Add a first-party Spanish demo text, for example `sample_text_es.txt`, with the same purpose and approximate experience length as the existing English and Russian demos. It must be original, safe to distribute, calm in tone, and free from copied books, quotations, personal information, or unverifiable claims.

The selected UI locale chooses the matching demo. A language change must not alter a user-imported document. If the built-in demo is currently open, changing locale may offer or perform a deterministic switch to that locale’s demo only if it does not overwrite a saved user item and the behavior is clearly tested.

Update web, native, service-worker, package, offline, and deterministic-build logic so the Spanish sample is present exactly where required and absent nowhere it is needed.

## 9. Privacy, support, acknowledgements, and public information pages

Provide complete EN/RU/ES versions of privacy and support information. The content must preserve the surface-specific truth:

- web/PWA books, pasted text, library, bookmarks, and progress are local;
- the optional web article importer sends the URL to the owned article service and the returned article text is stored locally;
- native iOS has no article importer and its reading workflow is local/offline;
- the standalone extension stores reading text/progress inside extension storage;
- Quick Send transfers text only after an explicit action;
- old cloud sync is disabled;
- export/delete/support behavior is described accurately.

Do not translate third-party license bodies or modify license wording. Localize the surrounding acknowledgements navigation/headings/help text and clearly present the original notices.

Language switching between public information pages must be discoverable and must land on the equivalent page, not always the home page. All links must work under the current `/rsvp/` subpath and under a future domain root.

## 10. Crawlable multilingual SEO foundation

Prepare correct multilingual SEO infrastructure without enabling production indexing on the current tester-preview IP domain.

The current `product.config.json` intentionally has:

- `release.channel: tester-preview`;
- `finalDomainApproved: false`;
- placeholder store URLs.

Preserve those gates. Preview builds and the live tester site must remain `noindex` and blocked according to the existing release design. Do not change the production service.

Build-system requirements:

1. The project can deterministically generate distinct crawlable locale URLs for a future approved production domain.
2. Use a documented canonical layout. Preferred layout unless a stronger repository-specific reason is documented:
   - English and `x-default`: marketing base path, such as `/rsvp/` in preview and `/` on a final root domain;
   - Russian equivalent: `ru/` below that base;
   - Spanish equivalent: `es/` below that base.
3. Each locale document has a server-rendered/static correct `<html lang>`, unique natural title, description, visible localized content, canonical, and reciprocal `hreflang` links for `en`, `ru`, `es`, and `x-default`.
4. Do not rely only on client-side JavaScript to change SEO title/description/body after a crawler loads an English document.
5. Production sitemap generation includes every approved canonical localized URL and only production URLs.
6. Preview builds contain no approved-looking canonical URL and cannot accidentally become indexable.
7. Nested locale routes load assets, extension downloads, privacy/support pages, service worker, and app functionality correctly under both the `/rsvp/` base path and a future root path.
8. Locale pages must not become doorway pages. Each is a faithful useful version of the actual working product.
9. Do not create hundreds of AI pages, location pages, synonym pages, or thin translated articles.

Create `docs/SEO_I18N_STRATEGY.md` containing:

- the exact locale/canonical/hreflang design;
- a compact intent map for English, Russian, and Spanish;
- evidence-based target phrases, labelled as hypotheses unless real volume data exists;
- initial target concepts such as RSVP reader, speed reader, one-word-at-a-time reader, EPUB speed reader, Chrome reader, privacy/local reader, and their natural RU/ES equivalents;
- a content plan limited to genuinely useful pages/tools rather than content volume;
- measurement plan for impressions, non-branded clicks, CTR, demo starts, imports/installs, and returning users;
- explicit statement that no ranking, traffic, or keyword-volume guarantee is being made.

Free SERP/manual research and official search-engine documentation may be used. Do not buy or sign up for Semrush, Ahrefs, Sensor Tower, Keyword Planner campaigns, advertising, or any paid service. Do not scrape Google automatically.

## 11. Chrome extension localization

Add a complete `chrome-extension/_locales/es/messages.json` with exact key parity to EN/RU and valid Chrome message syntax.

Audit and localize all extension surfaces:

- manifest name/description/action/command;
- context menus;
- popup visible text, fallback text, placeholder, status, errors, and accessibility labels;
- local reader visible text, loading/error states, theme controls, WPM/progress labels, shortcuts, Quick Send status, title, and accessibility labels;
- errors currently originating as hard-coded English strings from background/core code when they can reach a user.

Chrome normally chooses its UI locale. Correctly recognize Spanish UI locales such as `es`, `es-ES`, `es-419`, `es-MX`, and other `es-*` values. Set the document language accordingly. Unsupported Chrome locales use English.

Do not add permissions. Preserve Manifest V3, local standalone reading, explicit Quick Send, CSP, storage limits, extraction safeguards, nonce/expiry behavior, and deterministic ZIP output.

Update the verifier so it proves:

- locale directory set is exactly the supported set unless Chrome-required aliases are documented;
- key and placeholder parity;
- no blank or unresolved messages;
- packaged ZIP contains Spanish catalog and all required files exactly once;
- deterministic checksums remain stable across repeated builds;
- no source map, secret, private content, test output, or unneeded file enters the ZIP.

Run a real unpacked-extension E2E pass for English, Russian, and Spanish UI simulation where technically possible. At minimum automate the locale catalogs and DOM output, then visually inspect Spanish popup and reader. Reassert zero automatic text transfer.

## 12. iOS/Capacitor preparation

The app’s web UI inside Capacitor must offer EN/RU/ES and detect/persist Spanish correctly while offline.

Audit iOS-localizable metadata. If user-visible native metadata exists, add correctly wired `en.lproj`, `ru.lproj`, and `es.lproj` resources such as `InfoPlist.strings` only where needed. Keep the display brand HummingRead. Do not change the bundle identifier, development team, signing settings, entitlements, privacy manifest declarations, or App Store account state.

`npm run build:native` and `npx cap sync ios` must include the Spanish runtime/demo/legal assets needed by the native app, while continuing to exclude:

- article URL import UI and endpoint;
- Chrome extension download/marketing surfaces;
- PWA service worker/manifest/sitemap/robots;
- web-only canonical, OG, Twitter, and structured-data metadata;
- production-only URLs not needed by the native app.

Run unsigned simulator build and analyze if Xcode is available in the execution environment. Never sign, archive for distribution, upload, or claim device QA.

## 13. Store metadata preparation

Extend release documentation with owner-reviewable EN/RU/ES App Store and Chrome Web Store copy. Include, where supported:

- product/listing name;
- subtitle or short description;
- promotional text;
- full description;
- keyword field where relevant;
- privacy/support/marketing URL placeholders from configuration;
- screenshot caption plan;
- honest privacy summary;
- release notes;
- localization reviewer notes.

Validate current platform character limits with deterministic tests or a small verifier. Do not invent final domain/store URLs. Do not mark the app or extension as published. Do not claim trademark clearance, ratings, awards, downloads, medical benefits, or guaranteed speed/comprehension.

## 14. Accessibility and responsive quality

All three languages must meet the same accessibility standard:

- semantic labels and live regions are localized;
- visible labels and accessible names agree;
- language controls expose name, state, and focus;
- no placeholder is the only label;
- keyboard/focus order remains correct;
- reduced motion, contrast, touch-target, and text-resize behavior remain intact;
- no truncation, clipping, overlap, horizontal page scroll, or hidden primary action.

Spanish and Russian are often longer than English. Test real strings rather than widening everything blindly. Allow safe wrapping and responsive layout. Do not reduce normal body text below accessible sizes just to make a translation fit.

Visually inspect, at minimum, these states in EN/RU/ES:

- first-launch hero and primary actions;
- language settings;
- library/continue card;
- normal reader/search;
- RSVP focus paused and playing;
- a confirmation dialog and an error state;
- privacy/support page;
- Chrome popup and Chrome local reader.

Use at least these representative viewports:

- 320×568 portrait;
- 568×320 landscape;
- 390×844 modern iPhone;
- 844×390 landscape;
- iPad portrait and landscape;
- desktop around 1440×900.

Retain useful screenshots/artifacts outside shipped bundles and document them in a concise visual QA report. Never commit huge transient browser profiles or reports.

## 15. Required automated coverage

Add focused tests rather than weakening or deleting existing gates.

### Unit tests

Cover at least:

- EN/RU/ES browser detection and fallback;
- stored-language precedence and persistence;
- invalid stored values;
- key parity and non-empty values;
- placeholder parity and interpolation;
- English, Russian, and Spanish plural categories with representative counts (`0`, `1`, `2`, `5`, `11`, `21`, `22`, `25` as relevant);
- number/date formatting;
- `document.lang` and active language button state;
- Unicode Spanish token/grapheme behavior;
- no HTML execution through translations.

### Product E2E

For each locale, cover:

- launch into the correct language;
- switching among all three languages and persistence after reload;
- main actions and major screen labels;
- demo loads the matching language;
- imported text survives language changes unchanged;
- library/book position/bookmark survive language changes;
- focus playback and controls still work;
- representative dialog/error/toast localization;
- offline reload;
- no native web-only surface regression.

### SEO/build/package tests

Cover:

- correct preview `noindex` behavior;
- production-mode dry build with safe test configuration, without deployment;
- canonical/hreflang reciprocity and correct locale titles/descriptions;
- sitemap locale URL set;
- nested base-path asset integrity;
- service-worker precache completeness;
- native filtering;
- package verification and deterministic repeat build;
- extension locale package integrity.

Do not write tests that merely assert your own fixture without loading the built product. Avoid arbitrary sleeps, weak `console.log` checks, hidden-button assertions, and tests that can pass without exercising the feature.

## 16. Release gates to run locally

Start from a clean dependency install compatible with the repository lockfile. Do not upgrade dependencies unless a localization requirement genuinely needs it; prefer no dependency changes.

Run and record the exact results of all applicable existing and new gates, including:

1. `npm ci`
2. `npm audit --omit=dev`
3. `npm run test:isolation`
4. `npm run test:unit`
5. `npm run test:production`
6. `npm run test:cross-browser`
7. `npm run test:extension`
8. `npm run test:visual`
9. `npm run test:lighthouse`
10. `npm run build:all`
11. `npx cap sync ios`
12. `npm run verify:all`
13. any new locale/SEO/store-metadata verifier
14. `git diff --check`
15. source scan for private files, secrets, unresolved translation keys/placeholders, accidental old brand strings, and untracked build debris without printing sensitive values

If the server lacks Xcode, run all platform-independent native packaging gates, document the limitation precisely, and leave unsigned Xcode build/analyze as an honest owner/Mac gate. Do not call the whole mission complete if a required gate failed.

Lighthouse must not materially regress from the current evidence (approximately 97/100/100/100 on the existing mobile run). Investigate any decrease; do not game the score or disable functionality. Test representative locale pages, not just English.

Existing green test counts are a floor, not a number to fake. New coverage should increase the relevant counts. Never reduce coverage to make the suite pass.

## 17. Documentation and evidence

Update or add concise documentation for:

- localization architecture and how to add a future language;
- supported locale behavior by surface;
- SEO locale/canonical/hreflang strategy;
- EN/RU/ES store copy;
- tester steps for switching and checking each language;
- visual QA matrix;
- release evidence with commands, counts, artifacts, checksums, limitations, and owner gates.

Document these remaining owner gates truthfully:

- native-speaker/legal review of Spanish privacy/store copy;
- final brand/legal approval;
- final domain and public URL approval;
- App Store/Chrome Web Store account actions;
- iOS signing, device QA, TestFlight/App Review;
- actual production deployment and enabling indexing.

Do not let documentation claim `complete`, `published`, `production`, `indexed`, or `device tested` when only preparation or simulation was performed.

## 18. Commit and handoff

Before committing:

1. review the full diff and every generated file;
2. verify no private/user/server data is included;
3. verify the live production checkout and services were not changed;
4. verify all required gates are green or explicitly list a real environment-only limitation;
5. remove transient build/test debris only with narrow, validated paths.

Create logically grouped commits if useful, with a final clean working tree. Push only:

`HEAD:refs/heads/mission/trilingual-en-ru-es-20260812`

Do not merge it.

Final handoff must report:

- exact branch and commit SHA;
- concise inventory of what changed on web/PWA, iOS, extension, SEO, store metadata, tests, and docs;
- exact test commands and pass/fail counts;
- Lighthouse results by tested locale;
- extension ZIP path, exact file list/count, version, and checksum;
- visual QA artifact paths;
- whether push occurred without triggering paid automation;
- every remaining owner-only gate;
- explicit confirmation that production was not deployed or altered.

## 19. Definition of done

The mission is done only when all of the following are true:

- a stranger can use the shipped web/PWA reader completely in English, Russian, or Spanish;
- a native iOS tester can do the same offline, with no web article importer leakage;
- the Chrome extension is complete in all three languages and retains its privacy/permission model;
- all visible strings, dynamic states, accessibility labels, samples, public information pages, and prepared store copy are covered;
- locale detection, selection, persistence, formatting, pluralization, Unicode behavior, and fallback are tested;
- future production SEO can expose distinct correct locale URLs, while the current tester preview remains non-indexable;
- builds remain reproducible and packages contain only intended assets;
- current functionality, privacy, security, storage, accessibility, performance, and offline gates do not regress;
- the implementation branch is reviewable and unmerged;
- no paid service, publication, signing, deployment, or owner-only external action was performed.

Do not stop after translating the obvious landing-page strings. Do not declare success on the basis of key parity alone. Finish the complete user journeys, inspect them visually, and prove the result with the tests and evidence above.
