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
  window.__nativeEvents=[];window.__nativeListeners={};window.__pickerResult={cancelled:true};
  const key=o=>(o.directory||'DATA')+':'+o.path;
  const filesystem={
   mkdir:async()=>({}),
   writeFile:async o=>{update('__ios_files',data=>data[key(o)]=o.data);return{};},
   readFile:async o=>{const data=read('__ios_files');if(!(key(o) in data))throw Error('not found');return{data:data[key(o)]};},
   deleteFile:async o=>{update('__ios_files',data=>delete data[key(o)]);},
   getUri:async o=>({uri:'file:///mock/'+o.path}),
   rmdir:async o=>{update('__ios_files',data=>Object.keys(data).forEach(k=>{if(k.startsWith((o.directory||'DATA')+':'+o.path))delete data[k];}));}
  };
  window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios',convertFileSrc:url=>url,Plugins:{
   Filesystem:filesystem,
   ReaderFiles:{pick:async()=>{window.__nativeEvents.push('files-picker');return window.__pickerResult;},finish:async()=>window.__nativeEvents.push('files-cleanup')},
   Preferences:{get:async o=>({value:read('__ios_prefs')[o.key]??null}),set:async o=>update('__ios_prefs',data=>data[o.key]=o.value),remove:async o=>update('__ios_prefs',data=>delete data[o.key])},
   App:{addListener:(name,fn)=>{window.__nativeListeners[name]=fn;return Promise.resolve({remove:async()=>{}});}},
   Haptics:{impact:async()=>{},selectionChanged:async()=>{}},
   KeepAwake:{keepAwake:async()=>window.__nativeEvents.push('awake'),allowSleep:async()=>window.__nativeEvents.push('sleep')},
   Share:{share:async payload=>{window.__sharePayload=payload;const data=read('__ios_files');window.__sharedBackup=JSON.parse(data['CACHE:backups/hummingread-backup.json']);}}
  }};
 });
});
async function ready(page){await expect(page.locator('body')).toHaveAttribute('data-ready','true');}

test('packaged iOS is minimal, has languages and does not expose the old full reader',async({page,request})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/index.html?lang=ru');await ready(page);
 await expect(page.locator('html')).toHaveAttribute('data-platform','native');
 await expect(page.locator('.wordmark small')).toHaveCount(0);
 await expect(page.locator('#litePrivacy')).toContainText('на этом устройстве');
 await page.locator('#settingsBtn').click();await page.locator('[data-language=es]').click();
 await expect(page.locator('#settingsTitle')).toHaveText('A tu gusto');
 await expect(page.locator('.full-version')).toHaveCount(0);
 expect((await request.get(origin+'/full.html')).status()).toBe(404);
 expect(errors).toEqual([]);
});

test('minimal iOS preserves an existing book, bookmark, position and preferences',async({page})=>{
 await page.goto(origin+'/index.html');await ready(page);
 await page.evaluate(async()=>{
  const text='Alpha one two three four five six seven eight nine ten. '.repeat(18);
  const saved=await rsvpReader.addParsedBookToLibrary('Existing native book',{text,chapters:[]},'text',{silent:true});
  await rsvpReader.mutateBook(saved.id,b=>({...b,currentIndex:17,bookmarks:[{id:'existing-marker',name:'Native marker',index:17,excerpt:'existing'}]}));
  rsvpReader.settings.wpm=270;rsvpReader.settings.fontFamily='mono';await rsvpReader.saveSettings();
  rsvpReader.setTheme('night');await rsvpReader.loadLibrary();await rsvpReader.nativeMutationQueue;
 });
 await page.reload();await ready(page);await page.locator('#continueReadingCard').click();
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBe(17);
 await expect(page.locator('html')).toHaveAttribute('data-reader-font','mono');
 await expect(page.locator('html')).toHaveAttribute('data-theme','night');
 const book=await page.evaluate(async()=>rsvpReader.getBook(rsvpReader.currentBookId));
 expect(book.bookmarks.find(b=>b.name==='Native marker').index).toBe(17);
 expect(await page.evaluate(()=>rsvpReader.settings.wpm)).toBe(270);
});

test('native import calls the document-only picker',async({page})=>{
 await page.goto(origin+'/index.html');await ready(page);
 await page.evaluate(()=>{window.__pickerResult={name:'native.txt',url:'data:application/octet-stream;base64,'+btoa('A native book with enough words to read.'),token:'fixture'};});
 await page.locator('#loadFileBtn').click();await expect(page.locator('#normalReadingSection')).toBeVisible();
 expect(await page.evaluate(()=>window.__nativeEvents)).toContain('files-picker');
 await expect.poll(()=>page.evaluate(()=>window.__nativeEvents.includes('files-cleanup'))).toBe(true);
 await expect(page.locator('#normalTextDisplay')).toContainText('A native book');
});

test('a pending native picker keeps its original import purpose',async({page})=>{
 await page.goto(origin+'/index.html');await ready(page);
 await page.evaluate(()=>{
  window.Capacitor.Plugins.ReaderFiles.pick=()=>new Promise(resolve=>{window.__resolvePicker=resolve;});
 });
 await page.locator('#loadFileBtn').click();
 await expect.poll(()=>page.evaluate(()=>Boolean(window.__resolvePicker))).toBe(true);
 await page.evaluate(()=>{rsvpReader.liteMenuBook='other-book';document.querySelector('#liteBookRefresh').click();});
 expect(await page.evaluate(()=>rsvpReader.liteRefreshBook)).toBe(null);
 await page.evaluate(()=>window.__resolvePicker({name:'ordinary.txt',url:'data:application/octet-stream;base64,'+btoa('The first selection remains a new book.'),token:'pending'}));
 await expect(page.locator('#normalTextDisplay')).toContainText('The first selection');
});

test('iOS lifecycle, native backup/share and mirror recovery use the minimal entry',async({page})=>{
 await page.goto(origin+'/index.html');await ready(page);await page.locator('#tryDemoBtn').click();
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 await page.locator('#normalTextDisplay [data-index="20"]').click();await page.locator('#startRSVPBtn').click();await page.locator('#playPauseBtn').click();
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

test('native note metadata is restored with the book after IndexedDB loss',async({page})=>{
 await page.goto(origin+'/index.html');await ready(page);
 const fb2='<?xml version="1.0"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink"><body><section><title><p>Chapter</p></title><p>Text<a type="note" l:href="#n1">[1]</a> continues.</p></section></body><body name="notes"><section id="n1"><p>Saved note text</p></section></body></FictionBook>';
 await page.evaluate(content=>{window.__pickerResult={name:'native.fb2',url:'data:application/octet-stream;base64,'+btoa(content),token:'fixture'};},fb2);
 await page.locator('#loadFileBtn').click();await expect(page.locator('.inline-note')).toHaveCount(1);
 await page.locator('#backToInputBtn').click();
 await page.evaluate(async()=>{
  await rsvpReader.nativeMutationQueue;rsvpReader.db.close();
  await new Promise((resolve,reject)=>{const req=indexedDB.deleteDatabase('rsvp-reader-db');req.onsuccess=resolve;req.onerror=()=>reject(req.error);});
  Object.keys(localStorage).filter(k=>k.startsWith('rsvp_')||k.startsWith('paceflow_')).forEach(k=>localStorage.removeItem(k));
 });
 await page.reload();await ready(page);await page.locator('#continueReadingCard').click();
 await expect(page.locator('.inline-note')).toHaveCount(1);await page.locator('.inline-note').click();
 await expect(page.locator('#liteNoteText')).toHaveText('Saved note text');
});
