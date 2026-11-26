# FOLLOW-UP MISSION: integrate Pico without losing the release candidate

This is the active corrective mission for the PaceFlow/HummingRead repository.
Read this file completely, then read `MASTER_MISSION.md` completely, before
modifying anything. Execute the work; do not merely write another plan.

The first mission produced valuable visual work, a polished Pico hummingbird
identity, a refreshed web surface, a Chrome Quick Send extension, tests, and a
live deployment. However, it was implemented on an old checked-in base while a
large local safety/release candidate remained uncommitted. The result is two
divergent bodies of valuable work. Your job is to preserve and semantically
integrate both, then finish every missing acceptance gate.

Do not solve this by choosing `ours` or `theirs` wholesale. Do not discard either
the Pico work or the local release/safety work. Do not rewrite the mature reader.

---

## 1. Known starting state — verify it, do not assume it

As of 2026-08-11 the reviewer observed:

- local repository:
  `/Users/vladimirdoronin/VovkaNowEngineer/work_fold/new/paceflow-production`;
- local checked-in base: `6850bd3`;
- local worktree: a large uncommitted release candidate touching the reader,
  server, tests, iOS dependencies, documentation, CI, and deployment files;
- remote production repository: `serverforvovka:/srv/RSVP_reader`;
- remote `origin/main`: `29b65d7`;
- the first executor committed these feature commits on the remote line:
  - `1bab466 Restore production demo smoke gate`;
  - `ad9b5ef Add Chrome quick-send extension`;
  - `98a18ee feat: give PaceFlow a Pico hummingbird identity`;
  - `29b65d7 feat: layer Pico across the reading journey`;
- the live site reflects that remote line;
- the local release/safety changes were not integrated into those commits.

Before acting, independently record:

```text
git status --short
git branch --show-current
git rev-parse HEAD
git remote -v
git log --oneline --decorate -12 --all
git diff --stat
git diff --check
```

Inspect the entire local diff and all untracked paths. Scan filenames for private
books, captures, secrets, signing material, logs, `.build`, reports, and server
data without printing private contents. Preserve the rollback tag
`pre-app-store-polish-20260802` exactly.

The following are forbidden:

- `git reset --hard`, destructive checkout, force push, history rewrite, or broad
  recursive deletion;
- committing `.build`, `node_modules`, reports, archives, user books, captures,
  `data/sync-store.json`, credentials, certificates, logs, or signing material;
- pushing directly to a checked-out production `main`;
- silently replacing the local work with `origin/main` or vice versa.

If any observed state differs materially from the known state, document the
difference and adapt conservatively. Do not erase anything to make history look
clean.

---

## 2. First required outcome: make both histories recoverable

Before product work, create recoverable checkpoints.

1. Run the local baseline gates that are possible without changing source. At a
   minimum: unit tests, production Chromium tests, build, package verification,
   and `git diff --check`. Record exact counts and failures.
2. Create a new local checkpoint branch from the current local worktree. Stage
   only intended source, tests, deployment files, CI, documentation, and the
   tracked SwiftPM lock. Explicitly exclude private/generated material.
3. Commit the local release/safety candidate as a checkpoint with a clear message.
   If some intended file cannot safely be committed, preserve it as a narrowly
   scoped patch outside the repository and document the checksum and path.
4. Fetch the remote without rebasing or rewriting.
5. Create a new integration branch, for example
   `integration/pico-release-safety-20260811`.
6. Merge the remote feature line into the checkpoint line. Resolve every conflict
   semantically. For each conflicted area preserve:
   - the local safety, privacy, storage, wake-lock, performance, test, CI, and
     deployment fixes;
   - the remote Pico visuals, site work, extension assets, extension tests, and
     useful documentation.
7. Produce `docs/INTEGRATION_LEDGER.md` listing each source line, conflict area,
   resolution, intentionally retained behavior, and tests covering it.
8. Push only the integration/release branch. Do not update production `main` at
   this stage.

An acceptable integration contains the union of useful behavior and tests. A
smaller test count than either source line is a warning requiring explanation.

