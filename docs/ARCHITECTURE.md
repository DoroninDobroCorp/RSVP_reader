# HummingRead architecture

## Surfaces and trust boundaries

- `index.html`, `app.js`, `i18n.js`, `style.css`, parsers, and `service-worker.js` form the web/PWA reader. Books, pasted text, progress, bookmarks, and settings are local.
- Capacitor copies the deterministic web build into `ios/App/App/public/`. Native iOS removes web article import and cloud sync, mirrors durable books to native app storage, and uses pinned Keep Awake APIs.
- `server.js` exposes only health/static development behavior and guarded `/api/article`; `/api/sync` is permanently 404. Production binds loopback behind the prepared nginx policy.
- `chrome-extension/` is a Manifest V3 standalone reader. Selection/page/paste input is processed locally. Quick Send is a secondary nonce-scoped handoff to one configured preview origin.
- `scripts/build-web.mjs` creates only public `dist/` assets plus `dist/downloads/hummingread-tester.zip`. Native and nginx publish/copy this public tree, never the repository root.

## Persistence

The web app uses IndexedDB as primary storage with compatibility mirrors for older installations. Native storage uses generation/version markers, atomic draft/index writes, content signatures, tombstones, and serialized per-book mutations. Existing `paceflow_*` storage keys and the current iOS bundle identifier remain internal compatibility identifiers; they are not customer-facing brand claims and must not be renamed without a tested migration and owner bundle approval.

Legacy unauthenticated cloud sync is inert at the client and server layers. Old local books are preserved. Any ignored historical sync store is backed up, checksum-verified, and moved—not deleted—to root-owned quarantine only during an authorized deployment.

## Article import

Web/PWA sends only an explicit user-entered credential-free HTTP(S) URL. The server rejects nonstandard ports/protocols/credentials, validates every DNS answer with pinned `ipaddr.js`, allows only public global-unicast destinations, connects to the validated snapshot, revalidates redirects, and enforces type/size/timeout/redirect limits. It stores no article/library record. Production nginx disables article access logging; the bounded raw-IP rate bucket expires after a hard maximum of ten minutes.

## Builds and upgrade safety

`product.config.json` is the name/version/URL source of truth. Preview artifacts allow the documented temporary origin; production-mode verification fails until owner-approved final URLs exist. Cache generation `v50` precaches the app shell, acknowledgements, and required artwork while removing old/current branded cache prefixes. The separately downloadable tester ZIP and article/sync API responses are never cached.

Web and extension builds are deterministic. Package, brand, notices, service-worker, extension, deployment, and determinism verifiers enforce allowlists, transforms, permissions, placeholders, licenses, native bundle gates, private-root isolation, and byte-stable release outputs.
