'use strict';

importScripts('core.js');

const Core = self.PaceFlowExtensionCore;
const MENU_SELECTION = 'paceflow-read-selection';
const MENU_PAGE = 'paceflow-read-page';
const MENU_LINK = 'paceflow-read-link';
const EXPIRATION_ALARM_PREFIX = 'paceflow-expire:';

function expirationAlarm(nonce) {
  return `${EXPIRATION_ALARM_PREFIX}${nonce}`;
}

async function installContextMenus() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_SELECTION,
    title: chrome.i18n.getMessage('contextSelection'),
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: MENU_PAGE,
    title: chrome.i18n.getMessage('contextPage'),
    contexts: ['page']
  });
  chrome.contextMenus.create({
    id: MENU_LINK,
    title: chrome.i18n.getMessage('contextLink'),
    contexts: ['link']
  });
}

chrome.runtime.onInstalled.addListener(() => {
  installContextMenus().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  installContextMenus().catch(console.error);
});

function isPaceFlowSender(sender) {
  try {
    const url = new URL(sender?.url || sender?.tab?.url || '');
    return (url.origin === 'https://145.239.82.124.sslip.io' && url.pathname.startsWith('/rsvp/'))
      || ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.port === '8081');
  } catch (error) {
    return false;
  }
}

async function openPaceFlowHandoff(nonce) {
  const configured = await chrome.storage.local.get('paceflowBaseUrl');
  let baseUrl = Core.PACEFLOW_URL;
  try {
    const candidate = new URL(configured.paceflowBaseUrl || Core.PACEFLOW_URL);
    const isProduction = candidate.origin === 'https://145.239.82.124.sslip.io'
      && candidate.pathname.startsWith('/rsvp/');
    const isLocal = ['localhost', '127.0.0.1'].includes(candidate.hostname)
      && candidate.protocol === 'http:'
      && candidate.port === '8081';
    if (isProduction || isLocal) baseUrl = candidate.href;
  } catch (error) {
    baseUrl = Core.PACEFLOW_URL;
  }
  const url = Core.buildHandoffUrl(nonce, baseUrl);
  const base = new URL(baseUrl);
  const tabPattern = `${base.origin}${base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`}*`;
  const matchingTabs = await chrome.tabs.query({
    url: [tabPattern]
  });
  const existing = matchingTabs.find((tab) => tab.active) || matchingTabs[0];
  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true, url });
    if (existing.windowId) await chrome.windows.update(existing.windowId, { focused: true });
    return existing.id;
  }
  const created = await chrome.tabs.create({ active: true, url });
  return created.id;
}

async function queuePayload(rawPayload) {
  const payload = Core.normalizePayload(rawPayload);
  const nonce = Core.createNonce();
  const now = Date.now();
  await chrome.storage.session.set({
    [Core.storageKey(nonce)]: {
      payload,
      createdAt: now,
      expiresAt: now + Core.PENDING_TTL_MS
    }
  });
  await chrome.alarms.create(expirationAlarm(nonce), { when: now + Core.PENDING_TTL_MS });
  try {
    const tabId = await openPaceFlowHandoff(nonce);
    setTransientBadge('✓', '#1f9d72');
    return { ok: true, nonce, tabId };
  } catch (error) {
    await chrome.storage.session.remove(Core.storageKey(nonce));
    await chrome.alarms.clear(expirationAlarm(nonce));
    throw error;
  }
}

async function readSelectionFromTab(tab) {
  if (!tab?.id) throw new Error('Open a normal web page first.');
  const [{ result = '' } = {}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => String(window.getSelection?.() || '').trim()
  });
  return result;
}

async function sendSelectionOrPage(tab) {
  const selection = await readSelectionFromTab(tab).catch(() => '');
  if (selection) {
    return queuePayload({ type: 'text', text: selection, title: tab.title, sourceUrl: tab.url });
  }
  return queuePayload({ type: 'url', url: tab.url, title: tab.title });
}

function setTransientBadge(text, color) {
  chrome.action.setBadgeBackgroundColor({ color }).catch(() => undefined);
  chrome.action.setBadgeText({ text }).catch(() => undefined);
  setTimeout(() => chrome.action.setBadgeText({ text: '' }).catch(() => undefined), 1800);
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let task;
  if (info.menuItemId === MENU_SELECTION) {
    task = queuePayload({
      type: 'text',
      text: info.selectionText,
      title: tab?.title,
      sourceUrl: info.pageUrl || tab?.url
    });
  } else if (info.menuItemId === MENU_LINK) {
    task = queuePayload({ type: 'url', url: info.linkUrl, title: tab?.title });
  } else if (info.menuItemId === MENU_PAGE) {
    task = queuePayload({ type: 'url', url: info.pageUrl || tab?.url, title: tab?.title });
  }
  task?.catch((error) => {
    console.error(error);
    setTransientBadge('!', '#d94c4c');
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'send-selection') return;
  chrome.tabs.query({ active: true, lastFocusedWindow: true })
    .then(([tab]) => sendSelectionOrPage(tab))
    .catch((error) => {
      console.error(error);
      setTransientBadge('!', '#d94c4c');
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith(EXPIRATION_ALARM_PREFIX)) return;
  const nonce = alarm.name.slice(EXPIRATION_ALARM_PREFIX.length);
  if (!Core.isValidNonce(nonce)) return;
  chrome.storage.session.remove(Core.storageKey(nonce)).catch(console.error);
});

async function handleMessage(message, sender) {
  if (message?.type === 'paceflow:send-payload') {
    return queuePayload(message.payload);
  }

  if (message?.type === 'paceflow:get-pending') {
    if (!isPaceFlowSender(sender) || !Core.isValidNonce(message.nonce)) {
      return { ok: false, error: 'Invalid PaceFlow handoff.' };
    }
    const key = Core.storageKey(message.nonce);
    const result = await chrome.storage.session.get(key);
    const pending = result[key];
    if (!pending || Number(pending.expiresAt) <= Date.now()) {
      await chrome.storage.session.remove(key);
      await chrome.alarms.clear(expirationAlarm(message.nonce));
      return { ok: false, error: 'The handoff expired.' };
    }
    return { ok: true, payload: pending.payload };
  }

  if (message?.type === 'paceflow:clear-pending') {
    if (!isPaceFlowSender(sender) || !Core.isValidNonce(message.nonce)) {
      return { ok: false, error: 'Invalid PaceFlow handoff.' };
    }
    await chrome.storage.session.remove(Core.storageKey(message.nonce));
    await chrome.alarms.clear(expirationAlarm(message.nonce));
    return { ok: true };
  }

  return { ok: false, error: 'Unknown request.' };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message || 'PaceFlow could not open.' }));
  return true;
});
