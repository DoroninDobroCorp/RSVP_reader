const CACHE_NAME = 'hummingread-reader-v53';
const ASSET_VERSION = 'v=53';
const APP_SHELL = [
  './',
  './index.html',
  './privacy.html',
  './support.html',
  './acknowledgements.html',
  './ru/',
  './ru/index.html',
  './ru/privacy.html',
  './ru/support.html',
  './ru/acknowledgements.html',
  './es/',
  './es/index.html',
  './es/privacy.html',
  './es/support.html',
  './es/acknowledgements.html',
  `./style.css?${ASSET_VERSION}`,
  `./app-base-url.js?${ASSET_VERSION}`,
  `./i18n.js?${ASSET_VERSION}`,
  `./app.js?${ASSET_VERSION}`,
  `./epub-parser.js?${ASSET_VERSION}`,
  `./vendor/jszip.min.js?${ASSET_VERSION}`,
  `./manifest.json?${ASSET_VERSION}`,
  './manifest.json',
  './manifest.webmanifest',
  './ru/manifest.webmanifest',
  './es/manifest.webmanifest',
  './ru/manifest.json',
  './es/manifest.json',
  './assets/icons/app-icon-32.png',
  './assets/icons/app-icon-64.png',
  './assets/icons/app-icon-180.png',
  './assets/icons/app-icon-192.png',
  './assets/icons/app-icon-512.png',
  './assets/brand/pico-hero-640.webp',
  './assets/brand/pico-quick-send-640.webp',
  './assets/brand/pico-mark-1024.png',
  './sample_text.txt',
  './sample_text_ru.txt',
  './sample_text_es.txt',
  './sample_text_en.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => /^(?:paceflow|hummingread)-reader-/u.test(cacheName) && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (requestUrl.pathname.endsWith('/api/sync') || requestUrl.pathname.endsWith('/api/article')) return;

  const acceptHeader = event.request.headers.get('accept') || '';
  const isNav = event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    (event.request.destination === '' && acceptHeader.includes('text/html'));

  if (isNav || isAppShellNavigation(event.request.url)) {
    event.respondWith(handleNavigation(event.request));
    return;
  }

  if (isVersionedAppAsset(requestUrl)) {
    event.respondWith(cacheFirstWithRevalidate(event.request, event));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request, event));
});

function isVersionedAppAsset(requestUrl) {
  const pathname = requestUrl.pathname;
  const versionedExtensions = ['.js', '.css', '.json', '.webmanifest', '.png', '.webp', '.svg', '.txt', '.woff', '.woff2', '.ttf'];
  const hasAssetExt = versionedExtensions.some((ext) => pathname.endsWith(ext));

  if (requestUrl.searchParams.has('v') && hasAssetExt) return true;

  return [
    '/app.js',
    '/i18n.js',
    '/style.css',
    '/epub-parser.js',
    '/vendor/jszip.min.js',
    '/manifest.json',
    '/manifest.webmanifest'
  ].some((path) => pathname.endsWith(path));
}

function getSwBaseUrl() {
  if (typeof self !== 'undefined' && self.location) {
    return self.location.href || (self.location.origin ? self.location.origin + '/' : 'http://localhost/');
  }
  return 'http://localhost/';
}

function detectLocale(url) {
  try {
    const pathname = new URL(url).pathname.replace(/\/+/g, '/');
    if (pathname.includes('/ru/') || pathname.endsWith('/ru') || pathname.endsWith('/ru/index.html')) {
      return 'ru';
    }
    if (pathname.includes('/es/') || pathname.endsWith('/es') || pathname.endsWith('/es/index.html')) {
      return 'es';
    }
  } catch (e) {}
  return 'en';
}

