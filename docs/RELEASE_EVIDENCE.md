# HummingRead release evidence — 2026-08-11

This packet records the final local release-candidate checks for review branch
`integration/pico-release-safety-20260811`. It prepares deployment and store
submission but does not claim either one occurred.

## Automated evidence

- `npm ci`: 264 locked packages installed; `npm audit --omit=dev`: 0 vulnerabilities.
- `npm run test:unit`: 16/16 passed.
- `npm run test:production`: 188/188 passed with one worker across Chromium,
  desktop WebKit, and Mobile Safari; no skipped tests.
- `npm run test:extension`: passed in real Chromium with an unpacked MV3 build,
  covering selection, page extraction, paste/reader behavior, persistence,
  keyboard/focus, protected-page error, explicit Quick Send, and zero automatic
  transmission of sentinel content.
- `npm run test:visual`: passed geometry and overflow checks for 320×568,
  375×667, 390×844, 430×932, iPad portrait/landscape, desktop, EN/RU,
  returning-reader, guided-demo, paused reader, dark, and landscape states.
- `npm run test:lighthouse`: mobile Performance 97, Accessibility 100, Best
  Practices 100, SEO 100 with Lighthouse 13.4.1.
- `npm run verify:all`: brand, notices, package, extension, service-worker,
  deployment, and deterministic-build gates passed. Two consecutive builds
  contained 40 files and shared tree SHA-256
  `9474e7b4cd39bb38a114f887e3a988c4318dd1b1188a74e244df1e01194e3a33`.
- `npm run cap:sync`, `npx cap doctor ios`, `npx cap ls ios`, and `plutil -lint`
  passed. The five detected plugins include pinned Keep Awake 8.0.1.
- Production-mode brand verification intentionally failed because final URL,
  legal approval, and bundle-ID owner gates are unresolved.

## Review artifacts

| Artifact | SHA-256 |
| --- | --- |
| `dist/downloads/hummingread-tester.zip` | `db6e79b7ac6cde92f58cde4fb9a81e67becc827b2f7d212a5d4309ffcf7cadce` |
| `assets/brand/hummingread-chrome-promo-small.png` | `1eb454fd8b5b0fd127e1b8764ba2dcd86b17f4950be559218f8f2cf1ed7e5d21` |
| `assets/brand/hummingread-chrome-marquee.png` | `cbec5d2f500621d446e5c0e102cbab3bd582c8536c75134cfaea659748ea9a8d` |
| `assets/brand/hummingread-og.png` | `d63f082c0fc4b82d9c6052ba01b9f322c2710bbecfd70a7fdf10de07a36e68d1` |
| `assets/icons/app-icon-1024.png` | `26fce257d916fb17ed0445fb8ae6125a1b27011d7d68bc6e1b0dcf249a607bcb` |

## Environment and owner gates

The available macOS host selects `/Library/Developer/CommandLineTools`, not a
full Xcode installation. Consequently an unsigned Release build, Analyze,
simulator/device matrix, signing, archive, validation, TestFlight, and App Store
submission remain explicit external gates in `APP_STORE_CHECKLIST.md`. Chrome
Web Store publication likewise remains gated by owner account, final URLs,
legal name approval, final screenshot selection, submission, and review.

Production deployment was not authorized or attempted. The checked-in nginx,
systemd, backup/quarantine, smoke, and non-destructive rollback procedure is in
`DEPLOYMENT_RUNBOOK.md`.
