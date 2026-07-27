const CACHE_NAME = 'rsvp-reader-v30';
const ASSET_VERSION = 'v=30';
const APP_SHELL = [
  './',
  './index.html',
  `./style.css?${ASSET_VERSION}`,
  `./app.js?${ASSET_VERSION}`,
  `./epub-parser.js?${ASSET_VERSION}`,
  `./vendor/jszip.min.js?${ASSET_VERSION}`,
  `./manifest.json?${ASSET_VERSION}`,
  './sample_text.txt'
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
          .filter((cacheName) => cacheName !== CACHE_NAME)
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

  if (requestUrl.pathname.endsWith('/api/sync')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigation(event.request));
    return;
  }

  if (isVersionedAppAsset(requestUrl)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});

function isVersionedAppAsset(requestUrl) {
  if (requestUrl.searchParams.has('v')) return true;

  return [
    '/app.js',
    '/style.css',
    '/epub-parser.js',
    '/vendor/jszip.min.js',
    '/manifest.json'
  ].some((path) => requestUrl.pathname.endsWith(path));
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put('./index.html', response.clone());
    return response;
  } catch (error) {
    return caches.match(request, { ignoreSearch: true })
      .then((cached) => cached || caches.match('./index.html', { ignoreSearch: true }));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkFetch;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return cache.match(request, { ignoreSearch: true });
  }
}
