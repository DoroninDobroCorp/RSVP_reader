# R2 AUDIT CORRECTION MISSION

## Purpose

Continue from the technically strong HummingRead review candidate at commit
`89efb7df5b5d7358b310b70a7ee214abc13c7103`. Preserve Pico, the current site,
the standalone extension, and the reader fixes. Do not redesign or rewrite the
product.

An independent audit reproduced most core engineering claims but found several
release, privacy, native-packaging, test-integrity, licensing, and deployment
gaps. Correct them, prove the corrections, and leave a truthful R2 review branch.

This is an execution task, not a request for another plan.

## Server-only coordinates and source-control boundary

- Working server: `serverforvovka`.
- Production checkout: `/srv/RSVP_reader`.
- Production `main` must remain at `29b65d7` during this mission.
- Audited review branch: `integration/pico-release-safety-20260811` at
  `89efb7d`.
- Mission files in `/srv/RSVP_reader` are intentionally untracked and must not be
  deleted, committed, or published.
- Preserved rollback tag: `pre-app-store-polish-20260802`; never move or rewrite
  it.

Create a new branch from `89efb7d`, for example:

`integration/hummingread-release-audit-r2-20260811`

Do not work on or push production `main`. Do not deploy or reload production
services in this mission. Do not use force push, history rewriting,
`git reset --hard`, destructive checkout, or broad deletion.

Before changing source, record the exact server status, refs, remotes, diff, and
ignored/private paths. Use a separate worktree or clone outside the production
checkout so active production remains untouched.

## What the independent audit verified

The following are valuable and should be retained:

- `16/16` Node unit tests passed from a clean server clone.
- The full application suite passed `188/188` in an isolated network namespace:
  Chromium, WebKit, and Mobile Safari, one worker, 15.2 minutes.
- The real unpacked Manifest V3 extension passed twice in isolated Chromium,
  including local selection/page reading, persistence, keyboard controls,
  protected-page handling, explicit Quick Send, and zero automatic transmission
  of sentinel content.
- The visual geometry suite passed in isolation.
- Manual inspection confirmed that the main landing page and extension are
  distinctive, coherent, and generally polished; both first-screen CTAs are
  visible at 320x568.
- `npm run cap:sync` and the existing `verify:all` completed.
- Extension ZIP checksum reproduced exactly:
  `db6e79b7ac6cde92f58cde4fb9a81e67becc827b2f7d212a5d4309ffcf7cadce`.
- Deterministic web tree reproduced exactly:
  `9474e7b4cd39bb38a114f887e3a988c4318dd1b1188a74e244df1e01194e3a33`.
- Independent Lighthouse on the server produced Performance 98,
  Accessibility 100, Best Practices 100, SEO 100.
- `npm audit --omit=dev` reported zero vulnerabilities.

Do not throw away these results. Corrections below will change the commit, so all
affected gates must be rerun on the final R2 SHA.

---

## P0: source-control and CI evidence must become real

The audited branch exists only as a local branch in the server repository.
`git ls-remote origin refs/heads/integration/pico-release-safety-20260811`
returned no ref. Therefore the checked-in GitHub Actions workflow has not run for
this release candidate. “CI completed” is currently an overclaim.

Additionally, `docs/MISSION_BASELINE.md` and `docs/INTEGRATION_LEDGER.md` claim a
`checkpoint/pico-production-20260811` branch, but that ref is absent on the
server.

Required corrections:

1. Make all source-control evidence literal and reproducible.
2. Either create the claimed checkpoint ref at the documented SHA, or remove the
   claim and explain that `origin/main` at `29b65d7` is the recoverable Pico
   checkpoint. Never invent a ref.
3. Update the integration ledger to distinguish:
   - preserved remote Pico history;
   - reconstructed safety fixes;
   - the unavailable original dirty worktree;
   - the R2 audit corrections.
