'use strict';

importScripts('core.js');

const Core = self.HummingReadExtensionCore;
const MENU_SELECTION = 'hummingread-read-selection';
const MENU_PAGE = 'hummingread-read-page';
const EXPIRATION_ALARM_PREFIX = 'hummingread-expire:';

let activeCatalog = {};
let installedMenus = [];
let installPromise = null;

function getMessage(key, fallback = '') {
  if (activeCatalog && activeCatalog[key]) return activeCatalog[key];
  return Core?.getMessage?.(key, fallback) || (typeof chrome !== 'undefined' && chrome?.i18n?.getMessage?.(key)) || fallback;
}

function expirationAlarm(scope, nonce) {
  return `${EXPIRATION_ALARM_PREFIX}${scope}:${nonce}`;
}

async function installContextMenus() {
  installPromise = (async () => {
    await chrome.contextMenus.removeAll();
    installedMenus = [];
    const locale = await Core.getActiveLocale();
    activeCatalog = await Core.loadLocaleCatalog(locale);

    const selTitle = getMessage('contextSelection', 'Read selection locally with HummingRead');
    const pageTitle = getMessage('contextPage', 'Extract and read this page locally');

    chrome.contextMenus.create({
      id: MENU_SELECTION,
      title: selTitle,
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: MENU_PAGE,
      title: pageTitle,
      contexts: ['page']
    });
    installedMenus = [
      { id: MENU_SELECTION, title: selTitle },
      { id: MENU_PAGE, title: pageTitle }
    ];
  })();
  return installPromise;
}

self.installContextMenus = installContextMenus;

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.hummingreadProfileLocale || changes.hummingreadLocale)) {
    installContextMenus().catch(console.error);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  installContextMenus().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  installContextMenus().catch(console.error);
});

function setTransientBadge(text, color) {
  chrome.action.setBadgeBackgroundColor({ color }).catch(() => undefined);
  chrome.action.setBadgeText({ text }).catch(() => undefined);
  setTimeout(() => chrome.action.setBadgeText({ text: '' }).catch(() => undefined), 1800);
}

async function resolvePreviewUrl() {
  const configured = await chrome.storage.local.get('hummingreadPreviewUrl');
  const defaultUrl = Core.configuredPreviewUrl();
  const candidate = Core.configuredPreviewUrl(configured.hummingreadPreviewUrl || defaultUrl);
  if (!candidate) throw new Error(getMessage('quickSendUnavailable', 'Quick Send is unavailable because this tester build has no configured web preview.'));
  const parsed = new URL(candidate);
  const configuredDefault = defaultUrl ? new URL(defaultUrl) : null;
  const isConfiguredPreview = configuredDefault
    && parsed.origin === configuredDefault.origin
    && parsed.pathname.startsWith(configuredDefault.pathname);
  const isLocalTest = ['localhost', '127.0.0.1'].includes(parsed.hostname)
    && parsed.protocol === 'http:';
  if (!isConfiguredPreview && !isLocalTest) {
    throw new Error(getMessage('quickSendUntrusted', 'Quick Send rejected an untrusted preview address.'));
  }
  return parsed.href;
}

async function isHummingReadSender(sender) {
  try {
    const senderUrl = new URL(sender?.url || sender?.tab?.url || '');
    const previewUrl = new URL(await resolvePreviewUrl());
    return senderUrl.origin === previewUrl.origin
      && senderUrl.pathname.startsWith(previewUrl.pathname);
  } catch (error) {
    return false;
  }
}

async function openQuickSendHandoff(nonce) {
  const baseUrl = await resolvePreviewUrl();
  const url = Core.buildHandoffUrl(nonce, baseUrl);
  const base = new URL(baseUrl);
  const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
  const matchingTabs = await chrome.tabs.query({ url: [`${base.origin}${basePath}*`] });
  const existing = matchingTabs.find((tab) => tab.active) || matchingTabs[0];
  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true, url });
    if (existing.windowId) await chrome.windows.update(existing.windowId, { focused: true });
    return existing.id;
  }
  const created = await chrome.tabs.create({ active: true, url });
  return created.id;
}

async function queueQuickSend(rawPayload) {
  const payload = Core.normalizePayload(rawPayload);
  const nonce = Core.createNonce();
  const now = Date.now();
  const key = Core.handoffStorageKey(nonce);
  await chrome.storage.session.set({
    [key]: { payload, createdAt: now, expiresAt: now + Core.PENDING_TTL_MS }
  });
  await chrome.alarms.create(expirationAlarm('handoff', nonce), { when: now + Core.PENDING_TTL_MS });
  try {
    const tabId = await openQuickSendHandoff(nonce);
    setTransientBadge('↗', '#3156d8');
    return { ok: true, nonce, tabId };
  } catch (error) {
    await chrome.storage.session.remove(key);
    await chrome.alarms.clear(expirationAlarm('handoff', nonce));
    throw error;
  }
}

async function openLocalReader(rawPayload) {
  const payload = Core.normalizePayload(rawPayload);
  if (payload.type !== 'text') throw new Error(getMessage('standaloneTextRequired', 'Standalone reading requires locally extracted or pasted text.'));
  const nonce = Core.createNonce();
  const now = Date.now();
  const key = Core.readerStorageKey(nonce);
  await chrome.storage.session.set({
    [key]: { payload, createdAt: now, expiresAt: now + Core.PENDING_TTL_MS }
  });
  await chrome.alarms.create(expirationAlarm('reader', nonce), { when: now + Core.PENDING_TTL_MS });
  const url = new URL(chrome.runtime.getURL('reader.html'));
  url.searchParams.set('draft', nonce);
  try {
    const tab = await chrome.tabs.create({ active: true, url: url.href });
    setTransientBadge('✓', '#1f9d72');
    return { ok: true, nonce, tabId: tab.id };
  } catch (error) {
    await chrome.storage.session.remove(key);
    await chrome.alarms.clear(expirationAlarm('reader', nonce));
    throw error;
  }
}

