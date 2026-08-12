const CACHE_NAME = 'hummingread-reader-v49';
const ASSET_VERSION = 'v=49';
const APP_SHELL = [
  '/',
  '/index.html',
  '/privacy.html',
  '/support.html',
  '/acknowledgements.html',
  '/ru/',
  '/ru/index.html',
  '/ru/privacy.html',
  '/ru/support.html',
  '/ru/acknowledgements.html',
  '/es/',
  '/es/index.html',
  '/es/privacy.html',
  '/es/support.html',
  '/es/acknowledgements.html',
  `/style.css?${ASSET_VERSION}`,
  `/app-base-url.js?${ASSET_VERSION}`,
  `/i18n.js?${ASSET_VERSION}`,
  `/app.js?${ASSET_VERSION}`,
  `/epub-parser.js?${ASSET_VERSION}`,
  `/vendor/jszip.min.js?${ASSET_VERSION}`,
  `/manifest.json?${ASSET_VERSION}`,
  '/manifest.webmanifest',
  '/ru/manifest.webmanifest',
  '/es/manifest.webmanifest',
  '/ru/manifest.json',
  '/es/manifest.json',
  '/assets/icons/app-icon-32.png',
  '/assets/icons/app-icon-64.png',
  '/assets/icons/app-icon-180.png',
  '/assets/icons/app-icon-192.png',
  '/assets/icons/app-icon-512.png',
  '/assets/brand/pico-hero-640.webp',
  '/assets/brand/pico-quick-send-640.webp',
  '/assets/brand/pico-mark-1024.png',
  '/sample_text.txt',
  '/sample_text_ru.txt',
  '/sample_text_es.txt',
  '/sample_text_en.txt'
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

  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigation(event.request));
    return;
  }

  if (isVersionedAppAsset(requestUrl)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request, event));
});

function isVersionedAppAsset(requestUrl) {
  if (requestUrl.searchParams.has('v')) return true;

  return [
    '/app.js',
    '/i18n.js',
    '/style.css',
    '/epub-parser.js',
    '/vendor/jszip.min.js',
    '/manifest.json',
    '/manifest.webmanifest'
  ].some((path) => requestUrl.pathname.endsWith(path));
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    const responseType = response.headers.get('content-type') || '';
    if (response.status >= 500 && isAppShellNavigation(request.url)) {
      const cachedShell = await caches.match('/index.html', { ignoreSearch: true });
      if (cachedShell) return cachedShell;
    }
    if (response.ok && responseType.includes('text/html') && isAppShellNavigation(request.url)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/index.html', response.clone());
    }
    return response;
  } catch (error) {
    return caches.match(request, { ignoreSearch: true })
      .then((cached) => cached || caches.match('/index.html', { ignoreSearch: true }));
  }
}

function isAppShellNavigation(url) {
  const pathname = new URL(url).pathname.replace(/\/+/g, '/');
  return [
    '/', '/index.html',
    '/ru/', '/ru/index.html',
    '/es/', '/es/index.html',
    '/rsvp/', '/rsvp/index.html',
    '/rsvp/ru/', '/rsvp/ru/index.html',
    '/rsvp/es/', '/rsvp/es/index.html'
  ].includes(pathname);
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });

  const networkFetch = fetch(request)
    .then(async (response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  if (cached) {
    event.waitUntil(networkFetch.then(() => undefined));
    return cached;
  }
  return networkFetch;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      await cache.put(request, response.clone());
    }
    if (response && response.status >= 500) {
      return (await cache.match(request, { ignoreSearch: true })) || response;
    }
    return response;
  } catch (error) {
    return cache.match(request, { ignoreSearch: true });
  }
}
