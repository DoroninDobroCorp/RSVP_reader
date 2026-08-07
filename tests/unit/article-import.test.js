const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ArticleImportError,
  downloadArticleSource,
  extractReadableArticle,
  isPublicRemoteAddress,
  normalizeArticleUrl,
  resolvePublicRemote
} = require('../../server');

test('article URLs accept only credential-free HTTP(S) targets', () => {
  assert.equal(normalizeArticleUrl('https://example.com/story#comments').href, 'https://example.com/story');
  assert.throws(() => normalizeArticleUrl('file:///etc/passwd'), { code: 'invalid_url' });
  assert.throws(() => normalizeArticleUrl('https://user:secret@example.com/story'), { code: 'invalid_url' });
  assert.throws(() => normalizeArticleUrl('http://example.com:22/admin'), { code: 'invalid_url' });
  assert.throws(() => normalizeArticleUrl('not a URL'), { code: 'invalid_url' });
});

test('private, loopback, link-local and documentation addresses are blocked', () => {
  ['127.0.0.1', '10.0.0.8', '169.254.169.254', '172.31.4.5', '192.168.1.4', '203.0.113.8']
    .forEach((address) => assert.equal(isPublicRemoteAddress(address, 4), false, address));
  ['::1', 'fc00::1', 'fe80::1', '2001:db8::1']
    .forEach((address) => assert.equal(isPublicRemoteAddress(address, 6), false, address));
  assert.equal(isPublicRemoteAddress('93.184.216.34', 4), true);
  assert.equal(isPublicRemoteAddress('2606:2800:220:1:248:1893:25c8:1946', 6), true);
});

test('DNS answers are rejected if any returned address is private', async () => {
  const target = normalizeArticleUrl('https://mixed.example/story');
  await assert.rejects(
    resolvePublicRemote(target, async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 }
    ]),
    (error) => error instanceof ArticleImportError && error.code === 'private_address'
  );
});

test('every redirect target is resolved and checked again', async () => {
  const requestedHosts = [];
  await assert.rejects(
    downloadArticleSource(normalizeArticleUrl('https://public.example/story'), {
      lookup: async (hostname) => {
        if (hostname === 'public.example') return [{ address: '93.184.216.34', family: 4 }];
        return [{ address: '127.0.0.1', family: 4 }];
      },
      requestDocument: async (target) => {
        requestedHosts.push(target.hostname);
        return {
          statusCode: 302,
          headers: { location: 'http://private.example/admin' },
          body: Buffer.alloc(0)
        };
      }
    }),
    (error) => error instanceof ArticleImportError && error.code === 'private_address'
  );
  assert.deepEqual(requestedHosts, ['public.example']);
});

test('readability extraction keeps the article and drops navigation and scripts', () => {
  const article = extractReadableArticle(`<!doctype html><html><head>
    <title>Fallback title</title><script>window.secret = 'do not include';</script></head><body>
    <nav>Home Products Pricing Contact</nav>
    <article>
      <h1>A deliberate reading test</h1>
      <p>This opening paragraph contains enough useful words to identify the central article content reliably.</p>
      <p>The second paragraph adds context, preserves punctuation, and should remain available inside the reader.</p>
      <p>A final paragraph makes the sample long enough for the readability scoring algorithm to select it.</p>
    </article>
    <footer>Legal links and unrelated footer navigation</footer>
  </body></html>`, 'https://example.com/story');

  assert.match(article.title, /deliberate reading test|Fallback title/i);
  assert.match(article.text, /opening paragraph/);
  assert.match(article.text, /second paragraph/);
  assert.doesNotMatch(article.text, /window\.secret|Home Products Pricing/);
});
