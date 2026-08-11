const http = require('http');
const https = require('https');
const fs = require('fs');
const dns = require('dns');
const net = require('net');
const path = require('path');
const zlib = require('zlib');
const ipaddr = require('ipaddr.js');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const PORT = Number(process.env.PORT || 8081);
const ROOT = __dirname;
const MAX_ARTICLE_REQUEST_BYTES = 16 * 1024;
const MAX_ARTICLE_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_ARTICLE_TEXT_CHARACTERS = 2 * 1024 * 1024;
const ARTICLE_REQUEST_TIMEOUT_MS = 12_000;
const MAX_ARTICLE_REDIRECTS = 4;
const ARTICLE_RATE_WINDOW_MS = 10 * 60 * 1000;
const ARTICLE_RATE_LIMIT = 30;
const ARTICLE_RATE_BUCKET_LIMIT = 10_000;
const ARTICLE_NATIVE_ENDPOINT_ORIGINS = new Set([
  'capacitor://localhost',
  'http://localhost',
  'https://localhost'
]);
const articleRateBuckets = new Map();
const PUBLIC_FILES = new Set([
  'index.html',
  'privacy.html',
  'support.html',
  'style.css',
  'i18n.js',
  'app.js',
  'epub-parser.js',
  'service-worker.js',
  'manifest.json',
  'sample_text.txt',
  'sample_text_ru.txt'
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

const BLOCKED_IPV6_TRANSITION_RANGES = [
  '::/96',
  '64:ff9b::/96',
  '64:ff9b:1::/48',
  '2001::/32',
  '2001:10::/28',
  '2001:20::/28',
  '2002::/16',
  'fec0::/10'
].map((range) => ipaddr.parseCIDR(range));

class ArticleImportError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'ArticleImportError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request, maxBytes = MAX_ARTICLE_REQUEST_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
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

function normalizeArticleUrl(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 2048) {
    throw new ArticleImportError('invalid_url', 'Enter a valid article URL.');
  }

  let target;
  try {
    target = new URL(raw);
  } catch (error) {
    throw new ArticleImportError('invalid_url', 'Enter a valid article URL.');
  }
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) {
    throw new ArticleImportError('invalid_url', 'Only public HTTP and HTTPS URLs are supported.');
  }
  const allowedPort = !target.port
    || (target.protocol === 'http:' && target.port === '80')
    || (target.protocol === 'https:' && target.port === '443');
  if (!allowedPort) {
    throw new ArticleImportError('invalid_url', 'Only standard HTTP and HTTPS ports are supported.');
  }
  if (!target.hostname || target.hostname.length > 253) {
    throw new ArticleImportError('invalid_url', 'Enter a valid article URL.');
  }
  target.hash = '';
  return target;
}

function isPublicRemoteAddress(address) {
  if (!ipaddr.isValid(String(address || ''))) return false;
  const original = ipaddr.parse(String(address));
  const parsed = original.kind() === 'ipv6' && original.isIPv4MappedAddress()
    ? original.toIPv4Address()
    : original;
  if (parsed.kind() === 'ipv4') return parsed.range() === 'unicast';
  if (parsed.range() !== 'unicast') return false;
  return !BLOCKED_IPV6_TRANSITION_RANGES.some(([network, prefix]) => parsed.match(network, prefix));
}

async function resolvePublicRemote(target, lookup = dns.promises.lookup) {
  const hostname = target.hostname.replace(/^\[|\]$/g, '');
  if (/^(?:localhost|.+\.localhost|.+\.local)$/iu.test(hostname)) {
    throw new ArticleImportError('private_address', 'Local and private network addresses are not allowed.');
  }

  let addresses;
  if (net.isIP(hostname)) {
    addresses = [{ address: hostname, family: net.isIP(hostname) }];
  } else {
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch (error) {
      throw new ArticleImportError('fetch_failed', 'The article host could not be reached.', 502);
    }
  }

  if (!addresses.length || addresses.some(({ address, family }) => !isPublicRemoteAddress(address, family))) {
    throw new ArticleImportError('private_address', 'Local and private network addresses are not allowed.');
  }

  return addresses.find(({ family }) => Number(family) === 4) || addresses[0];
}

function decodeArticleBody(buffer, encoding) {
  const normalized = String(encoding || 'identity').trim().toLowerCase();
  try {
    if (!normalized || normalized === 'identity') return buffer;
    const options = { maxOutputLength: MAX_ARTICLE_SOURCE_BYTES };
    if (normalized === 'gzip' || normalized === 'x-gzip') return zlib.gunzipSync(buffer, options);
    if (normalized === 'deflate') return zlib.inflateSync(buffer, options);
    if (normalized === 'br') return zlib.brotliDecompressSync(buffer, options);
  } catch (error) {
    throw new ArticleImportError('fetch_failed', 'The article response could not be decoded.', 502);
  }
  throw new ArticleImportError('fetch_failed', 'The article used an unsupported transfer encoding.', 502);
}

