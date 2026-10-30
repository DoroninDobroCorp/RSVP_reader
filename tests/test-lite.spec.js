const {test,expect,devices}=require('@playwright/test');
const JSZip=require('jszip');
const text='A quiet morning begins with a good book. '.repeat(80);
test.use({serviceWorkers:'block',viewport:{width:390,height:844},hasTouch:true});

async function open(page,lang='en'){
 await page.goto('/lite.html?lang='+lang);
 await expect(page.locator('body')).toHaveAttribute('data-ready','true');
}
async function paste(page,title='A quiet morning',content=text){
 await page.locator('#litePasteBtn').click();
 await page.locator('#litePasteTitle').fill(title);
 await page.locator('#litePasteText').fill(content);
 await page.locator('#litePasteSubmit').click();
 await expect(page.locator('#normalReadingSection')).toBeVisible();
}
async function sample(ext){
 const plain='A quiet morning begins here. More words in a small book.';
 if(ext==='txt')return Buffer.from(plain);
 if(ext==='html')return Buffer.from('<!doctype html><html><body><h1>A quiet morning</h1><p>'+plain+'</p></body></html>');
 if(ext==='md')return Buffer.from('# A quiet morning\n\n'+plain);
 if(ext==='rtf')return Buffer.from('{\\rtf1\\ansi '+plain+'}');
 if(ext==='fb2')return Buffer.from('<?xml version="1.0" encoding="UTF-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0"><description><title-info><book-title>Quiet</book-title></title-info></description><body><section><title><p>Morning</p></title><p>'+plain+'</p></section></body></FictionBook>');
 const zip=new JSZip();
 if(ext==='docx'){
  zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'+plain+'</w:t></w:r></w:p></w:body></w:document>');
 }else{
  zip.file('mimetype','application/epub+zip',{compression:'STORE'});
  zip.file('META-INF/container.xml','<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file('OEBPS/content.opf','<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">lite-fixture</dc:identifier><dc:title>A quiet morning</dc:title><dc:language>en</dc:language></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="chapter"/></spine></package>');
  zip.file('OEBPS/chapter.xhtml','<html xmlns="http://www.w3.org/1999/xhtml"><body><h1 id="morning">Morning</h1><p>'+plain+'</p></body></html>');
  zip.file('OEBPS/nav.xhtml','<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml#morning">Morning</a></li></ol></nav></body></html>');
 }
 return zip.generateAsync({type:'nodebuffer'});
}

test('Lite starts with books and add actions without a full-reader link',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page,'ru');
 await expect(page.locator('#textInputSection')).toBeVisible();
 await expect(page.locator('.home-header button')).toHaveCount(1);
 await expect(page.locator('#liteEmpty')).toBeVisible();
 await expect(page.locator('.pico-hero,.flow-map,.product-story,.dock-grid')).toHaveCount(0);
 await expect(page.locator('.full-version')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 expect(errors).toEqual([]);
});

test('Lite reading, playback, rewind and exact position survive reload and full-reader round trip',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);await paste(page);
 await page.locator('#normalTextDisplay [data-index="30"]').click();
 await page.locator('#startRSVPBtn').click();
 expect(await page.evaluate(()=>rsvpReader.isPlaying)).toBe(false);
 await page.locator('#playPauseBtn').click();
 await expect.poll(()=>page.evaluate(()=>rsvpReader.isPlaying)).toBe(true);
 expect(await page.evaluate(()=>rsvpReader.getFrameAt(8).lexicalWordCount)).toBe(1);
 expect(await page.evaluate(()=>rsvpReader.settings.chunkingEnabled)).toBe(true);
 await expect.poll(()=>page.evaluate(()=>rsvpReader.currentIndex)).toBeGreaterThan(30);
 await page.locator('#playPauseBtn').click();
 const paused=await page.evaluate(()=>rsvpReader.currentIndex);
 await page.waitForTimeout(250);
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBe(paused);
 await page.locator('#nextWordBtn').click();await expect(page.locator('#rsvpWpmLabel')).toContainText('370');
 await page.locator('#prevWordBtn').click();await expect(page.locator('#rsvpWpmLabel')).toContainText('350');
 await page.locator('#rewindWordsBtn').click();
 const saved=await page.evaluate(()=>rsvpReader.currentIndex);expect(saved).toBeLessThan(paused);
 await page.locator('#stopRSVPBtn').click();
 await expect(page.locator('#normalTextDisplay .current-word')).toHaveAttribute('data-index',String(saved));
 await page.locator('#backToInputBtn').click();await expect(page.locator('#continueReadingCard')).toBeVisible();
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await page.locator('#continueReadingCard').click();
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBe(saved);
 await page.goto('/');await page.waitForFunction(()=>window.rsvpReader);await page.evaluate(()=>rsvpReader.ready);
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBe(saved);
 expect(await page.evaluate(()=>rsvpReader.library.length)).toBe(1);
 await page.goto('/lite.html');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await page.locator('#continueReadingCard').click();
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBe(saved);
 expect(errors).toEqual([]);
});

