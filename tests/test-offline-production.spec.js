const { test, expect } = require('@playwright/test');

test('the installed app shell reopens without a network connection', async ({ page, context }) => {
  await page.goto(`/?offline-production=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async () => {
    await window.rsvpReader.ready;
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });

  // Reload once online so this page is controlled by the freshly installed
  // worker, then prove a navigation succeeds with the network disabled.
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-i18n="textOrBook"]:visible').first()).toHaveText(/Start reading|Начать чтение/);
    await expect(page.locator('#offlineBadge')).toContainText(/Offline|Офлайн|local|локально/i);
    await page.locator('#tryDemoBtn').click();
    await expect(page.locator('#rsvpReadingSection')).toBeVisible();
    await expect(page.locator('#rsvpBookTitle')).toHaveText('A quiet reading demo');
  } finally {
    await context.setOffline(false);
  }
});

test('navigating to a text asset cannot poison the cached offline app shell', async ({ page, context }) => {
  await page.goto(`/?offline-poison=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async () => {
    await window.rsvpReader.ready;
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

  await page.goto('/sample_text.txt');
  await expect(page.locator('body')).toContainText('Chapter One');
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#textInput')).toBeVisible();
    await expect(page.locator('[data-i18n="textOrBook"]:visible').first()).toHaveText(/Start reading|Начать чтение/);
  } finally {
    await context.setOffline(false);
  }
});

test('VAL-R3-PWA-002 / VAL-R4-PWA-002: Service worker registers with trailing slash scope under /rsvp/ without SecurityError', async ({ page }) => {
  await page.goto(`/rsvp/?offline-subpath-sw=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async () => {
    await window.rsvpReader.ready;
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });

  const swDetails = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration('/rsvp/');
    return reg ? { scope: reg.scope, active: Boolean(reg.active) } : null;
  });

  expect(swDetails).not.toBeNull();
  expect(swDetails.scope).toMatch(/\/rsvp\/?$/);
  expect(swDetails.active).toBe(true);

  // Reload once online to acquire controller status under /rsvp/
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  const hasController = await page.evaluate(() => Boolean(navigator.serviceWorker?.controller));
  expect(hasController).toBe(true);
});

test('VAL-R3-PWA-003 / VAL-R4-PWA-003: Offline PWA navigation under subpath /rsvp/ renders app shell', async ({ page, context }) => {
  await page.goto(`/rsvp/?offline-subpath-app=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async () => {
    await window.rsvpReader.ready;
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });

  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-i18n="textOrBook"]:visible').first()).toHaveText(/Start reading|Начать чтение/);
    await expect(page.locator('#offlineBadge')).toContainText(/Offline|Офлайн|local|локально/i);
    await page.locator('#tryDemoBtn').click();
    await expect(page.locator('#rsvpReadingSection')).toBeVisible();
    await expect(page.locator('#rsvpBookTitle')).toHaveText('A quiet reading demo');
  } finally {
    await context.setOffline(false);
  }
});