async function openReaderError(message) {
  const url = new URL(chrome.runtime.getURL('reader.html'));
  const defaultError = getMessage('couldNotRead', 'This page could not be read locally.');
  url.searchParams.set('error', String(message || defaultError).slice(0, 500));
  await chrome.tabs.create({ active: true, url: url.href });
}

async function readSelectionFromTab(tab) {
  if (!tab?.id) throw new Error(getMessage('openNormalWebPageFirst', 'Open a normal web page first.'));
  const status = Core.isExtractablePageUrl(tab.url);
  if (!status.ok) throw new Error(status.reason);
  const [{ result = '' } = {}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => String(window.getSelection?.() || '').trim()
  });
  return result;
}

async function extractPageFromTab(tab) {
  if (!tab?.id) throw new Error(getMessage('openNormalWebPageFirst', 'Open a normal web page first.'));
  const status = Core.isExtractablePageUrl(tab.url);
  if (!status.ok) throw new Error(status.reason);
  let result;
  try {
    [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: Core.extractReadablePageFromDocument
    });
  } catch (error) {
    throw new Error(getMessage('chromeBlockedPageAccess', 'Chrome blocked access to this page. Select text manually or paste it into HummingRead.'));
  }
  if (!result?.ok) throw new Error(result?.error || getMessage('pageNoReadableText', 'This page does not expose readable text.'));
  return Core.normalizePayload({ type: 'text', ...result });
}

async function readSelectionOrPageLocally(tab) {
  const selection = await readSelectionFromTab(tab).catch(() => '');
  if (selection) {
    return openLocalReader({ type: 'text', text: selection, title: tab.title, sourceUrl: tab.url });
  }
  return openLocalReader(await extractPageFromTab(tab));
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let task;
  if (info.menuItemId === MENU_SELECTION) {
    task = openLocalReader({
      type: 'text',
      text: info.selectionText,
      title: tab?.title,
      sourceUrl: info.pageUrl || tab?.url
    });
  } else if (info.menuItemId === MENU_PAGE) {
    task = extractPageFromTab(tab).then(openLocalReader);
  }
  task?.catch((error) => {
    console.error(error);
    setTransientBadge('!', '#d94c4c');
    openReaderError(error.message).catch(console.error);
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'read-selection') return;
  chrome.tabs.query({ active: true, lastFocusedWindow: true })
    .then(([tab]) => readSelectionOrPageLocally(tab))
    .catch((error) => {
      console.error(error);
      setTransientBadge('!', '#d94c4c');
      openReaderError(error.message).catch(console.error);
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith(EXPIRATION_ALARM_PREFIX)) return;
  const match = alarm.name.match(/^hummingread-expire:(handoff|reader):([a-f0-9]{32})$/u);
  if (!match) return;
  const [, scope, nonce] = match;
  const key = scope === 'handoff' ? Core.handoffStorageKey(nonce) : Core.readerStorageKey(nonce);
  chrome.storage.session.remove(key).catch(console.error);
});

async function handleMessage(message, sender) {
  if (message?.type === 'hummingread:get-context-menus') {
    return { ok: true, menus: installedMenus, locale: await Core.getActiveLocale() };
  }

  if (message?.type === 'hummingread:open-local') {
    return openLocalReader(message.payload);
  }

  if (message?.type === 'hummingread:extract-page') {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const payload = await extractPageFromTab(tab);
    return message.open === false ? { ok: true, payload } : openLocalReader(payload);
  }

  if (message?.type === 'hummingread:read-selection') {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const text = await readSelectionFromTab(tab);
    if (!text) return { ok: false, error: getMessage('selectTextFirst', 'Select some text on the page first.') };
    return openLocalReader({ type: 'text', text, title: tab.title, sourceUrl: tab.url });
  }

  if (message?.type === 'hummingread:quick-send') {
    return queueQuickSend(message.payload);
  }

  if (message?.type === 'hummingread:get-pending') {
    if (!await isHummingReadSender(sender) || !Core.isValidNonce(message.nonce)) {
      return { ok: false, error: getMessage('invalidHandoff', 'Invalid HummingRead handoff.') };
    }
    const key = Core.handoffStorageKey(message.nonce);
    const result = await chrome.storage.session.get(key);
    const pending = result[key];
    if (!pending || Number(pending.expiresAt) <= Date.now()) {
      await chrome.storage.session.remove(key);
      await chrome.alarms.clear(expirationAlarm('handoff', message.nonce));
      return { ok: false, error: getMessage('handoffExpired', 'The handoff expired.') };
    }
    return { ok: true, payload: pending.payload };
  }

  if (message?.type === 'hummingread:clear-pending') {
    if (!await isHummingReadSender(sender) || !Core.isValidNonce(message.nonce)) {
      return { ok: false, error: getMessage('invalidHandoff', 'Invalid HummingRead handoff.') };
    }
    await chrome.storage.session.remove(Core.handoffStorageKey(message.nonce));
    await chrome.alarms.clear(expirationAlarm('handoff', message.nonce));
    return { ok: true };
  }

  return { ok: false, error: getMessage('unknownRequest', 'Unknown request.') };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message || getMessage('readFailed', 'HummingRead could not complete this action.') }));
  return true;
});
