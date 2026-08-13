'use strict';

const Core = globalThis.HummingReadExtensionCore;
const STORAGE_DOCUMENT = 'hummingreadReaderDocument';
const STORAGE_SETTINGS = 'hummingreadReaderSettings';
const MIN_WPM = 100;
const MAX_WPM = 1000;
const WPM_STEP = 20;

const elements = {
  loading: document.getElementById('loadingState'),
  error: document.getElementById('errorState'),
  errorMessage: document.getElementById('errorMessage'),
  shell: document.getElementById('readerShell'),
  title: document.getElementById('documentTitle'),
  source: document.getElementById('sourceMeta'),
  stage: document.getElementById('readerStage'),
  before: document.getElementById('wordBefore'),
  focus: document.getElementById('wordFocus'),
  after: document.getElementById('wordAfter'),
  context: document.getElementById('pauseContext'),
  play: document.getElementById('playBtn'),
  playIcon: document.getElementById('playIcon'),
  playLabel: document.getElementById('playLabel'),
  rewind: document.getElementById('rewindBtn'),
  slower: document.getElementById('slowerBtn'),
  faster: document.getElementById('fasterBtn'),
  wpm: document.getElementById('wpmOutput'),
  progress: document.getElementById('progressRange'),
  progressOutput: document.getElementById('progressOutput'),
  theme: document.getElementById('themeSelect'),
  quickSend: document.getElementById('quickSendReaderBtn'),
  status: document.getElementById('readerStatus')
};

const state = {
  payload: null,
  tokens: [],
  index: 0,
  wpm: 320,
  theme: 'system',
  playing: false,
  timer: null,
  saveTimer: null,
  generation: 0
};

let activeCatalog = {};

function message(key, substitutions) {
  if (activeCatalog && activeCatalog[key]) return activeCatalog[key];
  return chrome.i18n.getMessage(key, substitutions) || key;
}

async function localize() {
  const locale = await Core.getActiveLocale();
  document.documentElement.lang = locale;
  activeCatalog = await Core.loadLocaleCatalog(locale);
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = message(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    element.setAttribute('aria-label', message(element.dataset.i18nAria));
  });
}

function showError(error) {
  stop(false);
  elements.loading.hidden = true;
  elements.shell.hidden = true;
  elements.error.hidden = false;
  elements.errorMessage.textContent = String(error?.message || error || message('couldNotRead'));
  document.title = `${message('couldNotRead')} · HummingRead`;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || minimum));
}

function currentToken() {
  return state.tokens[state.index] || '';
}

function renderContext() {
  elements.context.replaceChildren();
  if (state.playing || !state.tokens.length) return;
  const start = Math.max(0, state.index - 10);
  const end = Math.min(state.tokens.length, state.index + 15);
  state.tokens.slice(start, end).forEach((token, offset) => {
    if (start + offset > start) elements.context.append(document.createTextNode(' '));
    const node = start + offset === state.index ? document.createElement('mark') : document.createTextNode(token);
    if (node.nodeType === Node.ELEMENT_NODE) node.textContent = token;
    elements.context.append(node);
  });
}

function render() {
  if (!state.tokens.length) return;
  state.index = clamp(state.index, 0, state.tokens.length - 1);
  const segments = Core.focusSegments(currentToken());
  elements.before.textContent = segments.before;
  elements.focus.textContent = segments.focus;
  elements.after.textContent = segments.after;
  elements.wpm.textContent = `${state.wpm} WPM`;
  elements.progress.max = String(Math.max(0, state.tokens.length - 1));
  elements.progress.value = String(state.index);
  const percent = state.tokens.length <= 1 ? 100 : Math.round((state.index / (state.tokens.length - 1)) * 100);
  elements.progressOutput.textContent = `${state.index + 1} / ${state.tokens.length} · ${percent}%`;
  elements.play.setAttribute('aria-pressed', String(state.playing));
  elements.playIcon.textContent = state.playing ? '❚❚' : '▶';
  elements.playLabel.textContent = state.playing ? message('pause') : message('play');
  renderContext();
}

