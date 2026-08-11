# Integration ledger

This ledger records how the two mission-described lines are preserved or
reconstructed on `integration/pico-release-safety-20260811`.

| Area | Pico/remote line retained | Safety/release line integrated | Evidence |
| --- | --- | --- | --- |
| Source control | Full `29b65d7` production tree; local checkpoint branch and rollback tag | Missing original worktree recorded without inventing provenance; work rebuilt in review-only integration commits | `docs/MISSION_BASELINE.md`; `checkpoint/pico-production-20260811` |
| Brand and art | Pico character, coral/teal language, icons, splash, hero and layered overlaps | Editable vector masters, pose sheet, design tokens, responsive exports, provenance, dimensions/alpha checks | `assets/brand/`; `docs/ASSET_PROVENANCE.md`; `verify:package` |
| Chrome | Secure nonce/session Quick Send and deterministic package | Standalone local RSVP reader, five minimal permissions, protected-page handling, persistence, keyboard/focus, local extraction, sentinel zero-transmission coverage | `chrome-extension/reader.*`; `verify:extension`; real Chrome E2E |
| Reader/storage | Mature storage/parser/reader implementation and existing regressions | Native article UI/endpoint removed; legacy sync retired before bootstrap and `/api/sync` now 404; pinned KeepAwake plus race-safe native/web reconciliation; inner reader scroll isolated from page | `app.js`, `server.js`, `Package.resolved`; final 188-test Chromium/WebKit/Mobile Safari matrix |
| Server/deploy | Current article extractor and public `dist` deployment behavior | DNS-pinned global-unicast SSRF classification, bounded rate buckets, loopback bind, hardened nginx/systemd, recoverable legacy quarantine, rollback verification | `server.js`; `tests/unit/article-import.test.js`; `deploy/`; `verify:deployment` |
| Product site | Pico journey and overlap treatment | First-viewport demo/import CTAs, returning continue card, guided reader demo, explicit WPM/rewind, truthful surface copy, EN/RU metadata, FAQ/support/SEO and responsive visual gates | `index.html`; `app.js`; `style.css`; `tests/visual/`; Lighthouse gate |

All rows now carry implementation or test evidence. No wholesale `ours`/`theirs`
resolution was used.
