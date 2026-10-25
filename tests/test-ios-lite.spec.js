const {test,expect}=require('@playwright/test');
const http=require('node:http');const fs=require('node:fs/promises');const path=require('node:path');
test.use({serviceWorkers:'block',viewport:{width:390,height:844}});
let server,origin;
test.beforeAll(async()=>{
 const root=path.resolve(__dirname,'../dist-native-ios');
 const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.txt':'text/plain','.json':'application/json'};
 server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');if(url.pathname.includes('..'))throw Error('invalid');
  const name=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const data=await fs.readFile(path.join(root,name));res.writeHead(200,{'Content-Type':types[path.extname(name)]||'text/plain'});res.end(data);
 }catch{res.writeHead(404);res.end('not found');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  const read=k=>JSON.parse(localStorage.getItem(k)||'{}');
  const update=(k,fn)=>{const data=read(k);fn(data);localStorage.setItem(k,JSON.stringify(data));};
  window.__nativeEvents=[];window.__nativeListeners={};
  const key=o=>(o.directory||'DATA')+':'+o.path;
  const filesystem={
   mkdir:async()=>({}),
   writeFile:async o=>{update('__ios_files',data=>data[key(o)]=o.data);return{};},
   readFile:async o=>{const data=read('__ios_files');if(!(key(o) in data))throw Error('not found');return{data:data[key(o)]};},
   deleteFile:async o=>{update('__ios_files',data=>delete data[key(o)]);},
   getUri:async o=>({uri:'file:///mock/'+o.path}),
   rmdir:async o=>{update('__ios_files',data=>Object.keys(data).forEach(k=>{if(k.startsWith((o.directory||'DATA')+':'+o.path))delete data[k];}));}
  };
  window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:{
   Filesystem:filesystem,
   Preferences:{get:async o=>({value:read('__ios_prefs')[o.key]??null}),set:async o=>update('__ios_prefs',data=>data[o.key]=o.value),remove:async o=>update('__ios_prefs',data=>delete data[o.key])},
   App:{addListener:(name,fn)=>{window.__nativeListeners[name]=fn;return Promise.resolve({remove:async()=>{}});}},
   Haptics:{impact:async()=>{},selectionChanged:async()=>{}},
   KeepAwake:{keepAwake:async()=>window.__nativeEvents.push('awake'),allowSleep:async()=>window.__nativeEvents.push('sleep')},
   Share:{share:async payload=>{window.__sharePayload=payload;const data=read('__ios_files');window.__sharedBackup=JSON.parse(data['CACHE:backups/hummingread-backup.json']);}}
  }};
 });
});
async function ready(page){await expect(page.locator('body')).toHaveAttribute('data-ready','true');}

test('packaged iOS defaults to minimal UI; local tools, languages and return navigation work',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/index.html?lang=ru');await ready(page);
 await expect(page.locator('html')).toHaveAttribute('data-platform','native');
 await expect(page.locator('.wordmark small')).toHaveCount(0);
 await expect(page.locator('#litePrivacy')).toContainText('на этом устройстве');
 await page.locator('#settingsBtn').click();await page.locator('[data-language=es]').click();
 await expect(page.locator('#settingsTitle')).toHaveText('A tu gusto');
 await expect(page.locator('.full-version').last()).toHaveAttribute('href','/full.html');
 await page.locator('.full-version').last().click();
 await expect(page.locator('body')).toHaveAttribute('data-native-reader','full');
 await page.waitForFunction(()=>window.rsvpReader);await page.evaluate(()=>rsvpReader.ready);
 await page.locator('#settingsBtn').click();await page.locator('#languageRuBtn').click();
 await expect(page).toHaveURL(/full.html$/);
 await page.locator('#closeSettingsBtn').click();await page.locator('#homeBtn').click();await ready(page);
 await expect(page).toHaveURL(/index.html$/);
 await expect(page.locator('html')).toHaveAttribute('lang','ru');expect(errors).toEqual([]);
});

test('minimal iOS entry keeps an existing full-reader book, bookmark, position and preferences',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/full.html');await page.waitForFunction(()=>window.rsvpReader);await page.evaluate(()=>rsvpReader.ready);
 await page.locator('#textInput').fill('Alpha one two three four five six seven eight nine ten. '.repeat(18));
 await page.locator('#bookNameInput').fill('Existing native book');await page.locator('#startReadingBtn').click();
 await page.locator('#normalTextDisplay [data-index="17"]').click();await page.locator('#addBookmarkBtn').click();
 await page.locator('#actionDialogInput').fill('Native marker');await page.locator('#actionDialogConfirmBtn').click();
 await expect(page.locator('#bookmarksList')).toContainText('Native marker');
 await page.locator('#settingsBtn').click();await page.locator('#wpmInput').fill('270');await page.locator('#fontMonoBtn').click();await page.locator('#themeNightBtn').click();await page.locator('#closeSettingsBtn').click();
 await page.evaluate(async()=>{await rsvpReader.persistReadingPosition();await rsvpReader.nativeMutationQueue;});
 await page.locator('#homeBtn').click();await ready(page);await page.locator('#continueReadingCard').click();
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBe(17);
 await expect(page.locator('html')).toHaveAttribute('data-reader-font','mono');await expect(page.locator('html')).toHaveAttribute('data-theme','night');
 const book=await page.evaluate(async()=>rsvpReader.getBook(rsvpReader.currentBookId));
 expect(book.bookmarks.find(b=>b.name==='Native marker').index).toBe(17);
 expect(await page.evaluate(()=>rsvpReader.settings.wpm)).toBe(270);
 await page.locator('#backToInputBtn').click();await page.reload();await ready(page);await page.locator('#continueReadingCard').click();
 await expect(page.locator('#normalReadingSection')).toBeVisible();expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBe(17);expect(errors).toEqual([]);
});

test('iOS lifecycle, native backup/share and mirror recovery use the minimal entry',async({page})=>{
 await page.goto(origin+'/index.html');await ready(page);await page.locator('#tryDemoBtn').click();
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 await page.locator('#normalTextDisplay [data-index="20"]').click();await page.locator('#startRSVPBtn').click();
 await expect.poll(()=>page.evaluate(()=>window.__nativeEvents.includes('awake'))).toBe(true);
 await page.evaluate(()=>window.__nativeListeners.pause());
 expect(await page.evaluate(()=>rsvpReader.isPlaying)).toBe(false);
 const position=await page.evaluate(()=>rsvpReader.currentIndex);
 await page.locator('#liteFocusSettings').click();await page.locator('#settingsExportBtn').click();
 await expect.poll(()=>page.evaluate(()=>Boolean(window.__sharePayload))).toBe(true);
 expect(await page.evaluate(()=>window.__sharedBackup.books[0].currentIndex)).toBe(position);
 await expect.poll(()=>page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('__ios_files'))).some(k=>k.startsWith('CACHE:backups/')))).toBe(false);
 await page.evaluate(async()=>{
  await rsvpReader.nativeMutationQueue;rsvpReader.db.close();
  await new Promise((resolve,reject)=>{const req=indexedDB.deleteDatabase('rsvp-reader-db');req.onsuccess=resolve;req.onerror=()=>reject(req.error);});
  Object.keys(localStorage).filter(k=>k.startsWith('rsvp_')||k.startsWith('paceflow_')).forEach(k=>localStorage.removeItem(k));
 });
 await page.reload();await ready(page);await expect(page.locator('.book-open')).toHaveCount(1);
 await page.locator('#continueReadingCard').click();await expect(page.locator('#normalReadingSection')).toBeVisible();
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBe(position);
});