---

## 3. Retain what the first execution did well

Preserve and refine, rather than discard:

- Pico, the hummingbird mascot, as the character identity;
- the warm coral/teal visual language where it remains accessible;
- the app icon and splash direction;
- the refreshed hero and focus-mode character moments;
- the Chrome extension's secure nonce/session handoff as an optional action;
- its Manifest V3 build, deterministic ZIP, unit tests, and real unpacked Chrome
  E2E test;
- the production smoke tests and useful new brand/extension documentation.

Visually inspect all retained assets. Do not accept broken transparency,
low-resolution-only masters, unreadable 32 px silhouettes, or inconsistent icon
safe areas.

The current raster illustrations are useful exports, but the repository still
needs editable, vector-first master assets or clearly documented code-native
sources for the core logo/mascot/icon system. Add provenance and export commands.
Do not invent authorship or licensing facts.

---

## 4. Release blockers that must be fixed before calling the app ready

### 4.1 Native iOS must actually be local-only

The remote feature line currently exposes article URL import in the native build
and resolves a hard-coded remote article endpoint. This contradicts the App Store
copy, review notes, privacy manifest, and product promise.

For iOS v1:

- hide/remove URL article import in the native UI;
- prevent native code from resolving or calling the article service;
- add tests proving the native platform never displays that control and never
  performs the request;
- keep book import, pasted text, library, settings, bookmarks, and reading fully
  useful offline;
- keep disclosures, App Store copy, review notes, privacy manifest, and actual
  behavior mutually consistent.

Do not make a claim such as “Data Not Collected” while any native feature sends a
URL, content, IP-associated request, analytics, or crash data.

### 4.2 Permanently disable legacy cloud sync

Upgraded web users may still have `cloudSyncEnabled: true` in old state. On the
remote line startup can schedule `/api/sync` before cleanup and serialize full
book/draft content. A server-side 404 is not sufficient.

At the earliest settings/bootstrap boundary:

- force legacy cloud sync false in memory and persisted stores;
- clear pending sync flags and timers;
- prevent any sync request from being scheduled;
- preserve local books and progress;
- add an upgrade regression starting from legacy localStorage/IndexedDB state with
  a secret sentinel, then assert zero network requests and no content loss;
- keep `/rsvp/api/sync` unavailable at nginx and application layers.

### 4.3 Integrate native and web wake-lock fixes

The remote line lacks the native KeepAwake dependency and the reviewed race-safe
state machine. Integrate the pinned Capacitor KeepAwake package and SwiftPM lock.

Cover at least:

- play -> pause/background while native `keepAwake()` is unresolved;
- pause -> play while `allowSleep()` is unresolved;
- stale native promise completion cannot leave the screen awake while paused;
- web Wake Lock request resolving after pause;
- web sentinel release resolving after playback resumes must reconcile and request
  a new lock;
- unsupported APIs degrade without breaking playback.

The minimum iOS target includes versions without reliable WebKit Screen Wake Lock,
so a native fallback is required.

### 4.4 Integrate storage and large-book correctness fixes

Preserve the local fixes and regressions for:

- legacy count migration performed transactionally without overwriting a
  concurrent rename, position, or `updatedAt`;
- chunked/cancellable large-book search;
- highlighting only the rendered window rather than hundreds of thousands of
  matches;
- correct scroll positioning below sticky toolbars in normal reader and search;
- bounded responsive behavior on phone portrait, phone landscape, and iPad.

Do not restore whole stale book objects during a field migration.

### 4.5 Remove misleading legacy test gates

The old `test:legacy` suite contains stale selectors, weak/no assertions, private
fixture assumptions, and tests that never start playback. Do not present it as a
quality gate.

Retain the useful replacement scenarios already added locally:

- true playback to final-word pause, including a single-word book;
- named bookmark persistence and restore through the accessible action dialog;
- synthetic FB2 Windows-1251, DOCX, HTML, Markdown, and RTF imports with exact
  assertions and script-content removal.

