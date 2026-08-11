# HummingRead local speed reader for Chrome

Manifest V3 extension for reading selected, locally extracted, or explicitly
pasted text in a standalone RSVP reader. It works without the website or an
account and persists its reader settings and position in extension-local
storage.

The tracked manifest has no host permission. The deterministic tester build
injects the one preview origin from `product.config.json` so the separate
**Quick Send to web preview** action can complete an explicit handoff. A
production package cannot be built until the final domain and store URLs are
owner-approved.

Permissions:

- `activeTab` and `scripting` read the selected/current page only after a user
  action;
- `contextMenus` exposes the two local reading commands;
- `storage` persists local text, progress, settings, and short-lived handoffs;
- `alarms` expires pending Quick Send and reader handoff records after ten
  minutes.

There is no clipboard, history, tabs, all-sites, analytics, advertising, or
remote-code permission. Paste is handled by the ordinary explicit paste event.