function delayForToken(token) {
  const base = 60_000 / state.wpm;
  if (/[.!?…][”’"')\]]*$/u.test(token)) return base * 1.75;
  if (/[,;:][”’"')\]]*$/u.test(token)) return base * 1.3;
  if (Array.from(token).length >= 12) return base * 1.18;
  return base;
}

function scheduleTick() {
  clearTimeout(state.timer);
  if (!state.playing) return;
  state.timer = setTimeout(() => {
    if (state.index >= state.tokens.length - 1) {
      stop();
      return;
    }
    state.index += 1;
    render();
    scheduleSave();
    scheduleTick();
  }, delayForToken(currentToken()));
}

function play() {
  if (!state.tokens.length || state.playing) return;
  if (state.index >= state.tokens.length - 1) state.index = 0;
  state.playing = true;
  render();
  scheduleTick();
}

function stop(save = true) {
  state.playing = false;
  clearTimeout(state.timer);
  state.timer = null;
  render();
  if (save) persist().catch(() => undefined);
}

function togglePlayback() {
  if (state.playing) stop();
  else play();
}

function setIndex(nextIndex) {
  state.index = clamp(nextIndex, 0, Math.max(0, state.tokens.length - 1));
  if (state.playing) scheduleTick();
  render();
  scheduleSave();
}

function setWpm(nextWpm) {
  state.wpm = clamp(Math.round(Number(nextWpm) / WPM_STEP) * WPM_STEP, MIN_WPM, MAX_WPM);
  render();
  if (state.playing) scheduleTick();
  scheduleSave();
}

async function persist() {
  clearTimeout(state.saveTimer);
  state.saveTimer = null;
  if (!state.payload?.text) return;
  const documentState = {
    version: 1,
    payload: state.payload,
    index: state.index,
    savedAt: Date.now()
  };
  await chrome.storage.local.set({
    [STORAGE_DOCUMENT]: documentState,
    [STORAGE_SETTINGS]: { version: 1, wpm: state.wpm, theme: state.theme }
  });
}

function scheduleSave() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => persist().catch(() => undefined), 650);
}

async function consumeDraft() {
  const url = new URL(window.location.href);
  const nonce = url.searchParams.get('draft');
  const explicitError = url.searchParams.get('error');
  if (explicitError) throw new Error(explicitError);
  if (!nonce) {
    const restored = await chrome.storage.local.get([STORAGE_DOCUMENT, STORAGE_SETTINGS]);
    if (!restored[STORAGE_DOCUMENT]?.payload?.text) {
      throw new Error(message('noSavedText'));
    }
    return {
      payload: Core.normalizePayload(restored[STORAGE_DOCUMENT].payload),
      index: restored[STORAGE_DOCUMENT].index,
      settings: restored[STORAGE_SETTINGS] || {}
    };
  }
  if (!Core.isValidNonce(nonce)) throw new Error(message('readerLinkInvalid'));
  const key = Core.readerStorageKey(nonce);
  const stored = await chrome.storage.session.get(key);
  await chrome.storage.session.remove(key);
  await chrome.alarms.clear(`hummingread-expire:reader:${nonce}`);
  window.history.replaceState(null, '', chrome.runtime.getURL('reader.html'));
  const draft = stored[key];
  if (!draft || Number(draft.expiresAt) <= Date.now()) throw new Error(message('readerLinkExpired'));
  const settings = await chrome.storage.local.get(STORAGE_SETTINGS);
  return {
    payload: Core.normalizePayload(draft.payload),
    index: 0,
    settings: settings[STORAGE_SETTINGS] || {}
  };
}

async function prepare() {
  const draft = await consumeDraft();
  state.payload = draft.payload;
  state.index = Number(draft.index) || 0;
  state.wpm = clamp(draft.settings.wpm || 320, MIN_WPM, MAX_WPM);
  state.theme = ['system', 'light', 'dark'].includes(draft.settings.theme) ? draft.settings.theme : 'system';
  elements.theme.value = state.theme;
  document.documentElement.dataset.theme = state.theme;

  const generation = ++state.generation;
  state.tokens = await Core.tokenizeTextAsync(state.payload.text, {
    isCancelled: () => generation !== state.generation
  });
  if (generation !== state.generation) return;
  if (!state.tokens.length) throw new Error(message('noSavedText'));
  state.index = clamp(state.index, 0, state.tokens.length - 1);
  elements.title.textContent = state.payload.title;
  elements.source.textContent = (() => {
    try { return new URL(state.payload.sourceUrl).hostname; } catch (error) { return message('pastedLocally'); }
  })();
  document.title = `${state.payload.title} · HummingRead`;
  elements.loading.hidden = true;
  elements.error.hidden = true;
  elements.shell.hidden = false;
  render();
  await persist();
  elements.play.focus();
}

elements.play.addEventListener('click', togglePlayback);
elements.rewind.addEventListener('click', () => setIndex(state.index - 10));
elements.slower.addEventListener('click', () => setWpm(state.wpm - WPM_STEP));
elements.faster.addEventListener('click', () => setWpm(state.wpm + WPM_STEP));
elements.progress.addEventListener('input', () => setIndex(Number(elements.progress.value)));
elements.theme.addEventListener('change', () => {
  state.theme = elements.theme.value;
  document.documentElement.dataset.theme = state.theme;
  scheduleSave();
});

elements.quickSend.addEventListener('click', async () => {
  elements.quickSend.disabled = true;
  elements.status.textContent = message('quickSendOpening');
  try {
    const response = await chrome.runtime.sendMessage({ type: 'hummingread:quick-send', payload: state.payload });
    if (!response?.ok) throw new Error(response?.error || message('quickSendFailed'));
    elements.status.textContent = message('quickSendOpened');
  } catch (error) {
    elements.status.textContent = error.message || message('quickSendFailed');
    elements.quickSend.disabled = false;
  }
});

document.addEventListener('keydown', (event) => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (['SELECT', 'INPUT', 'TEXTAREA', 'BUTTON', 'A'].includes(event.target?.tagName) && event.key === ' ') return;
  if (event.key === ' ') {
    event.preventDefault();
    togglePlayback();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    setIndex(state.index - 10);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    setIndex(state.index + 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    setWpm(state.wpm + WPM_STEP);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    setWpm(state.wpm - WPM_STEP);
  } else if (event.key === 'Home') {
    event.preventDefault();
    setIndex(0);
  } else if (event.key === 'End') {
    event.preventDefault();
    setIndex(state.tokens.length - 1);
  }
});

window.addEventListener('pagehide', () => {
  state.generation += 1;
  persist().catch(() => undefined);
});

localize().then(() => prepare()).catch(showError);