4. Push only the new R2 integration branch to `origin`.
5. Wait for the actual GitHub Actions run. Capture the branch, run URL/ID, job
   names, exact conclusion, and final SHA.
6. If CI cannot run because of credentials, quota, or platform availability,
   report that exact external blocker. Do not write “CI passed”.
7. A full unsigned Xcode Release build and Analyze are engineering gates, not
   owner/signing gates. The workflow already has a macOS job; get real evidence
   from that job before declaring them complete. Signing, archive, TestFlight,
   and device QA remain owner gates.

Do not merge the R2 branch into `main` and do not deploy it.

---

## P0: fix the article rate-limit privacy contract

The privacy policy claims that a raw-IP abuse bucket has a hard ten-minute
expiry. The implementation does not guarantee that. `articleRateBuckets` removes
expired entries only when the same client returns or when the Map reaches its
size limit. Under low traffic a raw IP key can remain in memory indefinitely.

Required behavior:

- no raw IP key remains in the in-memory rate-limit store beyond the documented
  maximum retention window;
- expiry does not slide when requests increment a bucket;
- the store remains bounded;
- shutdown/restart clears cleanup resources;
- tests do not hang because of a referenced interval/timer;
- privacy documentation states exactly what the implementation does.

Implement a deterministic cleanup mechanism, such as an unref'ed bounded sweep
or safe per-bucket expiry. Expose only the minimum test seam needed. Add tests
with a controllable clock proving:

1. a new address is present during the window;
2. repeated requests do not extend its original deadline;
3. it is physically deleted from the Map at or before the promised maximum;
4. size limits still work;
5. no request content or submitted URL is stored in the bucket.

Do not merely change the policy to allow indefinite retention.

---

## P0: make deploy and rollback match the actual server

The prepared deployment files were verified only by string matching and do not
match the live host topology.

The independent read-only server audit found:

- active unit: `/etc/systemd/system/rsvp-reader.service`;
- active service: `rsvp-reader.service`, enabled and running;
- current service user: `ubuntu`;
- current process listens on `0.0.0.0:8081`;
- current unit runs `/usr/bin/npm start`;
- relevant nginx RSVP locations exist in:
  - `/etc/nginx/conf.d/00-ip-access.conf`;
  - `/etc/nginx/sites-enabled/spanish-sslip`;
- the runbook's assumed files do not exist:
  - `/etc/nginx/sites-enabled/default`;
  - `/etc/nginx/snippets/rsvp.locations.conf`;
  - `/etc/nginx/conf.d/hummingread-limits.conf`;
  - `/etc/systemd/system/hummingread.service`.

The current runbook would start `hummingread.service` without stopping
`rsvp-reader.service`, so the new process would collide on port 8081. It also
never explains how code from the review branch reaches the service while
production `main` remains checked out. Its rollback restores only `dist` and
some assumed config files, not the Node source/dependencies/service topology.
Its curl smoke uses a `--resolve` hostname that does not match the URL and then
suppresses failure with `|| true`.

Correct the deployment design without applying it:

1. Add a read-only preflight that discovers and validates the exact active unit,
   socket, nginx files/server blocks, static roots, current commit, ignored data,
   and ownership. It must fail closed on unexpected topology.
2. Choose and document one coherent versioned-release design. Prefer a separate
   release directory or atomic `current` symlink so production `main` does not
   need to be rewritten. The service must run the reviewed server code and
   production dependencies from that exact release SHA; nginx must serve the
   matching `dist`.
3. If retaining a renamed `hummingread.service`, explicitly stop/disable the old
   unit before binding and restore it on rollback. Simpler is to harden the
   existing `rsvp-reader.service` name. In either case, prevent double bind.
4. Backup the real nginx files, real unit, current build, current application
   code/release pointer, dependency state needed for rollback, and quarantined
   legacy store. Record modes and checksums.
5. If a new nginx file is installed where none existed, rollback must remove it.
   If an existing file is changed, rollback must restore it byte-for-byte.