function responseCharset(contentType, buffer) {
  const headerMatch = String(contentType || '').match(/charset\s*=\s*["']?([^;\s"']+)/iu);
  if (headerMatch) return headerMatch[1];
  const prefix = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('ascii');
  const metaMatch = prefix.match(/<meta[^>]+charset\s*=\s*["']?([^\s"'/>]+)/iu)
    || prefix.match(/<meta[^>]+content=["'][^"']*charset=([^\s;"']+)/iu);
  return metaMatch?.[1] || 'utf-8';
}

function decodeArticleText(buffer, contentType) {
  const charset = responseCharset(contentType, buffer).trim().toLowerCase();
  try {
    return new TextDecoder(charset).decode(buffer).replace(/^\uFEFF/, '');
  } catch (error) {
    return new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '');
  }
}

function requestArticleDocument(target, resolvedAddress) {
  return new Promise((resolve, reject) => {
    const transport = target.protocol === 'https:' ? https : http;
    const request = transport.request({
      protocol: target.protocol,
      hostname: resolvedAddress.address,
      family: Number(resolvedAddress.family),
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: `${target.pathname}${target.search}`,
      method: 'GET',
      servername: net.isIP(target.hostname) ? undefined : target.hostname,
      rejectUnauthorized: true,
      headers: {
        Host: target.host,
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'PaceFlow-Article-Importer/1.0 (+private reading tool)'
      }
    }, (remoteResponse) => {
      const chunks = [];
      let receivedBytes = 0;
      const declaredLength = Number(remoteResponse.headers['content-length'] || 0);
      if (declaredLength > MAX_ARTICLE_SOURCE_BYTES) {
        remoteResponse.destroy();
        reject(new ArticleImportError('too_large', 'The page is too large to import safely.', 413));
        return;
      }

      remoteResponse.on('data', (chunk) => {
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_ARTICLE_SOURCE_BYTES) {
          remoteResponse.destroy(new ArticleImportError('too_large', 'The page is too large to import safely.', 413));
          return;
        }
        chunks.push(chunk);
      });
      remoteResponse.on('end', () => resolve({
        statusCode: remoteResponse.statusCode || 0,
        headers: remoteResponse.headers,
        body: Buffer.concat(chunks)
      }));
      remoteResponse.on('error', reject);
    });

    request.setTimeout(ARTICLE_REQUEST_TIMEOUT_MS, () => {
      request.destroy(new ArticleImportError('timeout', 'The article host took too long to respond.', 504));
    });
    request.on('error', (error) => {
      if (error instanceof ArticleImportError) reject(error);
      else reject(new ArticleImportError('fetch_failed', 'The article could not be downloaded.', 502));
    });
    request.end();
  });
}

async function downloadArticleSource(initialTarget, options = {}) {
  let target = initialTarget;
  for (let redirectCount = 0; redirectCount <= MAX_ARTICLE_REDIRECTS; redirectCount++) {
    const resolvedAddress = await resolvePublicRemote(target, options.lookup);
    const remoteResponse = await (options.requestDocument || requestArticleDocument)(target, resolvedAddress);
    if ([301, 302, 303, 307, 308].includes(remoteResponse.statusCode)) {
      const location = remoteResponse.headers.location;
      if (!location || redirectCount === MAX_ARTICLE_REDIRECTS) {
        throw new ArticleImportError('too_many_redirects', 'The page redirected too many times.', 502);
      }
      target = normalizeArticleUrl(new URL(location, target).href);
      continue;
    }
    if (remoteResponse.statusCode < 200 || remoteResponse.statusCode >= 300) {
      throw new ArticleImportError('fetch_failed', `The article host returned HTTP ${remoteResponse.statusCode}.`, 502);
    }

    const contentType = String(remoteResponse.headers['content-type'] || '').toLowerCase();
    if (!/^(?:text\/(?:html|plain)|application\/xhtml\+xml)(?:;|$)/iu.test(contentType)) {
      throw new ArticleImportError('not_html', 'The link does not point to a readable web page.', 415);
    }
    const decodedBody = decodeArticleBody(remoteResponse.body, remoteResponse.headers['content-encoding']);
    if (decodedBody.length > MAX_ARTICLE_SOURCE_BYTES) {
      throw new ArticleImportError('too_large', 'The page is too large to import safely.', 413);
    }
    return {
      body: decodeArticleText(decodedBody, contentType),
      contentType,
      finalUrl: target.href
    };
  }
  throw new ArticleImportError('too_many_redirects', 'The page redirected too many times.', 502);
}

function normalizeExtractedArticleText(value) {
  return String(value || '')
    .replace(/\u00A0/gu, ' ')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n[ \t]+/gu, '\n')
    .replace(/[ \t]{2,}/gu, ' ')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}

