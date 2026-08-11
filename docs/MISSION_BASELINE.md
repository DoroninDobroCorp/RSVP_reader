# Mission baseline — 2026-08-11

## Source-control state

- Production source: `serverforvovka:/srv/RSVP_reader`.
- Production branch and SHA: `main` at `29b65d7d6631b3ec6c534acb351e6ef3b5a0fcc4`.
- Production worktree changes: only the owner-provided, intentionally untracked
  `AGENTS.md`, `FOLLOWUP_MISSION.md`, and `MASTER_MISSION.md`.
- Preserved rollback tag: `pre-app-store-polish-20260802` points to tag object
  `7e7f142844d7c906ddab841fbde97e6994274bc5` and remains unchanged.
- Local immutable checkpoint branch:
  `checkpoint/pico-production-20260811` at `29b65d7`.
- Working branch: `integration/pico-release-safety-20260811`.

The release/safety worktree described in the follow-up mission was not available
at the specified `/Users/vladimirdoronin/...` path in this execution environment.
It was also not recoverable from any accessible clone's stash, reflog, or dangling
commits. Three dirty clones under `Downloads/new` were inspected and matched the
already-committed Quick Send, Pico identity, and Pico overlap changes. A clean
older clone at `~/Desktop/RSVP_reader` ended at `a1b4edc`. None was the missing
release/safety candidate. This integration branch therefore preserves the entire
Pico production line and reconstructs every safety behavior named by the two
mission specifications; it must not be represented as a byte-for-byte recovery
of the unavailable worktree.

## Private/generated-file inspection

The production and local status, full tracked diff, untracked names, ignored
paths, stashes, reflogs, and unreachable commits were inspected without printing
private file contents. No user books, captures, credentials, signing material,
logs, reports, `.build`, or `data/sync-store.json` were found among candidate
changes. Generated `node_modules/`, `dist/`, and `test-results/` remain ignored.
The three mission files are excluded only in the local checkout's
`.git/info/exclude`; the server copies remain present and untracked.

## Baseline validation

Environment: macOS, Node `v22.23.1`, npm `10.9.8`, Playwright `1.62.1`, clean
`npm ci` from `package-lock.json`.

| Gate | Result |
| --- | --- |
| `node --check app.js epub-parser.js i18n.js server.js service-worker.js` (run per file) | pass |
| `git diff --check` | pass |
| `npm audit --audit-level=low` | pass, 0 vulnerabilities |
| `npm run test:unit` | pass, 12/12 |
| `npm run test:production` | **baseline red**: 158 passed, 2 expected cross-project skips, 1 Chromium failure |
| `npm run build` | pass |
| `npm run cap:sync` | pass, 4 Capacitor plugins |
| `npm run verify:package` | pass, 16 source/web/iOS assets plus native privacy metadata |
| `npm run verify:extension` | pass, Manifest V3 1.0.0 with 14 packaged files |
| `npm run test:extension` | pass, real unpacked Chrome service worker/session/site handoff |

The Chromium baseline failure was
`mobile search remains visible while the inner reader scrolls to a distant result`:
the outer document moved by 2 CSS px while the assertion allowed 1 px. The same
scenario passed in WebKit and the Mobile Safari profile. It remains an engineering
gate to fix, not a waived flake.

The first direct `npm run verify:package` after `npm run build` failed because the
iOS public bundle did not yet exist in the fresh clone. Running the documented
`npm run cap:sync` generated the bundle, after which package verification passed.

## Missing expected release-candidate artifacts

At baseline these mission-described files were absent and must be reconstructed:

- `.github/workflows/ci.yml`;
- `deploy/nginx-rsvp.locations.conf`;
- `deploy/rsvp-reader.service`;
- `docs/THIRD_PARTY_NOTICES.md`;
- tracked SwiftPM `Package.resolved` and the native Keep Awake dependency.

## Owner-only gates known at baseline

Final brand/legal approval, domain and support email, Apple team/bundle/signing,
App Store Connect and Chrome developer accounts, physical-device/TestFlight QA,
store publication, pricing/territories/tax/banking, and any future analytics
decision remain owner-controlled actions.
