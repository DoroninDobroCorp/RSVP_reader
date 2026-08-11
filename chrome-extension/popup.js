'use strict';

const Core = globalThis.PaceFlowExtensionCore;
const statusElement = document.getElementById('status');
const textInput = document.getElementById('textInput');
const actionButtons = Array.from(document.querySelectorAll('button'));

function message(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

function localize() {
  document.documentElement.lang = chrome.i18n.getUILanguage().toLowerCase().startsWith('ru') ? 'ru' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = message(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = message(element.dataset.i18nPlaceholder);
  });
}

function setBusy(isBusy) {
  actionButtons.forEach((button) => { button.disabled = isBusy; });
}

function showStatus(text, type = '') {
  statusElement.textContent = text;
  statusElement.className = `status ${type}`.trim();
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) throw new Error(message('normalPageRequired'));
  return tab;
}

async function selectedText(tab) {
  const [{ result = '' } = {}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => String(window.getSelection?.() || '').trim()
  });
  return result;
}

async function send(payload) {
  setBusy(true);
  showStatus(message('openingStatus'));
  try {
    const response = await chrome.runtime.sendMessage({ type: 'paceflow:send-payload', payload });
    if (!response?.ok) throw new Error(response?.error || message('sendFailed'));
    showStatus(message('sentStatus'), 'success');
    setTimeout(() => window.close(), 650);
  } catch (error) {
    showStatus(error.message || message('sendFailed'), 'error');
    setBusy(false);
  }
}

document.getElementById('selectionBtn').addEventListener('click', async () => {
  try {
    const tab = await getActiveTab();
    const text = await selectedText(tab);
    if (!text) throw new Error(message('noSelection'));
    await send({ type: 'text', text, title: tab.title, sourceUrl: tab.url });
  } catch (error) {
    showStatus(error.message || message('sendFailed'), 'error');
  }
});

document.getElementById('articleBtn').addEventListener('click', async () => {
  try {
    const tab = await getActiveTab();
    await send({ type: 'url', url: tab.url, title: tab.title });
  } catch (error) {
    showStatus(error.message || message('sendFailed'), 'error');
  }
});

document.getElementById('clipboardBtn').addEventListener('click', async () => {
  try {
    const text = String(await navigator.clipboard.readText()).trim();
    if (!text) throw new Error(message('clipboardEmpty'));
    textInput.value = text;
    const tab = await getActiveTab().catch(() => null);
    await send({ type: 'text', text, title: tab?.title || message('copiedTextTitle'), sourceUrl: tab?.url });
  } catch (error) {
    showStatus(error.message || message('clipboardFailed'), 'error');
  }
});

document.getElementById('sendTextBtn').addEventListener('click', async () => {
  try {
    const tab = await getActiveTab().catch(() => null);
    await send({
      type: 'text',
      text: textInput.value,
      title: tab?.title || message('copiedTextTitle'),
      sourceUrl: tab?.url
    });
  } catch (error) {
    showStatus(error.message || message('sendFailed'), 'error');
  }
});

localize();