function extractReadableArticle(source, sourceUrl, contentType = 'text/html') {
  if (contentType.startsWith('text/plain')) {
    const plainText = normalizeExtractedArticleText(source);
    if (plainText.split(/\s+/u).length < 10) {
      throw new ArticleImportError('unreadable', 'No readable article text was found.', 422);
    }
    return { title: new URL(sourceUrl).hostname, text: plainText, siteName: '' };
  }

  let dom;
  try {
    dom = new JSDOM(source, { url: sourceUrl, contentType: 'text/html' });
  } catch (error) {
    throw new ArticleImportError('unreadable', 'The web page could not be parsed.', 422);
  }
  const document = dom.window.document;
  const documentTitle = normalizeExtractedArticleText(document.title);
  let parsed = null;
  try {
    parsed = new Readability(document.cloneNode(true), { charThreshold: 160 }).parse();
  } catch (error) {
    parsed = null;
  }

  let text = normalizeExtractedArticleText(parsed?.textContent);
  if (text.split(/\s+/u).filter(Boolean).length < 10) {
    document.querySelectorAll('script, style, noscript, template, svg, canvas, nav, footer, form, aside').forEach((node) => node.remove());
    const fallbackRoot = document.querySelector('article, main, [role="main"]') || document.body;
    text = normalizeExtractedArticleText(fallbackRoot?.textContent);
  }
  if (text.length > MAX_ARTICLE_TEXT_CHARACTERS) {
    throw new ArticleImportError('too_large', 'The extracted article is too large to import safely.', 413);
  }
  if (text.split(/\s+/u).filter(Boolean).length < 10) {
    throw new ArticleImportError('unreadable', 'No readable article text was found.', 422);
  }

  return {
    title: normalizeExtractedArticleText(parsed?.title || documentTitle || new URL(sourceUrl).hostname).slice(0, 300),
    text,
    siteName: normalizeExtractedArticleText(parsed?.siteName).slice(0, 120)
  };
}

function articleCorsHeaders(request) {
  const origin = String(request.headers.origin || '');
  if (!ARTICLE_NATIVE_ENDPOINT_ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin'
  };
}

function articleClientAddress(request) {
  const directAddress = request.socket.remoteAddress || '';
  const isLoopbackProxy = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(directAddress);
  if (isLoopbackProxy) return String(request.headers['x-real-ip'] || directAddress).split(',')[0].trim();
  return directAddress;
}

function consumeArticleRateLimit(request) {
  const now = Date.now();
  const client = articleClientAddress(request) || 'unknown';
  const current = articleRateBuckets.get(client);
  if (!current || now - current.startedAt >= ARTICLE_RATE_WINDOW_MS) {
    if (articleRateBuckets.size >= ARTICLE_RATE_BUCKET_LIMIT) {
      for (const [address, bucket] of articleRateBuckets) {
        if (now - bucket.startedAt >= ARTICLE_RATE_WINDOW_MS) articleRateBuckets.delete(address);
      }
      while (articleRateBuckets.size >= ARTICLE_RATE_BUCKET_LIMIT) {
        articleRateBuckets.delete(articleRateBuckets.keys().next().value);
      }
    }
    articleRateBuckets.set(client, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= ARTICLE_RATE_LIMIT;
}

async function handleArticleImport(request, response) {
  const corsHeaders = articleCorsHeaders(request);
  if (request.method === 'OPTIONS') {
    if (request.headers.origin && !Object.keys(corsHeaders).length) {
      sendJson(response, 403, { error: 'Origin is not allowed.', code: 'origin_denied' });
      return;
    }
    response.writeHead(204, { 'Cache-Control': 'no-store', ...corsHeaders });
    response.end();
    return;
  }
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed', code: 'method_not_allowed' }, corsHeaders);
    return;
  }
  if (!consumeArticleRateLimit(request)) {
    sendJson(response, 429, { error: 'Too many article imports. Please wait and retry.', code: 'rate_limited' }, corsHeaders);
    return;
  }

  try {
    const body = await readRequestBody(request, MAX_ARTICLE_REQUEST_BYTES);
    const payload = JSON.parse(body || '{}');
    const target = normalizeArticleUrl(payload.url);
    const downloaded = await downloadArticleSource(target);
    const article = extractReadableArticle(downloaded.body, downloaded.finalUrl, downloaded.contentType);
    sendJson(response, 200, {
      ...article,
      sourceUrl: downloaded.finalUrl,
      wordCount: article.text.split(/\s+/u).filter(Boolean).length
    }, corsHeaders);
  } catch (error) {
    const knownError = error instanceof ArticleImportError
      ? error
      : new ArticleImportError('fetch_failed', 'The article could not be imported.', 502);
    sendJson(response, knownError.statusCode, { error: knownError.message, code: knownError.code }, corsHeaders);
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

  if (url.pathname === '/api/article' || url.pathname === '/rsvp/api/article') {
    await handleArticleImport(request, response);
    return;
  }

  sendStatic(request, response, url);
});

if (require.main === module) {
  const host = process.env.HOST || '127.0.0.1';
  server.listen(PORT, host, () => {
    console.log(`RSVP Reader listening on http://${host}:${PORT}`);
  });
}

module.exports = {
  ArticleImportError,
  downloadArticleSource,
  extractReadableArticle,
  isPublicRemoteAddress,
  normalizeArticleUrl,
  resolvePublicRemote,
  server
};