Remove the obsolete runnable script after those scenarios are green in the main
production suite. Document why.

---

## 5. The Chrome extension is not finished until it reads independently

The current extension is a polished **Quick Send launcher**. It stores a payload in
`chrome.storage.session`, opens the website, and hands the payload to the web app.
That is useful, but it does not satisfy the requested standalone Chrome reader.

Keep Quick Send as an optional secondary action, then add a real local extension
reader in a side panel, overlay, or dedicated extension page. It must work without
the website, account, mobile app, or PaceFlow server.

Required standalone behavior:

- read selected text locally;
- extract readable current-page text locally where permitted;
- accept pasted text locally;
- play/pause RSVP locally;
- adjustable WPM with an explicit WPM label;
- rewind 10 words;
- progress scrubber;
- pause context with the current word visibly anchored;
- light/dark/system themes;
- keyboard controls and visible focus;
- local settings/progress persistence;
- responsive/cancellable handling of large selections;
- accurate error states for protected Chrome pages and unsupported documents.

Privacy requirements:

- selected/page/pasted text must not be transmitted for standalone reading;
- prove that with automated request interception and sentinel text;
- extract with extension/browser APIs or a bundled local parser, not the article
  server;
- reduce permissions to the minimum. Re-evaluate `clipboardRead`; prefer an
  explicit paste event or optional permission if feasible;
- no hard-coded `sslip.io` production identity. Quick Send's web URL must come from
  one build configuration and remain a clearly labelled preview until the owner
  provides the final domain;
- no broad host permission merely for local reading.

The extension ZIP and store package must contain only required public files.
Verify permissions, CSP, icons, manifest, deterministic contents, and checksums.

On the website, do not present Developer Mode sideloading as a normal consumer
download. Until the owner publishes through Chrome Web Store, use wording such as
“Tester build” / “Install unpacked for testing” and a separate “Chrome Web Store:
coming after review” state.

---

## 6. Product naming: Pico can stay; `PaceFlow` is not silently final

The mascot and the product name are separate decisions. Pico may remain the
hummingbird character even if the product name changes.

The previous executor retained `PaceFlow` without completing the required current
collision screen, despite known active software/product collisions. Complete and
document a dated screen for at least:

- `HummingRead` and confusingly similar variants;
- `PicoRead` and confusingly similar variants;
- `PaceFlow` and confusingly similar variants;
- relevant App Store and Chrome Web Store listings;
- general software/product use and major social handles;
- `.com` and `.app` status using registrar/RDAP/WHOIS evidence;
- obvious trademark-database results in the intended software classes.

Write `docs/BRAND_DECISION.md` with sources, dates, findings, risks, and the exact
wording “provisional pending owner/legal confirmation”. Do not claim legal or
trademark clearance.

Decision rule:

- if `PaceFlow` retains a meaningful active-product conflict, do not ship it as a
  supposedly cleared final name;
- if `HummingRead` has no serious exact/confusing active software collision, use
  it as the provisional release brand and keep Pico as mascot;
- use descriptive discovery terms in metadata, not as the sole brand:
  `RSVP speed reader`, `spritz-style reading`, `speed reading`, `read faster`,
  `focus reader`, localized honestly;
- never use another company's trademark to imply affiliation.

Create one central brand configuration/source of truth for name, subtitle, support
URL, privacy URL, website URL, and extension URL. Add a build verifier that catches
obsolete user-facing names and placeholder production URLs in web, iOS, extension,
manifests, metadata, and legal pages. Historical strategy documents may keep old
names if clearly marked historical.

Do not pause the engineering integration while owner/legal confirmation is
pending; use the documented provisional name and leave a precise owner gate.

---

## 7. Fix the first-run and website conversion path

The Pico redesign is attractive, but the current phone layout hides “Import book”
well below the first viewport. The hero and textarea make the page unnecessarily
long, and the product's primary EPUB/FB2 use case is visually secondary.

On a fresh phone launch, the first viewport must show:

- what the product does in one short sentence;
- `Try the 45-second demo`;
- `Import your book`;
- a quiet route to paste/article tools.