6. Cover both RSVP static locations. Preserve unrelated applications and server
   blocks.
7. Keep static serving restricted to the reviewed public build and use
   `try_files ... =404`; this project is not a client-side router. Missing JS/CSS
   or arbitrary paths must not return `index.html` with HTTP 200.
8. Preserve POST-only/rate-limited/unlogged/no-store article handling,
   `/api/sync` 404, loopback Node binding, dedicated locked user, and systemd
   sandboxing.
9. Validate generated config with a real `nginx -t` against a temporary complete
   config and `systemd-analyze verify`, not string presence alone.
10. Add safe fixture-based tests for backup/rollback behavior. They must never
    point at `/`, `$HOME`, a broad workspace, or live `/etc` during tests.
11. Make smoke probes fail on the first error. Use a URL and `--resolve` host that
    actually correspond. Remove unconditional success suppression.
12. Prove rollback restores the prior build, Node code/release pointer, service,
    socket owner/address, nginx files, and positive/negative probes.

Update `verify:deployment` so the old broken design cannot pass. Do not install,
reload, stop, or restart live services during this mission.

---

## P1: tests must never attach to an unrelated process

The first independent `npm run test:production` on the server silently reused
the live old application on port 8081 because `playwright.config.js` has
`reuseExistingServer: true`. It consequently tested `main` instead of the review
branch. The visual and extension runners also accept any responsive process at
8081. This can create both false failures and false passes.

Required corrections:

- every local/CI test family owns a dedicated loopback port or an isolated
  ephemeral server;
- application, extension, visual, and Lighthouse runners do not reuse an
  arbitrary pre-existing service;
- a port collision fails loudly rather than switching products;
- test server startup verifies a branch/build marker before continuing;
- all hard-coded low-level HTTP requests use the configured test origin/port;
- every child process is terminated on success, failure, and interruption;
- release shell commands propagate the first failing exit code.

Use separate default ports for test families if dynamic port handoff is
impractical. Set `reuseExistingServer: false` for release/CI gates. Add a
regression that occupies the old default port with a fake page and proves the
suite does not test it.

The visual runner must not report success against live production merely because
it answers HTTP 200. The extension runner must not Quick Send into an unrelated
site.

---

## P1: retire the stale legacy suite correctly

`package.json` still exposes `test:legacy`. The useful replacement scenarios
were not all ported into the release suite.

Add deterministic production regressions for:

1. actual play through the final word followed by a paused/end state, including
   a single-word book;
2. creation of a named bookmark through the accessible dialog, reload, and exact
   position restoration;
3. synthetic end-to-end imports of FB2 Windows-1251, DOCX, HTML, Markdown, and
   RTF, with each saved as the correct separate book and script content removed.

Current helper-level encoding assertions do not replace end-to-end import tests.
Once the replacements are green, remove the `test:legacy` script and clearly
document why the old files are not a release gate. Do not use private book
fixtures.

Update the production smoke suite as well. It currently expects a
`PaceFlow|RSVP` title and downloads `paceflow-quick-send.zip`. It must validate
HummingRead, `hummingread-tester.zip`, the final headers, and the correct expected
preview/deployed channel. Keep live smoke out of pre-deploy release checks unless
an explicit target URL is supplied.

---

## P1: make the native surface local-only before JavaScript and in its copy

The native runtime guards prevent the article request after initialization, and
that test is valuable. But web-only elements exist visible in the initial HTML
until JavaScript hides them, so they can flash during native startup. Native copy
also still mentions articles, Chrome handoff, a link fast lane, and the optional
web article importer in other hero/story elements.

Required native outcome:

- web-only article and Chrome controls are hidden by default in static markup and
  unhidden only after a confirmed non-native bootstrap;
- there is no first-paint flash or accessibility exposure of those controls in
  native mode;
- native hero, flow, dock, privacy, and benefit copy describe only local books,
  documents, and pasted text;
