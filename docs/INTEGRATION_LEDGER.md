# Integration ledger

This ledger records how the two mission-described lines are preserved or
reconstructed on `integration/pico-release-safety-20260811`.

| Area | Pico/remote line retained | Safety/release line integrated | Evidence |
| --- | --- | --- | --- |
| Source control | Full `29b65d7` production tree; local checkpoint branch | Missing original worktree recorded without inventing provenance; named safety requirements will be reconstructed | `docs/MISSION_BASELINE.md` |
| Brand and art | Pico character, coral/teal language, icons, splash, hero and layered overlaps | Editable/vector-first sources, provenance, export and small-size checks still required | pending |
| Chrome | Secure nonce/session Quick Send, deterministic package and real Chrome handoff | Standalone local reader, minimal permissions, protected-page/error and zero-transmission coverage still required | pending |
| Reader/storage | Mature storage/parser/reader implementation and existing regressions | Native-local-only, legacy-sync upgrade shutdown, wake-lock races, migration and large-book gates still require audit/integration | pending |
| Server/deploy | Current article extractor and public `dist` deployment behavior | Global-unicast SSRF classification, dedicated user, loopback bind, hardened nginx/systemd and rollback verification still required | pending |
| Product site | Pico journey and overlap treatment | First-viewport CTAs, returning continue card, guided demo, truthful surface copy, SEO/support and Lighthouse gates still required | pending |

Every row will be replaced with final file/test/commit evidence as its semantic
integration is completed. Wholesale `ours`/`theirs` resolution is prohibited.
