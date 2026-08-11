# PaceFlow Quick Send for Chrome

Manifest V3 extension for sending a selection, copied text, a link, or the current article to PaceFlow Reader.

## Install from the website package

1. Download `paceflow-quick-send.zip` from the PaceFlow website and extract it.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the extracted folder.
5. Pin PaceFlow Quick Send to the toolbar.

## Use

- Select text and choose **Read selection in PaceFlow** from the context menu.
- Right-click a page or link and send the article.
- Open the toolbar popup to send the current selection, clipboard text, pasted text, or the current page.
- Press `Alt+Shift+R` to send the selection; when no text is selected, the current page is sent as an article URL.

## Privacy and permissions

- `activeTab` and `scripting` are used only after a click or shortcut to read the current selection.
- `clipboardRead` is used only when **Read copied text** is pressed.
- `contextMenus` adds the three explicit PaceFlow actions.
- `alarms` removes an undelivered in-memory handoff when its ten-minute lifetime ends.
- `storage.session` holds one-time handoffs in memory for at most ten minutes; successful and expired handoffs are deleted.
- Host access is limited to the production PaceFlow website path.
- The extension contains no analytics, remote code, account, or browsing-history permission.