For a returning reader, replace the acquisition-heavy hero with a dominant card:

> Continue “{title}” · {progress}% · approximately {remaining time}

Keep the estimate derived from remaining words and WPM; omit it when unreliable.

The demo must teach the key value instead of merely opening a paused reader:

1. Play;
2. after a short interval, pause and reveal surrounding context;
3. demonstrate replay/rewind;
4. finish with `Import your first book`.

Reader controls must clearly distinguish speed changes from navigation. `-20/+20`
without a WPM label looks like word rewind/forward. Provide a visible WPM control,
an explicit rewind action, and no redundant play/search controls.

Finish the website as a credible small product site, without burying the reader:

- concise benefits/use cases;
- supported formats and offline/local explanation;
- “How it works”;
- extension section with truthful tester/store status;
- FAQ, privacy, support/contact, and store-status CTAs;
- canonical/OG/Twitter metadata from configuration;
- structured data where accurate;
- `robots.txt` and sitemap for the final configurable origin;
- responsive phone/tablet/desktop layout;
- no marketing clutter inside focus mode or returning-reader flow.

Privacy language must be surface-specific and literally true. The current web hero
must not say global “NO UPLOAD · NO TRACKING” or “PRIVATE · LOCAL ONLY” while the web
article URL importer sends the URL to a server and hosting processes an IP. Use,
for example, precise distinctions:

- imported books, pasted text, library, progress: stored locally;
- optional web article import: URL is sent to the article service and the server
  fetches the destination;
- native app: local-only, no article service;
- standalone extension reading: local-only;
- optional Quick Send: opens the configured web app and transfers only after an
  explicit action.

Add a no-login support route. A real branded support email and final domain remain
owner inputs, but GitHub Issues alone is not sufficient consumer support.

Run Lighthouse on the production build and target Performance >= 90,
Accessibility >= 95, Best Practices >= 95, and SEO >= 95 on representative mobile.
Document the environment and any honest, justified variance.

---

## 8. Server, privacy, and deployment hardening

### 8.1 SSRF classification

The remote line's IPv6 denylist is incomplete. Integrate the pinned maintained
address classifier and use an allow-public-global-unicast policy. Add tests for
direct and DNS-resolved forms, including at least:

- loopback, unspecified, link-local, unique-local, IPv4-mapped private addresses;
- local-use NAT64 `64:ff9b:1::/48` embedding private IPv4;
- 6to4 `2002::/16` with private/loopback embedded IPv4;
- Teredo/special `2001::/32`;
- ORCHID `2001:20::/28`;
- documentation/reserved/deprecated ranges such as `::/96` and `fec0::/10`;
- redirect revalidation and DNS rebinding/pinning behavior.

Do not weaken credential, protocol, port, redirect, content-type, size, timeout, or
body limits. Defense-in-depth outbound restrictions are welcome where reversible.

### 8.2 Truthful web privacy

The web policy must disclose optional article import accurately: submitted URL,
server destination fetch, IP/rate-limit processing, access-log behavior, purpose,
retention, and deletion limits. The native and extension policies must describe
their different behavior.

If production article access logging is disabled and the rate-limit IP key has a
hard in-memory expiry, state the exact behavior. Do not claim “no tracking” merely
because there is no analytics SDK. Align:

- runtime behavior;
- nginx configuration;
- `privacy.html` and source policy;
- App Store privacy answers/manifest;
- Chrome Web Store privacy disclosure;
- review notes and marketing copy.

### 8.3 Production process hardening

At review time the live server was observed as:

- systemd `User=ubuntu`;
- application bound to `0.0.0.0:8081`;
- `ExecStart=/usr/bin/npm start`;
- article nginx location without the intended method restriction, applied rate
  limit, `access_log off`, or full security-header/CSP policy.

The static alias was correctly restricted to `/srv/RSVP_reader/dist/`, and public
requests for `.git/config` and `server.js` returned 404. Preserve that.

Integrate and verify the local hardened deployment artifacts:

- dedicated locked `paceflow` service user;
- loopback-only bind;
- direct Node entrypoint and deterministic production dependencies;
- systemd sandboxing and least privilege;
- nginx POST-only article endpoint;
- applied request/concurrency/size/time limits;
- article endpoint access log disabled if that is the documented privacy design;
- restrictive CSP and security headers;
- static serving only from built public output;
- `/api/sync` remains 404;
- negative probes for repository, data, source, native, test, dependency, and book
  paths.

The old ignored sync store must not remain world-readable in the repository tree.
Move it recoverably to a root-owned quarantine/archive location, mode 0600, after
a verified backup. Do not delete it during this mission.

Before any authorized deployment, make a fresh backup of the currently working
nginx, systemd unit, built `dist`, relevant ignored data, and old commit. Existing
backups may contain the historical repository-exposure bug and are not sufficient.
Write and test a rollback procedure that does not use `reset --hard`.

The existing owner request authorized work on the known RSVP server in the master
mission's scope, but do not treat that as permission to buy a domain, publish a
store listing, or overwrite production from an unreviewed branch. First produce a
green integration branch and deployment evidence. If production deployment is not
explicitly authorized in the active execution environment, stop at a tested
release artifact and exact commands. Never push into checked-out production main.

---

## 9. Packaging, legal notices, CI, and store readiness

Integrate and complete:

- pinned `package-lock.json` dependencies;
- tracked SwiftPM `Package.resolved`;
- `docs/THIRD_PARTY_NOTICES.md` with exact shipped dependencies and licenses;
- a built, user-readable acknowledgements surface or bundled acknowledgements
  artifact appropriate for web/iOS/extension;
- `.github/workflows/ci.yml` covering the actual release gates;
- deterministic web and extension builds;
- package/private-file verifiers;
- final App Store copy, privacy, support, review notes, age-rating/content-rights
  notes, screenshot plan, and owner-gate checklist;
- Chrome listing copy, screenshots, privacy disclosure, permission rationale,
  package checksum, and publication checklist.

Do not claim that App Store signing/archive, TestFlight, physical-device QA, seller
identity, bundle registration, tax/banking, pricing, domain ownership, support
email, or store publication is complete without the owner's account/evidence.

Current known owner/native gates include:

- `DEVELOPMENT_TEAM` is not configured;
- bundle identifier `team.ibet.paceflow` is provisional and must follow the final
  owner-approved brand/account decision;
- Apple archive/Validate/TestFlight and physical-device QA remain pending;
- final App Store iPhone/iPad screenshots do not yet exist;
- final domain and no-login support email are pending.

---

## 10. Required validation — report exact evidence, not adjectives

Run from a clean integration checkout with pinned dependencies:

1. `git diff --check` and private/generated-file scan.
2. Node syntax checks and `npm audit` with scope stated.
3. All unit/security/storage/wake-lock tests.
4. Full production Chromium suite.
5. WebKit/Mobile Safari suite.
6. Offline/PWA/service-worker upgrade suite.
7. Extension unit tests and deterministic build verification.
8. Real unpacked-extension Chrome E2E covering local standalone reading, Quick
   Send, protected-page errors, persistence, keyboard/focus, and zero content
   transmission.
9. Web build, Capacitor sync, packaged-asset verification, brand/placeholder leak
   verification, notices verification, and service-worker precache verification.
10. Unsigned Release Xcode build and Analyze after the final icons, splash, web
    bundle, plugins, privacy manifest, and SwiftPM lock are integrated.
11. Simulator visual checks for current required iPhone and iPad sizes, portrait
    and landscape where relevant.
12. Screenshot regression/visual inspection for fresh web first launch, returning
    reader, focus mode, search, large book, dark mode, desktop site, and extension
    on light/dark host pages.
13. Lighthouse evidence.
14. Deployment verifier and live positive/negative smoke tests if deployment is
    authorized.