test('VAL-R3-PWA-003 / VAL-R4-PWA-003: Localized legal content renders offline under root /', async ({ page, context }) => {
  await page.goto(`/?offline-legal-install=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async () => {
    await window.rsvpReader.ready;
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

  await context.setOffline(true);
  try {
    await page.goto('/privacy.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Privacy Policy|HummingRead/i);

    await page.goto('/ru/privacy.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Политика конфиденциальности/i);

    await page.goto('/es/privacy.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Política de privacidad/i);

    await page.goto('/support.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Support|HummingRead/i);
  } finally {
    await context.setOffline(false);
  }
});

test('VAL-R3-PWA-003 / VAL-R4-PWA-003: Localized legal content renders offline under subpath /rsvp/', async ({ page, context }) => {
  await page.goto(`/rsvp/?offline-subpath-legal=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async () => {
    await window.rsvpReader.ready;
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

  await context.setOffline(true);
  try {
    await page.goto('/rsvp/privacy.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Privacy Policy|HummingRead/i);

    await page.goto('/rsvp/ru/privacy.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Политика конфиденциальности/i);

    await page.goto('/rsvp/es/privacy.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Política de privacidad/i);
  } finally {
    await context.setOffline(false);
  }
});

test('VAL-R5-PWA-001: Offline PWA navigation without trailing slash (/rsvp and /rsvp/ru) renders localized app shell', async ({ page, context }) => {
  await page.goto(`/rsvp/?offline-subpath-noslash=${Date.now()}`);
  await page.waitForFunction(() => Boolean(window.rsvpReader));
  await page.evaluate(async () => {
    await window.rsvpReader.ready;
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });

  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  try {
    await page.goto('/rsvp', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-i18n="textOrBook"]:visible').first()).toHaveText(/Start reading|Начать чтение/);
    await expect(page.locator('#offlineBadge')).toContainText(/Offline|Офлайн|local|локально/i);

    await page.goto('/rsvp/ru', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-i18n="textOrBook"]:visible').first()).toHaveText(/Начать чтение/);
  } finally {
    await context.setOffline(false);
  }
});

// Lite is a second entry point, not an offline fallback to the full UI.
for (const prefix of ['', '/rsvp']) {
  test('Lite reopens offline with its own UI and saved position at ' + (prefix || '/'), async ({page,context}) => {
    await page.goto(prefix + '/lite.html?lang=ru');
    await expect(page.locator('body')).toHaveAttribute('data-ready','true');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.locator('#tryDemoBtn').click();
    await expect(page.locator('#normalReadingSection')).toBeVisible();
    await page.locator('#normalTextDisplay [data-index="18"]').click();
    await page.locator('#backToInputBtn').click();
    await expect(page.locator('#continueReadingCard')).toBeVisible();
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    try {
      await page.goto(prefix + '/lite.html?lang=es');
      await expect(page.locator('body')).toHaveAttribute('data-ready','true');
      await expect(page.locator('body')).toHaveAttribute('data-reader-ui','lite');
      await expect(page.locator('html')).toHaveAttribute('lang','es');
      await page.locator('#continueReadingCard').click();
      await expect(page.locator('#normalReadingSection')).toBeVisible();
      expect(await page.evaluate(() => rsvpReader.currentIndex)).toBe(18);
      await page.locator('#startRSVPBtn').click();
      await expect.poll(() => page.evaluate(() => rsvpReader.currentIndex)).toBeGreaterThan(18);
      await page.locator('#playPauseBtn').click();
    } finally { await context.setOffline(false); }
  });
}

test('Lite first entry works under a legacy basename-fallback worker, then updates safely', async ({page}) => {
  const http = require('node:http');
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const root = path.join(__dirname,'..','dist');
  let currentWorker = false;
  const app = await fs.readFile(path.join(root,'app.js'),'utf8');
  const oldApp = app.replace(/window\.rsvpReader = document\.body\.dataset\.readerUi === 'lite' && window\.HummingReadLite[\s\S]*?\? new window\.HummingReadLite\(\) : new RSVPReader\(\);/u,'window.rsvpReader = new RSVPReader();');
  expect(oldApp).not.toBe(app);
  const oldBase = (await fs.readFile(path.join(root,'app-base-url.js'),'utf8')).replace('lite\\.html|','');
  const legacyWorker = `
self.addEventListener('install',event=>event.waitUntil(caches.open('hummingread-reader-v55').then(async cache=>{
 await cache.put('/app.js?v=55',await fetch('/__old-app.js'));
 await cache.put('/app-base-url.js?v=55',await fetch('/__old-base.js'));
}).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const pathname=new URL(event.request.url).pathname;
 if(pathname.endsWith('/app.js'))event.respondWith(caches.match('/app.js?v=55'));
 else if(pathname.endsWith('/app-base-url.js'))event.respondWith(caches.match('/app-base-url.js?v=55'));
 else event.respondWith(fetch(event.request));
});
`;
  const types={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.txt':'text/plain','.svg':'image/svg+xml'};
  const server=http.createServer(async(req,res)=>{
    try{
      const pathname=new URL(req.url,'http://localhost').pathname;
      let body;
      if(pathname==='/__legacy.html')body='<!doctype html><script>navigator.serviceWorker.register("/service-worker.js")</script>';
      else if(pathname==='/service-worker.js'&&!currentWorker)body=legacyWorker;
      else if(pathname==='/__old-app.js')body=oldApp;
      else if(pathname==='/__old-base.js')body=oldBase;
      else if(pathname==='/__legacy-lite.html'){
        body=(await fs.readFile(path.join(root,'lite.html'),'utf8')).replaceAll('lite-core.js','app.js').replaceAll('lite-base-url.js','app-base-url.js');
      }else{
        if(pathname.includes('..'))throw new Error('invalid path');
        body=await fs.readFile(path.join(root,pathname.endsWith('/')?pathname+'index.html':pathname));
      }
      res.writeHead(200,{'Content-Type':types[path.extname(pathname)]||'text/html','Cache-Control':'no-store'});res.end(body);
    }catch{res.writeHead(404);res.end('not found');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(origin+'/__legacy.html');await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
    // Negative control: the former shared filenames reproduce the public first-entry failure.
    await page.goto(origin+'/__legacy-lite.html?lang=ru');
    await expect.poll(()=>errors.some(message=>message.includes('addEventListener'))).toBe(true);
    errors.length=0;
    await page.goto(origin+'/lite.html?lang=ru');
    await expect(page.locator('body')).toHaveAttribute('data-ready','true');
    const oldCaches=await page.evaluate(()=>caches.keys());
    expect(oldCaches).toContain('hummingread-reader-v55');
    expect(oldCaches).not.toContain('hummingread-reader-v57');
    await expect(page.locator('html')).toHaveAttribute('lang','ru');
    currentWorker=true;
    const reloaded=page.waitForEvent('framenavigated',{predicate:frame=>frame===page.mainFrame()});
    await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
    await reloaded;
    await expect(page.locator('body')).toHaveAttribute('data-ready','true');
    await expect.poll(()=>page.evaluate(()=>caches.keys())).toContain('hummingread-reader-v57');
    expect(await page.evaluate(()=>caches.keys())).not.toContain('hummingread-reader-v55');
    await page.locator('#tryDemoBtn').click();await expect(page.locator('#normalReadingSection')).toBeVisible();
    await page.locator('#startRSVPBtn').click();await expect.poll(()=>page.evaluate(()=>rsvpReader.isPlaying)).toBe(true);
    expect(errors).toEqual([]);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