async function matchAppShell(request) {
  const reqUrl = typeof request === 'string' ? request : (request && request.url ? request.url : '');
  const baseUrl = getSwBaseUrl();
  const locale = detectLocale(reqUrl);

  let match = await caches.match(request, { ignoreSearch: true });
  if (match) return match;

  const candidates = [];
  if (locale === 'ru') {
    candidates.push(new URL('./ru/index.html', baseUrl).href);
    candidates.push(new URL('./ru/', baseUrl).href);
  } else if (locale === 'es') {
    candidates.push(new URL('./es/index.html', baseUrl).href);
    candidates.push(new URL('./es/', baseUrl).href);
  }
  candidates.push(new URL('./index.html', baseUrl).href);
  candidates.push(new URL('./', baseUrl).href);

  for (const candidate of candidates) {
    match = await caches.match(candidate, { ignoreSearch: true });
    if (match) return match;
  }
  return null;
}

// Fast fetch with timeout so slow/stalled networks (e.g. Lie-Fi on a bus)
// fail over to the cached app shell within 1.5s instead of hanging indefinitely.
async function fetchWithTimeout(request, timeoutMs = 1500) {
  if (typeof AbortController === 'undefined' || typeof setTimeout === 'undefined') {
    return fetch(request);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function handleNavigation(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+/g, '/');

  // If navigation is missing the trailing slash on directories, redirect to the canonical trailing slash
  // so relative asset paths resolve correctly
  if (pathname === '/rsvp' || pathname === '/ru' || pathname === '/es' || pathname.endsWith('/ru') || pathname.endsWith('/es')) {
    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = pathname + '/';
    if (typeof Response !== 'undefined' && typeof Response.redirect === 'function') {
      return Response.redirect(redirectUrl.href, 301);
    }
  }

  try {
    const response = await fetchWithTimeout(request, 1500);
    const responseType = response.headers && response.headers.get ? (response.headers.get('content-type') || '') : '';
    if (response.status >= 500 && isAppShellNavigation(request.url)) {
      const cachedShell = await matchAppShell(request);
      if (cachedShell) return cachedShell;
    }
    if (response.ok && responseType.includes('text/html') && isAppShellNavigation(request.url)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedShell = await matchAppShell(request);
    if (cachedShell) return cachedShell;
    if (typeof Response !== 'undefined') {
      return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
    return null;
  }
}

function isAppShellNavigation(url) {
  const pathname = new URL(url).pathname.replace(/\/+/g, '/');
  return [
    '/', '/index.html',
    '/ru', '/ru/', '/ru/index.html',
    '/es', '/es/', '/es/index.html',
    '/rsvp', '/rsvp/', '/rsvp/index.html',
    '/rsvp/ru', '/rsvp/ru/', '/rsvp/ru/index.html',
    '/rsvp/es', '/rsvp/es/', '/rsvp/es/index.html'
  ].includes(pathname) ||
    pathname.endsWith('/') ||
    pathname.endsWith('/index.html') ||
    pathname.endsWith('/ru') ||
    pathname.endsWith('/ru/') ||
    pathname.endsWith('/ru/index.html') ||
    pathname.endsWith('/es') ||
    pathname.endsWith('/es/') ||
    pathname.endsWith('/es/index.html');
}

// Find asset in cache even if requested with a different subpath resolution
async function matchAssetInCache(request) {
  const cache = await caches.open(CACHE_NAME);
  let match = await cache.match(request, { ignoreSearch: true });
  if (match) return match;

  const reqUrl = new URL(request.url);
  const swBase = getSwBaseUrl();
  const filename = reqUrl.pathname.split('/').pop();
  if (filename) {
    const candidate = new URL('./' + filename, swBase).href;
    match = await cache.match(candidate, { ignoreSearch: true });
    if (match) return match;
  }
  return null;
}

async function cacheFirstWithRevalidate(request, event) {
  const cached = await matchAssetInCache(request);
  if (cached) {
    if (event && event.waitUntil) {
      event.waitUntil(
        fetch(request)
          .then(async (response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(request, response.clone());
            }
          })
          .catch(() => undefined)
      );
    }
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    if (typeof Response !== 'undefined') {
      return cached || new Response('Asset unavailable', { status: 404 });
    }
    return cached || null;
  }
}

async function staleWhileRevalidate(request, event) {
  const cached = await matchAssetInCache(request);

  const networkFetch = fetch(request)
    .then(async (response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  if (cached) {
    if (event && event.waitUntil) {
      event.waitUntil(networkFetch.then(() => undefined));
    }
    return cached;
  }
  return networkFetch;
}
