(function exposeHummingReadExtensionCore(global) {
  'use strict';

  const PREVIEW_URL = '__HUMMINGREAD_MARKETING_SITE_URL__';
  const HANDOFF_PARAM = 'hummingread-extension-import';
  const HANDOFF_STORAGE_PREFIX = 'hummingread-pending:';
  const READER_STORAGE_PREFIX = 'hummingread-reader:';
  const MAX_TEXT_CHARACTERS = 1_500_000;
  const MAX_TITLE_CHARACTERS = 300;
  const PENDING_TTL_MS = 10 * 60 * 1000;

  function normalizeTitle(value, fallback = 'Pasted text') {
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
    if (!text) throw new Error('Select or paste some text first.');
    if (text.length > MAX_TEXT_CHARACTERS) {
      throw new Error('This text is too large. Use a shorter selection (up to 1.5 million characters).');
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

  function scopedStorageKey(prefix, nonce) {
    if (!isValidNonce(nonce)) throw new Error('Invalid extension token.');
    return `${prefix}${nonce}`;
  }

  function handoffStorageKey(nonce) {
    return scopedStorageKey(HANDOFF_STORAGE_PREFIX, nonce);
  }

  function readerStorageKey(nonce) {
    return scopedStorageKey(READER_STORAGE_PREFIX, nonce);
  }

  function configuredPreviewUrl(value = PREVIEW_URL) {
    if (String(value).startsWith('__HUMMINGREAD_')) return '';
    try {
      return normalizeHttpUrl(value, true);
    } catch (error) {
      return '';
    }
  }

  function buildHandoffUrl(nonce, baseUrl = configuredPreviewUrl()) {
    if (!baseUrl) throw new Error('The web preview is not configured in this tester build.');
    const target = new URL(baseUrl);
    target.searchParams.set(HANDOFF_PARAM, isValidNonce(nonce) ? nonce : scopedStorageKey('', nonce));
    return target.href;
  }

  function isExtractablePageUrl(value) {
    let parsed;
    try {
      parsed = new URL(value);
    } catch (error) {
      return { ok: false, reason: 'Open a normal HTTP or HTTPS page first.' };
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { ok: false, reason: 'Chrome protects this page. Open a normal website, or paste text into HummingRead.' };
    }
    if (/\.pdf(?:$|[?#])/iu.test(parsed.href)) {
      return { ok: false, reason: 'Chrome PDF pages cannot be extracted reliably. Select text in the PDF or paste it instead.' };
    }
    return { ok: true, url: parsed.href };
  }

  async function tokenizeTextAsync(value, options = {}) {
    const text = String(value || '').replace(/\u0000/gu, '').trim();
    if (!text) return [];
    if (text.length > MAX_TEXT_CHARACTERS) {
      throw new Error('This text is too large. Use a shorter selection (up to 1.5 million characters).');
    }
    const yieldEvery = Math.max(500, Number(options.yieldEvery) || 4000);
    const isCancelled = typeof options.isCancelled === 'function' ? options.isCancelled : () => false;
    const tokens = [];
    let start = -1;
    for (let index = 0; index <= text.length; index += 1) {
      if (isCancelled()) throw new Error('Reading preparation was cancelled.');
      const character = text[index] || ' ';
      const whitespace = /\s/u.test(character);
      if (!whitespace && start < 0) start = index;
      if (whitespace && start >= 0) {
        tokens.push(text.slice(start, index));
        start = -1;
        if (tokens.length % yieldEvery === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    }
    return tokens;
  }

  function focusSegments(value) {
    const characters = Array.from(String(value || ''));
    if (!characters.length) return { before: '', focus: '', after: '' };
    const letterIndexes = [];
    characters.forEach((character, index) => {
      if (/[\p{L}\p{N}]/u.test(character)) letterIndexes.push(index);
    });
    const target = letterIndexes.length <= 1
      ? (letterIndexes[0] ?? 0)
      : letterIndexes[Math.min(letterIndexes.length - 1, Math.floor((letterIndexes.length - 1) * 0.35))];
    return {
      before: characters.slice(0, target).join(''),
      focus: characters[target] || '',
      after: characters.slice(target + 1).join('')
    };
  }

  function extractReadablePageFromDocument() {
    const blocked = 'script,style,noscript,nav,aside,form,footer,svg,canvas,iframe,template,[hidden],[aria-hidden="true"]';
    const candidates = Array.from(document.querySelectorAll('article,main,[role="main"]'));
    const body = document.body;
    if (body) candidates.push(body);
    const ranked = candidates
      .map((element) => ({ element, length: String(element.innerText || element.textContent || '').trim().length }))
      .filter((entry) => entry.length > 0)
      .sort((left, right) => {
        const leftBonus = left.element.matches?.('article,main,[role="main"]') && left.length >= 400 ? 2_000_000 : 0;
        const rightBonus = right.element.matches?.('article,main,[role="main"]') && right.length >= 400 ? 2_000_000 : 0;
        return (rightBonus + right.length) - (leftBonus + left.length);
      });
    const source = ranked[0]?.element;
    if (!source) return { ok: false, error: 'This page does not expose readable text.' };
    const clone = source.cloneNode(true);
    clone.querySelectorAll(blocked).forEach((element) => element.remove());
    clone.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,br,section,div').forEach((element) => {
      element.append(document.createTextNode('\n'));
    });
    const text = String(clone.textContent || '')
      .replace(/[\t\f\v ]+/gu, ' ')
      .replace(/ *\n */gu, '\n')
      .replace(/\n{3,}/gu, '\n\n')
      .trim()
      .slice(0, 1_500_001);
    if (text.length < 40) return { ok: false, error: 'This page does not expose enough readable text. Select or paste the passage instead.' };
    return {
      ok: true,
      text,
      title: String(document.title || location.hostname || 'Web page').trim(),
      sourceUrl: location.href
    };
  }

  const api = Object.freeze({
    HANDOFF_PARAM,
    HANDOFF_STORAGE_PREFIX,
    MAX_TEXT_CHARACTERS,
    MAX_TITLE_CHARACTERS,
    PENDING_TTL_MS,
    PREVIEW_URL,
    READER_STORAGE_PREFIX,
    buildHandoffUrl,
    configuredPreviewUrl,
    createNonce,
    extractReadablePageFromDocument,
    focusSegments,
    handoffStorageKey,
    isExtractablePageUrl,
    isValidNonce,
    normalizeHttpUrl,
    normalizePayload,
    normalizeTitle,
    readerStorageKey,
    tokenizeTextAsync
  });

  global.HummingReadExtensionCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : self);