for(const ext of ['txt','html','md','rtf','fb2','docx','epub']){
 test('Lite file picker imports and saves '+ext,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page);
  await page.locator('#fileInput').setInputFiles({name:'Quiet morning.'+ext,mimeType:'application/octet-stream',buffer:await sample(ext)});
  await expect(page.locator('#normalReadingSection')).toBeVisible();
  await expect(page.locator('#normalTextDisplay')).toContainText('A quiet morning begins here.');
  expect(await page.evaluate(()=>rsvpReader.library.length)).toBe(1);
  if(ext==='epub'){
   await page.locator('#liteTocBtn').click();
   await expect(page.locator('#tocModal')).toBeVisible();
   await expect(page.locator('#tocList')).toContainText('Morning');
   await page.locator('#closeTocBtn').click();
  }
  await page.locator('#backToInputBtn').click();
  await page.reload();await expect(page.locator('body')).toHaveAttribute('data-ready','true');
  await expect(page.locator('.book-open')).toHaveCount(1);
  expect(errors).toEqual([]);
 });
}

test('Lite settings are small, pause reading, persist and keep language on the Lite route',async({page})=>{
 await open(page);await paste(page);await page.locator('#startRSVPBtn').click();
 await page.locator('#liteFocusSettings').click();
 expect(await page.evaluate(()=>rsvpReader.isPlaying)).toBe(false);
 await expect(page.locator('.advanced-settings')).not.toHaveAttribute('open','');
 await expect(page.locator('#litePairing')).not.toBeVisible();
 await page.locator('#wpmInput').fill('240');
 await page.locator('#fontSizeInput').fill('24');
 await page.locator('#fontSansBtn').click();await page.locator('#themeNightBtn').click();
 await page.locator('[data-language=es]').click();
 await expect(page).toHaveURL(/lite.html\?lang=es/);
 await expect(page.locator('#settingsTitle')).toHaveText('A tu gusto');
 await page.locator('#closeSettingsBtn').click();await page.reload();
 await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await page.locator('#settingsBtn').click();
 await expect(page.locator('#wpmInput')).toHaveValue('240');
 await expect(page.locator('#fontSizeInput')).toHaveValue('24');
 await expect(page.locator('#fontSansBtn')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('html')).toHaveAttribute('data-theme','night');
 await page.keyboard.press('Escape');await expect(page.locator('#settingsModal')).not.toBeVisible();
});

test('Lite paste, rename and delete cancellation protect a second book and escape HTML titles',async({page})=>{
 await open(page);await paste(page,'<img src=x onerror=alert(1)>');
 await page.locator('#normalTextDisplay [data-index="35"]').click();
 await page.locator('#backToInputBtn').click();await paste(page,'Second book');
 await page.locator('#backToInputBtn').click();
 await expect(page.locator('.book-open')).toHaveCount(2);
 await expect(page.locator('.book-copy img')).toHaveCount(0);
 await page.locator('.book-more').first().click();await page.locator('#liteBookRename').click();
 await page.locator('#actionDialogInput').fill('Renamed book');await page.locator('#actionDialogConfirmBtn').click();
 await expect(page.locator('.book-open').first()).toContainText('Renamed book');
 await page.locator('.book-more').first().click();await page.locator('#liteBookRemove').click();
 await page.locator('#actionDialogCancelBtn').click();await expect(page.locator('.book-open')).toHaveCount(2);
 await page.locator('.book-more').first().click();await page.locator('#liteBookRemove').click();
 await page.locator('#actionDialogConfirmBtn').click();await expect(page.locator('.book-open')).toHaveCount(1);
 await page.locator('.book-open').click();
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBe(35);
});

test('Lite protects an unsaved full-reader draft before opening a different book',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>window.rsvpReader);await page.evaluate(()=>rsvpReader.ready);
 await page.locator('#textInput').fill('An important unsaved draft from the full reader.');
 await page.evaluate(()=>rsvpReader.saveDraft());
 await page.goto('/lite.html');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await page.locator('#tryDemoBtn').click();
 await expect(page.locator('#actionDialog')).toBeVisible();await page.locator('#actionDialogCancelBtn').click();
 expect(await page.evaluate(()=>rsvpReader.textInput.value)).toContain('important unsaved draft');
 expect(await page.evaluate(()=>rsvpReader.library.length)).toBe(0);
});

