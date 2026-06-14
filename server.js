const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8081);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const STORE_FILE = path.join(DATA_DIR, 'sync-store.json');
const MAX_BODY_BYTES = 50 * 1024 * 1024;

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
  const tmpFile = `${STORE_FILE}.${process.pid}.tmp`;
  await fs.promises.writeFile(tmpFile, JSON.stringify(store, null, 2));
  await fs.promises.rename(tmpFile, STORE_FILE);
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
    const store = mergeStore(await readStore(), payload);
    await writeStore(store);
    sendJson(response, 200, publicStore(store));
  } catch (error) {
    sendJson(response, 400, { error: error.message || 'Sync failed' });
  }
}

function sendStatic(request, response, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.startsWith('/rsvp/')) pathname = pathname.slice('/rsvp'.length);
  if (pathname === '/' || pathname === '') pathname = '/index.html';

  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    const finalPath = !statError && stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;

    fs.readFile(finalPath, (readError, data) => {
      if (readError) {
        fs.readFile(path.join(ROOT, 'index.html'), (fallbackError, fallbackData) => {
          if (fallbackError) {
            response.writeHead(404);
            response.end('Not found');
            return;
          }
          response.writeHead(200, {
            'Content-Type': MIME_TYPES['.html'],
            'Cache-Control': 'no-cache'
          });
          response.end(fallbackData);
        });
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
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (url.pathname === '/api/sync' || url.pathname === '/rsvp/api/sync') {
    await handleSync(request, response);
    return;
  }

  sendStatic(request, response, url);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`RSVP Reader listening on http://0.0.0.0:${PORT}`);
});
