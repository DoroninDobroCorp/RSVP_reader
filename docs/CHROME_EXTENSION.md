# PaceFlow Quick Send — Chrome extension

Status: Manifest V3 implementation ready for unpacked installation and Chrome Web Store packaging.

## User flows

1. Select text and choose **Read selection in PaceFlow**.
2. Right-click a page or link and choose the PaceFlow article action.
3. Use the toolbar popup to send selected text, the current article, clipboard text, or manually pasted text.
4. Press `Alt+Shift+R` to send the current selection, falling back to the current article URL.

Text handoffs are saved to the local PaceFlow library with `sourceType: extension` and open directly in focus mode. Article handoffs contain only the public URL; the existing SSRF-guarded server importer extracts the readable page, stores it locally, and starts focus mode.

## Handoff architecture

```text
explicit Chrome action
        │
        ▼
Manifest V3 service worker
  normalize + size limits
  random 128-bit nonce
        │
        ▼
chrome.storage.session
  in memory, 10-minute alarm
        │
        ▼
PaceFlow tab ?paceflow-extension-import=<nonce>
        │
        ▼
restricted content script ──postMessage──> PaceFlow page bridge
        │                                      │
        │                                      ├─ text: local library
        │                                      └─ URL: guarded /api/article
        │
        ◀──────── acknowledgement ─────────────┘
        │
delete payload + expiration alarm + query token
```

The payload is never placed in the URL. A page message is accepted only when the page was opened with the matching 32-character nonce. Repeated bridge delivery is idempotent. Successful, cancelled, failed, and expired handoffs are removed.

## Permissions

| Permission | Reason |
| --- | --- |
| `activeTab` | Temporary access after a toolbar click or shortcut |
| `scripting` | Read the current selection after that user action |
| `clipboardRead` | Read text only when **Read copied text** is pressed |
| `contextMenus` | Add selection, page, and link actions |
| `storage` | Session-only payload and local development endpoint override |
| `alarms` | Delete undelivered session payload after ten minutes |

Host access is restricted to the production PaceFlow path. The real-Chrome test injects localhost access only into its disposable test copy; that access is absent from the published ZIP. The extension does not request `tabs`, `history`, `<all_urls>`, analytics, advertising, cookies, webRequest, or remote-code access.

## Build and install

```bash
npm run build
```

The website package is created at `dist/downloads/paceflow-quick-send.zip`. Extract it, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the extracted folder. The tracked `chrome-extension/` source folder can also be loaded directly.

Chrome Web Store publication is an external release step: it requires the owner's developer account, listing copy, screenshots, privacy disclosure, and review. The produced ZIP is the submission artifact; no code change is required for unpacked use.

## Verification

- `npm run test:unit` checks payload validation, nonce construction, Manifest V3 shape, host scope, locales, and permissions.
- The main Playwright matrix covers nonce mismatch rejection, text saving/opening, and guarded article handoff in Chromium, WebKit, and Mobile Safari.
- `npm run test:extension` launches a real Chrome extension service worker and verifies session storage → content script → website → local library/focus mode, including cleanup.
- `npm run verify:extension` compares source files with the web and iOS ZIP artifacts and rejects broad permissions or dynamic code execution.
- `npm run test:prod` downloads the live ZIP, parses its manifest, and verifies the deployed web UI.
