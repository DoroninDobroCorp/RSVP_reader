(function exposePaceFlowExtensionCore(global) {
  'use strict';

  const PACEFLOW_URL = 'https://145.239.82.124.sslip.io/rsvp/';
  const HANDOFF_PARAM = 'paceflow-extension-import';
  const STORAGE_PREFIX = 'paceflow-pending:';
  const MAX_TEXT_CHARACTERS = 1_500_000;
  const MAX_TITLE_CHARACTERS = 300;
  const PENDING_TTL_MS = 10 * 60 * 1000;

  function normalizeTitle(value, fallback = 'Copied text') {
    const title = String(value || '')
      .replace(/[\u0000-\u001f\u007f]+/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, MAX_TITLE_CHARACTERS);
    return title || fallback;
  }

  function normalizeHttpUrl(value, required = false) {
    const raw = String(value || '').trim();
    if (!raw && !required) return '';
    let parsed;
    try {
      parsed = new URL(raw);
    } catch (error) {
      throw new Error('Enter a valid public HTTP or HTTPS URL.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      throw new Error('Only credential-free HTTP and HTTPS URLs are supported.');
    }
    parsed.hash = '';
    return parsed.href;
  }

  function normalizePayload(value) {
    const payload = value && typeof value === 'object' ? value : {};
    const type = payload.type === 'url' ? 'url' : 'text';
    let sourceUrl = '';
    if (type === 'url') {
      sourceUrl = normalizeHttpUrl(payload.sourceUrl || payload.url, true);
    } else {
      try {
        sourceUrl = normalizeHttpUrl(payload.sourceUrl, false);
      } catch (error) {
        sourceUrl = '';
      }
    }

    if (type === 'url') {
      return {
        type,
        url: sourceUrl,
        title: normalizeTitle(payload.title, new URL(sourceUrl).hostname),
        sourceUrl
      };
    }

    const text = String(payload.text || '').replace(/\u0000/gu, '').trim();
    if (!text) throw new Error('Select, copy, or paste some text first.');
    if (text.length > MAX_TEXT_CHARACTERS) {
      throw new Error('The selected text is too large. Send the article link instead.');
    }
    return {
      type,
      text,
      title: normalizeTitle(payload.title),
      sourceUrl
    };
  }

  function isValidNonce(value) {
    return /^[a-f0-9]{32}$/u.test(String(value || ''));
  }

  function createNonce(cryptoProvider = global.crypto) {
    if (!cryptoProvider || typeof cryptoProvider.getRandomValues !== 'function') {
      throw new Error('Secure randomness is unavailable.');
    }
    const bytes = new Uint8Array(16);
    cryptoProvider.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function storageKey(nonce) {
    if (!isValidNonce(nonce)) throw new Error('Invalid handoff token.');
    return `${STORAGE_PREFIX}${nonce}`;
  }

  function buildHandoffUrl(nonce, baseUrl = PACEFLOW_URL) {
    const target = new URL(baseUrl);
    target.searchParams.set(HANDOFF_PARAM, isValidNonce(nonce) ? nonce : storageKey(nonce));
    return target.href;
  }

  const api = Object.freeze({
    HANDOFF_PARAM,
    MAX_TEXT_CHARACTERS,
    MAX_TITLE_CHARACTERS,
    PACEFLOW_URL,
    PENDING_TTL_MS,
    STORAGE_PREFIX,
    buildHandoffUrl,
    createNonce,
    isValidNonce,
    normalizeHttpUrl,
    normalizePayload,
    normalizeTitle,
    storageKey
  });

  global.PaceFlowExtensionCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : self);
