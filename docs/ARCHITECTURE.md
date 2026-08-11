# Architecture

## Reader engine

- Framework-free reader in `app.js`: token safety, word chunking, punctuation timing, ORP focus, WPM, progress, search, TOC, bookmarks, and accessible controls.
- Format parsing in `epub-parser.js` and the import helpers in `app.js`.
- Local-first IndexedDB/localStorage persistence with a Capacitor Filesystem/Preferences mirror for iOS.

## Delivery surfaces

- Web/PWA source is built reproducibly into `dist/` and served under `/rsvp/`.
- Capacitor copies the same built assets into `ios/App/App/public`.
- The optional Manifest V3 Chrome extension is sourced from `chrome-extension/` and packaged into `dist/downloads/paceflow-quick-send.zip`.

## Article import

The web/PWA-only `server.js` endpoint accepts a public HTTP(S) URL, validates
every DNS result and redirect, blocks private/reserved addresses and non-standard
ports, limits time and size, and extracts readable content in memory. Books
remain in the browser's local library. The native iOS surface hides the article
control, resolves no endpoint, and rejects direct programmatic import calls.

## Chrome handoff

The extension stores a normalized payload behind a random 128-bit nonce in `chrome.storage.session`, opens the PaceFlow site with only that nonce, and uses a host-restricted content script to bridge the payload to the page. The page requires the matching nonce, saves text locally or invokes the guarded article importer, starts focus mode, acknowledges delivery, and causes the extension to remove the payload. See `docs/CHROME_EXTENSION.md`.

## UI layer

- Pico is the product character: an indigo hummingbird with a mint rhythm trail, amber focus point, and bookmark-shaped tail. The canonical rules and source assets are documented in `docs/BRAND_SYSTEM.md`.
- Responsive EN/RU interface with day/night themes, an editorial cream/navy/cobalt/mint system, and accessible dialogs.
- Keyboard, touch, Media Session, focus scrubber, and compact mobile layouts.
- Built-in demo, manual URL import, file import, and the Chrome Quick Send installation card.
