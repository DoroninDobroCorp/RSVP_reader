# HummingRead local RSVP reader for Chrome

Version `1.1.0` is a Manifest V3 standalone reader. Quick Send is an optional secondary preview action; the extension does not depend on the website for normal reading.

## Local workflows

- **Read selected text**: the active-tab selection is tokenized and opened locally.
- **Extract this page**: a narrowly invoked content script removes navigation/script noise and returns readable visible text locally where Chrome permits scripting.
- **Paste text**: the reader accepts an explicit paste event; there is no `clipboardRead` permission.
- Context menu and keyboard command open the same local reader.
- The reader provides play/pause, 100–1000 WPM with an explicit label, rewind 10 words, exact scrubber, anchored pause context, light/dark/system theme, keyboard/focus support, and local settings/progress persistence.
- Protected Chrome pages, extension pages, store pages, and unsupported documents return an accurate local error.

Large input tokenization yields to the event loop and can be cancelled. No selection/page/pasted-text workflow calls the article server or another network endpoint. The real unpacked-extension test intercepts traffic and uses sentinel content to prove zero automatic transmission.

## Permissions

The source manifest requests exactly:

- `activeTab`: inspect only the tab on which the user explicitly invokes selection/page reading.
- `scripting`: run the local extraction function after that explicit action.
- `storage`: keep local text, settings, progress, and short-lived handoff records.
- `contextMenus`: expose the explicit selection/page actions.
- `alarms`: delete pending Quick Send/session handoffs at the ten-minute hard expiry.

There is no `clipboardRead`, `tabs`, `history`, `<all_urls>`, cookies, webRequest, analytics, advertising, or remote-code permission. The tracked manifest has no host permission. The tester build injects exactly the centrally configured preview path for the optional web bridge.

## Build and deterministic package

```sh
npm run build:extension
npm run verify:extension
shasum -a 256 dist/downloads/hummingread-tester.zip
```

The archive contains exactly 17 allowlisted public files, fixed timestamps, bundled scripts/assets/locales, self-only CSP, and no README, source map, secret, or private data. The website labels it **Tester build / Install unpacked for testing**; the Chrome Web Store state remains **coming after review**.

## Chrome Web Store listing draft

- Title: `HummingRead: Local RSVP Reader`
- Short description: `Read selections, pages, or pasted text one word at a time—locally in Chrome.`

Full description:

> Keep your gaze steady while HummingRead moves a selection, readable page, or pasted passage through a calm RSVP rhythm. Adjust WPM, pause for surrounding context, rewind ten words, scrub to an exact position, and return to locally saved progress. No account is required. Standalone reading stays in extension storage and is never sent automatically. Optional Quick Send opens the configured HummingRead web preview only after you choose that separate action.

Privacy disclosure: standalone text/settings/progress remain local; no sale, advertising, profiling, analytics, or automatic content transfer. Quick Send retains the chosen payload in `chrome.storage.session` for at most ten minutes and removes it after delivery or expiry. The final support/privacy URLs remain owner inputs and production verification must fail until approved.

## Store media plan

1. 1280×800 selection-to-reader workflow on a light page.
2. Local extracted-page workflow on a dark page.
3. Reader playing with visible WPM/ORP.
4. Paused context, rewind, and scrubber.
5. Protected-page error.
6. Theme/settings and explicit Quick Send secondary state.
7. The ready 440×280 small promo tile and 1400×560 marquee in `assets/brand/`, derived from editable SVG masters without preview domains or store-availability claims.

## Reviewer notes

Load the ZIP unpacked, select text on an ordinary HTTPS page, open the popup, and choose **Read selected text**. Test Page, Paste, Space to pause/play, ArrowLeft rewind, WPM, scrubber, reload persistence, system theme, and a `chrome://` protected-page error. Network inspection should show no sentinel content. Quick Send is tested separately and is the only path that may transfer the chosen payload to the configured preview after an explicit click.

Publication remains an owner-only gate: legal name approval, final domain/support/privacy URLs, Chrome developer account/fee, store metadata, final screenshots/promos, package checksum, submission, and review approval.
