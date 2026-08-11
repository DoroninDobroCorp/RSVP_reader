const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ArticleImportError,
  ArticleRateLimiter,
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

test('special IPv4 and IPv6 transition ranges never pass the global-unicast gate', () => {
  const blockedIpv4 = [
    '0.0.0.0', '100.64.0.1', '192.0.0.1', '198.18.0.1', '224.0.0.1', '255.255.255.255'
  ];
  const blockedIpv6 = [
    '::',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    '64:ff9b:1::7f00:1',
    '64:ff9b:1::a00:1',
    '2002:7f00:1::',
    '2002:a00:1::',
    '2001::1',
    '2001:10::1',
    '2001:20::1',
    '::192.0.2.1',
    'fec0::1'
  ];
  blockedIpv4.forEach((address) => assert.equal(isPublicRemoteAddress(address, 4), false, address));
  blockedIpv6.forEach((address) => assert.equal(isPublicRemoteAddress(address, 6), false, address));
  assert.equal(isPublicRemoteAddress('8.8.8.8', 4), true);
  assert.equal(isPublicRemoteAddress('2606:4700:4700::1111', 6), true);
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

test('article download connects only to the address returned by the validated DNS snapshot', async () => {
  const pinned = [];
  const result = await downloadArticleSource(normalizeArticleUrl('https://pin.example/story'), {
    lookup: async () => [{ address: '93.184.216.34', family: 4 }],
    requestDocument: async (target, resolvedAddress) => {
      pinned.push({ host: target.hostname, ...resolvedAddress });
      return {
        statusCode: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
        body: Buffer.from('This public article has enough words to pass the local readability threshold safely.')
      };
    }
  });
  assert.equal(result.finalUrl, 'https://pin.example/story');
  assert.deepEqual(pinned, [{ host: 'pin.example', address: '93.184.216.34', family: 4 }]);
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

function fakeClock() {
  let current = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    now: () => current,
    setTimer(callback, delay) {
      const handle = { id: nextId++, unref() {} };
      timers.set(handle, { at: current + delay, callback });
      return handle;
    },
    clearTimer(handle) {
      timers.delete(handle);
    },
    advance(milliseconds) {
      current += milliseconds;
      for (;;) {
        const due = [...timers.entries()]
          .filter(([, timer]) => timer.at <= current)
          .sort((left, right) => left[1].at - right[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        due[1].callback();
      }
    },
    timerCount: () => timers.size
  };
}

test('raw-IP rate buckets expire physically at the original deadline without retaining request data', () => {
  const clock = fakeClock();
  const limiter = new ArticleRateLimiter({
    windowMs: 100,
    limit: 2,
    maxBuckets: 2,
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer
  });

  assert.equal(limiter.consume('198.51.100.10'), true);
  assert.equal(limiter.buckets.has('198.51.100.10'), true);
  const originalDeadline = limiter.buckets.get('198.51.100.10').expiresAt;
  assert.deepEqual(
    Object.keys(limiter.buckets.get('198.51.100.10')).sort(),
    ['count', 'expiresAt', 'startedAt']
  );

  clock.advance(60);
  assert.equal(limiter.consume('198.51.100.10'), true);
  assert.equal(limiter.consume('198.51.100.10'), false);
  assert.equal(limiter.buckets.get('198.51.100.10').expiresAt, originalDeadline);

  clock.advance(40);
  assert.equal(limiter.buckets.has('198.51.100.10'), false);
  assert.equal(clock.timerCount(), 0);

  limiter.consume('198.51.100.11');
  limiter.consume('198.51.100.12');
  limiter.consume('198.51.100.13');
  assert.equal(limiter.buckets.size, 2);
  assert.deepEqual([...limiter.buckets.keys()], ['198.51.100.12', '198.51.100.13']);

  limiter.close();
  assert.equal(limiter.buckets.size, 0);
  assert.equal(clock.timerCount(), 0);
});