- the native bundle does not include the Chrome tester ZIP, Chrome store promo
  artwork, `robots.txt`, `sitemap.xml`, or other clearly web/store-only payloads;
- web/PWA retains the article importer and tester extension flow;
- native remains usable offline with books/paste/library/demo.

Add tests at static/first-paint time, after native bootstrap, and against the
packaged iOS public tree. Keep the existing zero-request route assertion.

Do not change the bundle identifier without owner approval.

---

## P1: correct remaining privacy wording and visual defects

Manual review found two issues:

1. The web header still displays `PRIVATE · LOCAL ONLY`. On a page that contains
   the optional server-assisted article importer, this reads as a global claim.
   Use surface-specific wording such as `LIBRARY · LOCAL ON THIS DEVICE` on web.
   Native and standalone extension may use the stronger local-only statement
   where it is literally true.
2. In the phone paused-reader screenshot, the “before” text sits at the top of a
   tall context panel while the current highlighted word is near the bottom,
   leaving a large empty void. Bottom-align or otherwise compact the preceding
   passage so the current word is visually connected to its context. Preserve
   the intended 48-before/12-after logic and scrolling for long context.

Add screenshot/geometry assertions for both. For the context panel, assert a
reasonable visual distance between the last preceding line and the current mark,
not merely that both elements exist.

Also replace the customer-facing backup filename
`paceflow-backup-YYYY-MM-DD.json` with a HummingRead filename while preserving
the ability to import old backups. Internal `paceflow_*` storage/native paths and
the gated old bundle identifier are compatibility identifiers and must not be
mass-renamed.

Strengthen `verify:brand` to distinguish documented compatibility identifiers
from user-facing leaks, including generated assets, download names, production
smoke tests, metadata, and legal pages.

---

## P1: ship legally useful third-party notices

The current `docs/THIRD_PARTY_NOTICES.md` is only a package/version/SPDX table.
The user-facing acknowledgements page explicitly says it is not a replacement
for license files. The packaged web/iOS/extension artifacts do not include the
required license and copyright notices from `node_modules`. Therefore the
current `verify:notices` proves inventory, not notice compliance.

Produce and package a real notices artifact that includes applicable copyright
and license text for shipped components, including the client/native/extension
dependency chain such as Capacitor, Capacitor Community Keep Awake, JSZip and its
embedded pako/lie/setImmediate components, and any Apache/BSD/Zlib/ISC notices
that require reproduction. Clearly separate:

- web/iOS/extension shipped code;
- server-only dependencies;
- development-only tools.

Do not blindly paste every dev dependency. Derive from locks/bundles and verify
exact shipped versions. Preserve license choice where dual-licensed components
are used. Make the complete notices readable from the distributed product, not
only from an unshipped source-repository path.

Strengthen `verify:notices` to check required texts/copyright entries and their
presence in web and iOS packages, not just package names.

Clarify the provenance of retained raster Pico assets: source/tool, date, owner
or generated status, and the basis on which they may be shipped. Do not invent
facts; if provenance is unknown, record it as an owner/legal gate.

---

## P1: make support and preview status truthful

The current support page itself requires no login, but its only actual contact
action is GitHub Issues, which generally requires a GitHub account. Do not call
that a completed “no-login support route”.

Until the owner provides a real support email or equivalent no-login channel:

- keep recovery guidance public;
- label GitHub Issues as an optional tester/technical channel;
- keep no-login contact as an explicit release blocker in every final checklist
  and summary;
- do not claim consumer support is complete.

The tester-preview build currently publishes an indexable canonical sslip URL,
`robots.txt` with `Allow: /`, sitemap, structured data, and a provisional brand.
Prevent accidental search indexing of the tester channel. A tester build should
emit `noindex`/disallow behavior. The final production SEO configuration may be
generated and structurally tested, but must activate only after owner approval of
the brand and final domain. Keep Lighthouse reporting honest about which channel
was audited.

---

## P1: preserve review evidence on the server

