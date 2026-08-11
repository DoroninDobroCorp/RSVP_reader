'use strict';

const Core = globalThis.HummingReadExtensionCore;
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

async function request(type, payload = {}) {
  setBusy(true);
  showStatus(message('preparingStatus'));
  try {
    const response = await chrome.runtime.sendMessage({ type, ...payload });
    if (!response?.ok) throw new Error(response?.error || message('readFailed'));
    showStatus(message('openedStatus'), 'success');
    setTimeout(() => window.close(), 350);
  } catch (error) {
    showStatus(error.message || message('readFailed'), 'error');
    setBusy(false);
  }
}

document.getElementById('selectionBtn').addEventListener('click', () => {
  request('hummingread:read-selection');
});

document.getElementById('pageBtn').addEventListener('click', () => {
  request('hummingread:extract-page');
});

document.getElementById('readTextBtn').addEventListener('click', () => {
  let payload;
  try {
    payload = Core.normalizePayload({
      type: 'text',
      text: textInput.value,
      title: message('pastedTextTitle')
    });
  } catch (error) {
    showStatus(error.message || message('readFailed'), 'error');
    return;
  }
  request('hummingread:open-local', { payload });
});

document.getElementById('quickSendBtn').addEventListener('click', () => {
  let payload;
  try {
    payload = Core.normalizePayload({
      type: 'text',
      text: textInput.value,
      title: message('pastedTextTitle')
    });
  } catch (error) {
    showStatus(message('quickSendNeedsText'), 'error');
    return;
  }
  request('hummingread:quick-send', { payload });
});

textInput.addEventListener('paste', () => {
  showStatus(message('pasteDetectedStatus'));
});

localize();
