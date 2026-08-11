'use strict';

(function deliverPendingImport() {
  const Core = globalThis.PaceFlowExtensionCore;
  const pageUrl = new URL(window.location.href);
  const nonce = pageUrl.searchParams.get(Core.HANDOFF_PARAM);
  if (!Core.isValidNonce(nonce)) return;

  let finished = false;
  let attempt = 0;
  let payload = null;
  let retryTimer = null;

  function cleanHandoffUrl() {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete(Core.HANDOFF_PARAM);
    window.history.replaceState(window.history.state, '', cleanUrl.href);
  }

  async function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(retryTimer);
    window.removeEventListener('message', handleResult);
    await chrome.runtime.sendMessage({ type: 'paceflow:clear-pending', nonce }).catch(() => undefined);
    cleanHandoffUrl();
  }

  function handleResult(event) {
    const message = event.data;
    if (event.source !== window || event.origin !== window.location.origin) return;
    if (message?.channel !== 'paceflow-extension' || message?.type !== 'paceflow-import-result') return;
    if (message.nonce !== nonce) return;
    finish();
  }

  async function deliver() {
    if (finished) return;
    attempt += 1;
    if (!payload) {
      const response = await chrome.runtime.sendMessage({ type: 'paceflow:get-pending', nonce }).catch(() => null);
      if (!response?.ok) {
        if (attempt >= 40) await finish();
        else retryTimer = setTimeout(deliver, 350);
        return;
      }
      payload = response.payload;
    }

    window.postMessage({
      channel: 'paceflow-extension',
      type: 'paceflow-extension-import',
      version: 1,
      nonce,
      payload
    }, window.location.origin);

    if (attempt >= 80) await finish();
    else retryTimer = setTimeout(deliver, 350);
  }

  window.addEventListener('message', handleResult);
  deliver();
})();
