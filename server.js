const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8081);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const STORE_FILE = path.join(DATA_DIR, 'sync-store.json');
const MAX_BODY_BYTES = 50 * 1024 * 1024;
let storeWriteSequence = 0;
let storeMutationQueue = Promise.resolve();
// The historical endpoint is intentionally off for public/native releases: it
// was designed for one trusted owner and has no multi-user authentication.
const LEGACY_SINGLE_USER_SYNC = process.env.PACEFLOW_ENABLE_LEGACY_SYNC === '1';
const PUBLIC_FILES = new Set([
  'index.html',
  'style.css',
  'i18n.js',
  'app.js',
  'epub-parser.js',
  'service-worker.js',
  'manifest.json',
  'sample_text.txt'
]);
const PUBLIC_DIRECTORIES = ['assets/', 'vendor/'];

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.epub': 'application/epub+zip',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function emptyStore() {
  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    settings: null,
    settingsUpdatedAt: new Date(0).toISOString(),
    draft: null,
    books: {},
    deletedBooks: {}
  };
}

async function readStore() {
  try {
    const raw = await fs.promises.readFile(STORE_FILE, 'utf8');
    return { ...emptyStore(), ...JSON.parse(raw) };
  } catch (error) {
    if (error.code === 'ENOENT') return emptyStore();
    throw error;
  }
}

async function writeStore(store) {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  storeWriteSequence += 1;
  const tmpFile = `${STORE_FILE}.${process.pid}.${storeWriteSequence}.tmp`;
  await fs.promises.writeFile(tmpFile, JSON.stringify(store, null, 2));
  await fs.promises.rename(tmpFile, STORE_FILE);
}

function mutateStore(payload) {
  const operation = storeMutationQueue.then(async () => {
    const store = mergeStore(await readStore(), payload);
    await writeStore(store);
    return store;
  });
  storeMutationQueue = operation.catch(() => undefined);
  return operation;
}

function timestamp(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function isNewer(candidate, current) {
  return timestamp(candidate) > timestamp(current);
}

function isNewerOrEqual(candidate, current) {
  return timestamp(candidate) >= timestamp(current);
}

function mergeStore(store, payload) {
  const now = new Date().toISOString();
  const merged = {
    ...emptyStore(),
    ...store,
    books: { ...(store.books || {}) },
    deletedBooks: { ...(store.deletedBooks || {}) }
  };

  Object.entries(payload.deletedBooks || {}).forEach(([bookId, deletedAt]) => {
    if (!merged.deletedBooks[bookId] || isNewer(deletedAt, merged.deletedBooks[bookId])) {
      merged.deletedBooks[bookId] = deletedAt;
    }

    const existingBook = merged.books[bookId];
    if (existingBook && isNewerOrEqual(deletedAt, existingBook.updatedAt || existingBook.lastRead)) {
      delete merged.books[bookId];
    }
  });

  (payload.books || []).forEach((book) => {
    if (!book || !book.id) return;

    const bookUpdatedAt = book.updatedAt || book.lastRead || now;
    const deletedAt = merged.deletedBooks[book.id];
    if (deletedAt && isNewerOrEqual(deletedAt, bookUpdatedAt)) return;

    const existing = merged.books[book.id];
    if (!existing || isNewer(bookUpdatedAt, existing.updatedAt || existing.lastRead)) {
      merged.books[book.id] = { ...book, updatedAt: bookUpdatedAt };
      delete merged.deletedBooks[book.id];
    }
  });

  if (payload.settings && isNewer(payload.settingsUpdatedAt, merged.settingsUpdatedAt)) {
    merged.settings = payload.settings;
    merged.settingsUpdatedAt = payload.settingsUpdatedAt;
  }

  if (payload.draft && isNewer(payload.draft.updatedAt, merged.draft?.updatedAt)) {
    merged.draft = payload.draft;
  }

  merged.updatedAt = now;
  return merged;
}

function publicStore(store) {
  return {
    version: 1,
    serverUpdatedAt: store.updatedAt,
    settings: store.settings,
    settingsUpdatedAt: store.settingsUpdatedAt,
    draft: store.draft,
    books: Object.values(store.books || {}),
    deletedBooks: store.deletedBooks || {}
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body is too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

async function handleSync(request, response) {
  if (!LEGACY_SINGLE_USER_SYNC) {
    sendJson(response, 410, {
      error: 'Cloud sync is disabled. PaceFlow Reader stores books locally.'
    });
    return;
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Cache-Control': 'no-store'
    });
    response.end();
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readRequestBody(request);
    const payload = JSON.parse(body || '{}');
    const store = await mutateStore(payload);
    sendJson(response, 200, publicStore(store));
  } catch (error) {
    sendJson(response, 400, { error: error.message || 'Sync failed' });
  }
}

function sendStatic(request, response, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (error) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }
  if (pathname.startsWith('/rsvp/')) pathname = pathname.slice('/rsvp'.length);
  if (pathname === '/' || pathname === '') pathname = '/index.html';

  const requestedRelativePath = pathname.replace(/^\/+/, '');
  const filePath = path.resolve(ROOT, requestedRelativePath);
  const relativeToRoot = path.relative(ROOT, filePath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  const relativePath = relativeToRoot.split(path.sep).join('/');
  const isPublic = PUBLIC_FILES.has(relativePath)
    || PUBLIC_DIRECTORIES.some((directory) => relativePath.startsWith(directory));
  if (!isPublic) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    const finalPath = !statError && stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;

    fs.readFile(finalPath, (readError, data) => {
      if (readError) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }

      const ext = path.extname(finalPath).toLowerCase();
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300'
      });
      response.end(data);
    });
  });
}

const server = http.createServer(async (request, response) => {
  let url;
  try {
    url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  } catch (error) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  if (url.pathname === '/api/sync' || url.pathname === '/rsvp/api/sync') {
    await handleSync(request, response);
    return;
  }

  sendStatic(request, response, url);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`RSVP Reader listening on http://0.0.0.0:${PORT}`);
});