The prior evidence and visual documents refer to artifacts generated in an
ignored macOS directory. No screenshots, Lighthouse JSON, R2 extension ZIP, or
CI evidence are currently preserved on the server branch/review host.

For the final R2 SHA, create a durable, non-public server artifact directory such
as:

`/srv/hummingread-review-artifacts/<FULL_R2_SHA>/`

It must not be under an nginx-served root and must not contain private books,
credentials, logs with user IPs, certificates, or signing material. Preserve:

- exact test logs/summaries;
- Lighthouse summary and report;
- selected visual matrix screenshots;
- extension popup/reader/error screenshots;
- deterministic web tree manifest;
- extension ZIP and checksum;
- package/private-file scan result;
- CI run URL/ID and conclusions;
- Xcode build/analyze log artifact if CI runs it;
- a SHA-256 manifest for every preserved artifact.

Update `docs/RELEASE_EVIDENCE.md` and `docs/VISUAL_QA.md` with server paths,
final SHA, commands, environment, counts, and honest remaining gates. Do not use
unreachable `/Users/...` links.

---

## Validation required on the final R2 commit

Run from a clean, isolated server checkout with pinned dependencies:

1. full status/private/generated-file scan and `git diff --check`;
2. Node syntax checks and shell syntax checks;
3. `npm ci` and `npm audit --omit=dev`;
4. all unit/security tests, including physical IP-bucket expiry;
5. full Chromium, WebKit, and Mobile Safari application suite on an owned test
   server, including the three newly ported legacy scenarios;
6. real unpacked extension E2E with zero automatic sentinel transmission;
7. visual matrix plus manual inspection of the pause context, native first paint,
   web privacy badge, returning card, phone landscape, iPad, desktop, extension,
   and reduced motion;
8. preview-channel noindex verification and separately identified final-channel
   SEO structure check;
9. Lighthouse with exact channel/environment/scores;
10. web build, filtered native package, Capacitor sync, service-worker, brand,
    notices, extension ZIP, deterministic build, and private-file verification;
11. real nginx temporary-config validation, systemd unit verification, and
    fixture-based deployment/rollback tests;
12. push the R2 branch and wait for actual CI, including unsigned Xcode Release
    build and Analyze;
13. verify production `main`, live unit, nginx, and public site were not changed by
    this mission.

Do not hard-code an expected final test count before adding the missing tests.
Report the actual count and ensure it is greater than the audited 188 where the
new production scenarios run.

## Definition of done

R2 is complete only when:

- the review branch is pushed and real CI evidence exists;
- source-control/checkpoint documents contain no nonexistent refs;
- raw IP buckets are physically removed within the promised window;
- deployment and rollback match the actual server and pass non-live fixture and
  config validation;
- tests cannot reuse an unrelated service;
- the useful legacy scenarios are in the main release suite and the stale script
  is gone;
- native first paint and packaged content contain no web article/Chrome surface;
- web privacy wording is scoped accurately;
- paused context no longer contains the large accidental visual void;
- full shipped third-party notices are packaged and verified;
- no-login support remains an honest blocker until supplied;
- tester preview cannot be indexed as the final product;
- final R2 artifacts and checksums are preserved on the server;
- final docs state exactly what passed and what remains an owner gate;
- production `main` and live services remain untouched.

## Final handoff

Provide one concise report containing:

1. R2 branch and full SHA;
2. pushed origin ref and CI run links/results;
3. corrected findings mapped one-to-one to this audit;
4. final test/build/visual/Lighthouse/Xcode matrix;
5. server artifact directory and checksum manifest;
6. deployment design and dry-run/validation evidence, explicitly “not deployed”;
7. proof that production main/live service/nginx were unchanged;
8. remaining owner-only gates: legal name approval, final domain, real no-login
   support email/channel, bundle ID/team/signing, physical-device/TestFlight,
   store accounts/publication, pricing/territories/tax/banking.

Do not write “technical mission complete” while an engineering or CI gate above
is unresolved.