On this reviewer's macOS environment Playwright WebKit 2336 segfaulted during
browser launch. Chromium application tests and real Chrome extension E2E passed,
but the WebKit crash made the combined release check incomplete. Do not relabel an
environment crash as a product pass or product failure. Reproduce the WebKit gate
in an official Playwright Docker/Linux or suitable CI/macOS environment, capture
the exact version and result, and keep the gate open until real WebKit tests run.

Do not allow a shell sequence to report success merely because a later `curl`
command returned zero after an earlier test failed. Every release command must
propagate the first failing exit status.

Do not cite test counts from before the final visual assets, integration, or iOS
dependency changes. Record exact final counts, skips, environment, commands, and
artifact checksums.

---

## 11. Visual acceptance checklist

Capture and inspect, not just generate:

- fresh 320/375/390/430 px phone first launch with both primary CTAs visible;
- returning-reader phone state;
- phone landscape with no bottom-control overlap;
- iPad portrait and landscape without compressed search/privacy controls;
- desktop landing and active reader;
- focus mode light/dark, paused context, WPM and rewind controls;
- extension reader popup/side panel/overlay on both a light and dark page;
- extension error state on a protected Chrome page;
- every app/PWA/iOS/extension icon at small and large sizes;
- App Store and Chrome Store screenshot candidates without placeholder domains or
  unsupported claims.

Check contrast, focus order, reduced motion, dynamic text/zoom, touch targets,
screen-reader names, sticky-header offsets, clipping, and scroll traps. Automated
screenshots alone are not visual QA; record what was inspected and fixed.

---

## 12. Definition of done

This follow-up is complete only when:

- both divergent work lines are recoverable and integrated on a reviewable branch;
- Pico and the useful visual/Quick Send work are retained;
- the current product name has a documented collision screen and is clearly
  provisional;
- iOS is genuinely local-only and offline;
- legacy sync cannot transmit upgraded users' books;
- native and web wake-lock races are covered and fixed;
- storage migration and large-book regressions are integrated;
- the extension provides a useful standalone local RSVP reader, with Quick Send
  secondary;
- privacy claims are surface-specific and truthful;
- website first-run conversion, marketing basics, SEO, accessibility, and
  responsive behavior meet the acceptance gates;
- SSRF special-range coverage and production hardening are complete;
- CI, locks, notices, packaging, screenshots, and release documentation reflect
  the final product;
- all available application, browser, extension, offline, package, security, and
  unsigned iOS gates are green with exact evidence;
- no private/generated material has entered Git or public artifacts;
- deployment is either safely completed with rollback/live probes under explicit
  authorization, or left as a precise tested owner action;
- remaining blockers are exclusively owner/account/legal/publication/device gates.

---

## 13. Final handoff format

End with one evidence-backed report containing:

1. **Source-control reconciliation** — checkpoint commits, integration branch,
   remote branch, preserved rollback tag, and a concise conflict ledger.
2. **What was retained** — Pico, site, Quick Send, tests, and assets.
3. **What was corrected** — native privacy, sync, wake locks, migration,
   performance, extension autonomy, SSRF, deployment, and claims.
4. **Brand decision** — provisional name, evidence links, known risks, exact owner
   approval still needed.
5. **Product result** — app, website, extension separately.
6. **Verification matrix** — exact commands/counts/platforms/skips and CI links or
   artifacts. No “all green” without evidence.
7. **Visual QA** — screenshot paths and what was checked.
8. **Security/privacy** — threat cases, negative probes, runtime/disclosure match.
9. **Deployment** — not attempted/prepared/deployed, live SHA, backups, health and
   negative probes, rollback path.
10. **Artifacts** — web build, extension ZIP and checksum, vector masters, icons,
    screenshots, store copy, privacy/support/notices, release documents.
11. **Owner-only actions** — a short precise checklist: final brand/legal approval,
    domain, support email, Apple account/team/bundle/signing, device/TestFlight,
    store screenshots/publication, pricing/territories/tax/banking, Chrome developer
    account/publication, and any optional analytics decision.

Do not end with another backlog disguised as completion. If an engineering gate is
red, continue fixing it. Stop only at a genuine owner-only or external-environment
gate, and show the exact evidence.
