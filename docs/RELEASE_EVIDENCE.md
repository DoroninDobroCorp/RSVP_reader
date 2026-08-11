# HummingRead R2 release evidence — 2026-08-12

This packet records the final server-side checks for review branch
`integration/hummingread-release-audit-r2-20260811`. It prepares a release and
deployment path but does not claim production deployment or store publication.

## Automated evidence

- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm run test:isolation`: 1/1 passed while an unrelated process occupied port
  8081; the Playwright suite connected only to its owned marked server on 43181.
- `npm run test:unit`: 17/17 passed, including SSRF transition/special ranges and
  hard, non-sliding, bounded raw-IP bucket expiry.
- `npm run test:production`: 200/200 passed with one worker across Chromium,
  desktop WebKit, and Mobile Safari; `test-results/.last-run.json` recorded
  `status: passed` with no failed tests.
- `npm run test:extension`: passed in real Chromium with an unpacked MV3 build,
  covering local selection/page extraction, standalone RSVP controls,
  persistence, keyboard/focus, protected-page error, explicit Quick Send, and
  zero automatic transmission of sentinel content.
- `npm run test:visual`: passed the fresh/returning/native/focus matrix. The
  568×320 regression now asserts that the scrubber and all three progress stats
  end above the bottom `Continue` control; the corrected screenshot was manually
  inspected.
- `npm run test:lighthouse`: on the deterministic final-channel SEO render,
  Performance 96, Accessibility 100, Best Practices 100, SEO 100 with
  Lighthouse 13.4.1. The actual tester-preview remains intentionally
  `noindex,nofollow,noarchive`, has `robots.txt` `Disallow: /`, no canonical or
  JSON-LD, and no sitemap; package verification checks that separate contract.
- `npm run cap:sync`: passed and copied only the filtered `dist-native` tree.
  Five Capacitor plugins include pinned Keep Awake 8.0.1.
- `npm run verify:all`: brand, complete notices, web/native package separation,
  extension, service-worker, deployment, and deterministic-build gates passed.
  The deterministic web/extension output contains 40 files with tree SHA-256
  `f43418cc8f7281797b667f3872f2e3ff1951d9e11a8fd125226f4648f6af776a`.
- Deployment verification rendered both observed live nginx files without
  modifying them, preserved unrelated locations, passed a real `nginx -t`, and
  executed rollback against an isolated fixture. The fixture restored the old
  public build, exact `rsvp-reader.service`, both nginx files, previous release
  symlink, and private legacy store while preserving the failed build.
- `git diff --check`, Node syntax checks, private-file filename scan, and the
  production dependency audit passed.

## Durable review artifacts on the server

- Visual matrix: `/srv/RSVP_reader-r2/artifacts/visual/`
- Extension screenshots: `/srv/RSVP_reader-r2/artifacts/r2-extension-final/`
- Lighthouse full report: `/srv/RSVP_reader-r2/artifacts/lighthouse-mobile.json`
- Lighthouse summary: `/srv/RSVP_reader-r2/artifacts/lighthouse-summary.json`
- Playwright final status: `/srv/RSVP_reader-r2/test-results/.last-run.json`

These ignored QA outputs are not part of the public package. CI uploads its own
web/extension/visual/Lighthouse and unsigned-iOS evidence artifacts.

## Review artifact checksums

| Artifact | SHA-256 |
| --- | --- |
| `dist/downloads/hummingread-tester.zip` | `4587cd6460dda213fee0853eb285f938b18dbc10092a1bfa5efd1042855a1ac9` |
| `THIRD_PARTY_NOTICES.txt` | `f784a31085afd12657b8226ecbf1f199096c6a222eb6003bb3dc733e3c78938a` |
| `assets/brand/hummingread-chrome-promo-small.png` | `1eb454fd8b5b0fd127e1b8764ba2dcd86b17f4950be559218f8f2cf1ed7e5d21` |
| `assets/brand/hummingread-chrome-marquee.png` | `cbec5d2f500621d446e5c0e102cbab3bd582c8536c75134cfaea659748ea9a8d` |
| `assets/brand/hummingread-og.png` | `d63f082c0fc4b82d9c6052ba01b9f322c2710bbecfd70a7fdf10de07a36e68d1` |
| `assets/icons/app-icon-1024.png` | `26fce257d916fb17ed0445fb8ae6125a1b27011d7d68bc6e1b0dcf249a607bcb` |

## CI, deployment, and owner gates

The final pushed R2 commit must pass both GitHub Actions jobs. The Linux job
repeats the complete web/extension/browser gates; the macOS 15 job resolves
Swift packages, performs unsigned Release build and Analyze, and uploads the
filtered native bundle. Signing/archive/TestFlight and physical-device QA remain
owner gates even after unsigned CI is green.

Production deployment was not authorized or attempted. Live `main` remains at
`29b65d7`; the prepared versioned/atomic activation, exact-topology backup,
positive/negative probes, and executed fixture rollback are documented in
`DEPLOYMENT_RUNBOOK.md`.