test('Lite backup downloads both books with their text and latest position intact',async({page})=>{
 await open(page);await paste(page,'Backup one');await page.locator('#backToInputBtn').click();await paste(page,'Backup two');
 await page.locator('#normalTextDisplay [data-index="22"]').click();
 await page.locator('#liteTextSettings').click();
 const downloading=page.waitForEvent('download');await page.locator('#settingsExportBtn').click();const download=await downloading;
 const fs=require('fs');const raw=fs.readFileSync(await download.path(),'utf8');const backup=JSON.parse(raw);
 expect(backup.books).toHaveLength(2);expect(backup.books.every(book=>book.text===text.trim())).toBe(true);
 expect(backup.books.find(book=>book.name==='Backup two').currentIndex).toBe(22);
});

test('Lite iPhone layouts fit portrait, short Safari viewport and landscape in every language',async({page},testInfo)=>{
 for(const lang of ['en','ru','es']){
  await open(page,lang);await paste(page,'Layout book',text+' pneumonoultramicroscopicsilicovolcanoconiosis');
  for(const size of [{width:320,height:568},{width:390,height:844},{width:390,height:660},{width:844,height:390}]){
   await page.setViewportSize(size);
   await page.evaluate(s=>{
    document.documentElement.style.setProperty('--safe-top',s.width===390?'47px':'0px');
    document.documentElement.style.setProperty('--safe-bottom',s.width===390?'34px':s.height<500?'21px':'0px');
    document.documentElement.style.setProperty('--safe-left',s.height<500?'47px':'0px');
    document.documentElement.style.setProperty('--safe-right',s.height<500?'47px':'0px');
   },size);
   const normal=await page.locator('#normalTextDisplay').boundingBox();
   expect(normal.height).toBeGreaterThan(size.height<500?180:320);
   await expect(page.locator('#startRSVPBtn')).toBeInViewport();
   await page.locator('#startRSVPBtn').click();await page.locator('#playPauseBtn').click();
   await page.evaluate(()=>rsvpReader.setCurrentWordIndex(rsvpReader.words.length-1));
   const fit=await page.locator('#rsvpWordDisplay').evaluate(el=>{
    const r=el.getBoundingClientRect();const spans=[...el.querySelectorAll('.orp-left,.orp-right,.orp-center')].filter(n=>n.textContent);
    return spans.every(n=>{const x=n.getBoundingClientRect();return x.left>=r.left-1&&x.right<=r.right+1;});
   });
   expect(fit).toBe(true);
   for(const id of ['playPauseBtn','rewindWordsBtn','prevWordBtn','nextWordBtn','stopRSVPBtn','liteFocusSettings']){
    const box=await page.locator('#'+id).boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
    if(size.height<500){expect(box.x).toBeGreaterThanOrEqual(47);expect(box.x+box.width).toBeLessThanOrEqual(size.width-47);}
    await expect(page.locator('#'+id)).toBeInViewport();
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const all=await page.locator('#rsvpReadingSection').evaluate(el=>el.getBoundingClientRect().bottom);
   expect(all).toBeLessThanOrEqual(size.height+1);
   await page.locator('#stopRSVPBtn').click();
  }
  await page.locator('#backToInputBtn').click();
 }
});

test('Lite remembers ordinary scroll reading without requiring a word tap',async({page},testInfo)=>{
 await open(page);await paste(page,'Scroll book',Array.from({length:90},(_,i)=>'Paragraph '+i+'. A quiet morning starts with a book.').join('\n\n'));
 await page.locator('#normalTextDisplay').hover();
 if(testInfo.project.name==='mobile-safari'){
  // Playwright cannot wheel mobile WebKit. This verifies the DOM touch path,
  // not a physical iOS swipe.
  await page.locator('#normalTextDisplay').evaluate(el=>{el.dispatchEvent(new Event('touchmove',{bubbles:true}));el.scrollBy(0,760);});
 }else await page.mouse.wheel(0,760);
 await expect.poll(()=>page.evaluate(()=>rsvpReader.currentIndex)).toBeGreaterThan(15);
 const index=await page.evaluate(()=>rsvpReader.currentIndex);
 await page.locator('#backToInputBtn').click();await page.reload();
 await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await page.locator('#continueReadingCard').click();await expect(page.locator('#normalReadingSection')).toBeVisible();
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBe(index);
 await expect(page.locator('#normalTextDisplay [role=button]')).toHaveCount(0);
});
