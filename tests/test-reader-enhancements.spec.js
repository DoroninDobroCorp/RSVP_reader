const {test, expect} = require('@playwright/test');
const JSZip = require('jszip');

test.use({serviceWorkers:'block', viewport:{width:390,height:844}});

async function ready(page) {
 await page.goto('/lite.html?lang=ru');
 await expect(page.locator('body')).toHaveAttribute('data-ready','true');
}
async function openText(page,text) {
 await page.locator('#litePasteBtn').click();
 await page.locator('#litePasteText').fill(text);
 await page.locator('#litePasteSubmit').click();
 await expect(page.locator('#normalReadingSection')).toBeVisible();
}
async function epubFixture() {
 const zip=new JSZip();
 zip.file('META-INF/container.xml','<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/book.opf"/></rootfiles></container>');
 zip.file('OEBPS/book.opf','<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Notes</dc:title></metadata><manifest><item id="text" href="text.xhtml" media-type="application/xhtml+xml"/><item id="notes" href="notes.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="text"/></spine></package>');
 zip.file('OEBPS/text.xhtml','<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Book</title></head><body><h1 id="one">First chapter</h1><p>Reading<a epub:type="noteref" href="notes.xhtml#n1">[1]</a> continues quietly.</p><h1 id="two">Second chapter</h1><p>One two three four.</p></body></html>');
 zip.file('OEBPS/notes.xhtml','<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Notes</title></head><body><aside epub:type="footnote" id="n1"><p>A useful note.</p><script>alert(1)</script></aside></body></html>');
 zip.file('OEBPS/nav.xhtml','<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="text.xhtml#one">One</a></li><li><a href="text.xhtml#two">Two</a></li></ol></nav></body></html>');
 return zip.generateAsync({type:'nodebuffer'});
}

test('EPUB notes and navigation survive closing and reloading without executing book HTML',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
 await page.locator('#fileInput').setInputFiles({name:'notes.epub',mimeType:'application/epub+zip',buffer:await epubFixture()});
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 await expect(page.locator('.inline-note')).toHaveCount(1);
 await page.locator('.inline-note').click();
 await expect(page.locator('#liteNoteText')).toHaveText('A useful note.');
 await page.locator('#liteNoteClose').click();
 await page.locator('#liteTocBtn').click();
 await expect(page.locator('#tocList')).toContainText('One');
 await expect(page.locator('#tocList')).toContainText('Two');
 await page.locator('#tocList button').last().click();
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBeGreaterThan(0);
 await page.locator('#backToInputBtn').click();await page.reload();
 await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await page.locator('#continueReadingCard').click();
 await expect(page.locator('.inline-note')).toHaveCount(1);
 expect((await page.evaluate(async()=>rsvpReader.getBook(rsvpReader.currentBookId))).notes).toHaveLength(1);
 expect(errors).toEqual([]);
});

test('FB2 note opens and ordinary file text stays intact',async({page})=>{
 await ready(page);
 const fb2='<?xml version="1.0"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink"><body><section><title><p>Глава первая</p></title><p>Слово<a type="note" l:href="#n1">[1]</a> и текст.</p></section></body><body name="notes"><section id="n1"><title><p>1</p></title><p>Текст <a l:href="https://example.org">ссылки</a> в примечании.</p></section></body></FictionBook>';
 await page.locator('#fileInput').setInputFiles({name:'book.fb2',mimeType:'application/xml',buffer:Buffer.from(fb2)});
 await expect(page.locator('.inline-note')).toHaveCount(1);
 await page.locator('.inline-note').click();await expect(page.locator('#liteNoteText')).toContainText('Текст ссылки в примечании.');
});

test('consecutive EPUB notes remain in their original order',async({page})=>{
 const zip=await JSZip.loadAsync(await epubFixture());
 const chapter=await zip.file('OEBPS/text.xhtml').async('string');
 zip.file('OEBPS/text.xhtml',chapter.replace('[1]</a> continues','[1]</a><a epub:type="noteref" href="notes.xhtml#n2">[2]</a> continues'));
 const notes=await zip.file('OEBPS/notes.xhtml').async('string');
 zip.file('OEBPS/notes.xhtml',notes.replace('</body>','<aside epub:type="footnote" id="n2"><p>Second note.</p></aside></body>'));
 await ready(page);
 await page.locator('#fileInput').setInputFiles({name:'notes.epub',mimeType:'application/epub+zip',buffer:await zip.generateAsync({type:'nodebuffer'})});
 await expect(page.locator('.inline-note')).toHaveText(['[1]','[2]']);
 await page.locator('.inline-note').last().click();
 await expect(page.locator('#liteNoteText')).toHaveText('Second note.');
});

test('paused entry, reading context, paging, pairing and focus fitting',async({page})=>{
 await ready(page);
 const long='СверхвысокопревосходительствующимиБуквосочетаниямиДлинноеСлово';
 await openText(page,('Несколько коротких слов для чтения. ').repeat(160)+long+' Конец.');
 await page.locator('#pageNextBtn').click();
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBeGreaterThan(0);
 await page.locator('#startRSVPBtn').click();
 expect(await page.evaluate(()=>rsvpReader.isPlaying)).toBe(false);
 await expect(page.locator('#rsvpPauseContext')).toHaveAttribute('aria-hidden','false');
 await expect(page.locator('#liteFocusProgress')).toContainText('мин');
 expect(await page.locator('#rsvpPauseContext span').count()).toBeGreaterThan(30);
 await page.locator('#liteFocusSettings').click();
 await page.locator('.advanced-settings summary').click();
 await page.evaluate(()=>{rsvpReader.settings.chunkingEnabled=false;});
 await page.locator('#litePairing').check();
 expect(await page.evaluate(()=>rsvpReader.settings.litePairsEnabled)).toBe(true);
 expect(await page.evaluate(()=>rsvpReader.getFrameAt(rsvpReader.words.findIndex(w=>w==='слов')).lexicalWordCount)).toBe(2);
 await page.locator('#closeSettingsBtn').click();
 const measured=await page.evaluate((long)=>{
  const reader=window.rsvpReader, index=reader.words.findIndex(word=>word.includes(long));
  reader.currentIndex=index;reader.displayCurrentWord();
  const display=reader.rsvpWordDisplay.getBoundingClientRect();
  const frame=reader.rsvpWordDisplay.querySelector('.rsvp-word-frame');
  const rects=Array.from(frame.children).map(el=>{const r=document.createRange();r.selectNodeContents(el);return r.getBoundingClientRect();}).filter(r=>r.width);
  const focus=frame.querySelector('.focus-letter').getBoundingClientRect();
  return {left:Math.min(...rects.map(r=>r.left)),right:Math.max(...rects.map(r=>r.right)),min:display.left,max:display.right,axis:(focus.left+focus.width/2-display.left)/display.width,size:Number(frame.dataset.fittedFontSize),preferred:Number(frame.dataset.preferredFontSize)};
 },long);
 expect(measured.left).toBeGreaterThanOrEqual(measured.min-1);
 expect(measured.right).toBeLessThanOrEqual(measured.max+1);
 expect(measured.axis).toBeGreaterThan(.37);expect(measured.axis).toBeLessThan(.43);
 expect(measured.size).toBeLessThan(measured.preferred);
 const unaligned=await page.evaluate(()=>{
  rsvpReader.settings.orpAlignment=false;rsvpReader.displayCurrentWord();
  const frame=rsvpReader.rsvpWordDisplay.querySelector('.rsvp-word-frame');
  return {children:frame.children.length,fit:Number(frame.dataset.fittedFontSize),preferred:Number(frame.dataset.preferredFontSize)};
 });
 expect(unaligned.children).toBeLessThanOrEqual(3);expect(unaligned.fit).toBeLessThan(unaligned.preferred);
});

test('the library can be searched without hiding or changing saved books',async({page})=>{
 await ready(page);
 await page.evaluate(async()=>{
  await rsvpReader.addParsedBookToLibrary('First library book',{text:'A first book for a search.',chapters:[]},'text',{silent:true});
  await rsvpReader.addParsedBookToLibrary('Second library book',{text:'A second book for a search.',chapters:[]},'text',{silent:true});
  await rsvpReader.loadLibrary();
 });
 await page.locator('#liteLibrarySearchBtn').click();
 await page.locator('#librarySearchInput').fill('Second');
 await expect(page.locator('.book-open')).toHaveCount(1);
 await expect(page.locator('.book-open')).toContainText('Second');
 await page.locator('#librarySearchInput').fill('No such title');
 await expect(page.locator('#liteNoLibraryMatches')).toBeVisible();
 await page.locator('#liteLibrarySearchBtn').click();
 await expect(page.locator('.book-open')).toHaveCount(2);
 expect(await page.evaluate(()=>rsvpReader.library.length)).toBe(2);
});

test('advanced settings retain session statistics and can restore reading defaults',async({page})=>{
 await ready(page);await openText(page,'A little book with several words for this reading session. '.repeat(40));
 await page.locator('#startRSVPBtn').click();await page.locator('#liteFocusSettings').click();
 await page.locator('.advanced-settings summary').click();
 await expect(page.locator('#liteSessionStats')).toContainText('Сеанс');
 await expect(page.locator('#liteSessionStats')).toContainText('Цель');
 await page.locator('#wpmInput').fill('500');
 await page.locator('#litePairing').check();
 await page.locator('#resetSettingsBtn').click();
 expect(await page.evaluate(()=>({wpm:rsvpReader.settings.wpm,font:rsvpReader.settings.fontFamily,pairs:rsvpReader.settings.litePairsEnabled})))
  .toEqual({wpm:350,font:'serif',pairs:false});
 await expect(page.locator('#normalTextDisplay')).toContainText('A little book');
});

test('existing book can restore notes from its matching original without changing progress or bookmarks',async({page})=>{
 await ready(page);const original=await epubFixture();
 await page.locator('#fileInput').setInputFiles({name:'notes.epub',mimeType:'application/epub+zip',buffer:original});
 await expect(page.locator('.inline-note')).toHaveCount(1);
 const before=await page.evaluate(async()=>{
  const id=rsvpReader.currentBookId;
  await rsvpReader.mutateBook(id,book=>({...book,notes:[],currentIndex:3,bookmarks:[{id:'saved',name:'Saved',index:3,excerpt:'kept'}]}));
  await rsvpReader.loadLibrary();return id;
 });
 await page.locator('#backToInputBtn').click();
 const originalPosition=await page.evaluate(async id=>(await rsvpReader.getBook(id)).currentIndex,before);
 await page.locator('.book-more').click();
 let choice=page.waitForEvent('filechooser');await page.locator('#liteBookRefresh').click();
 await (await choice).setFiles({name:'different.txt',mimeType:'text/plain',buffer:Buffer.from('A completely different book.')});
 expect(await page.evaluate(async id=>(await rsvpReader.getBook(id)).notes.length,before)).toBe(0);
 await page.locator('.book-more').click();
 choice=page.waitForEvent('filechooser');await page.locator('#liteBookRefresh').click();
 await (await choice).setFiles({name:'notes.epub',mimeType:'application/epub+zip',buffer:original});
 await expect.poll(()=>page.evaluate(async id=>(await rsvpReader.getBook(id)).notes.length,before)).toBe(1);
 const saved=await page.evaluate(async id=>rsvpReader.getBook(id),before);
 expect(saved.id).toBe(before);expect(saved.bookmarks[0].id).toBe('saved');expect(saved.currentIndex).toBe(originalPosition);
});

test('compact contents menu supports search and persistent bookmarks',async({page})=>{
 await ready(page);await openText(page,'One two three four five needle six seven eight nine ten.');
 await page.locator('#normalTextDisplay [data-index="2"]').click();
 await page.locator('#liteTocBtn').click();await page.locator('#liteOpenBookmarks').click();
 await page.locator('#saveBookmarkBtn').click();await page.locator('#actionDialogInput').fill('My place');
 await page.locator('#actionDialogConfirmBtn').click();
 await expect(page.locator('#bookmarksList')).toContainText('My place');
 await page.locator('#closeBookmarksBtn').click();
 await page.locator('#liteTocBtn').click();await page.locator('#liteOpenSearch').click();
 await page.locator('#searchInput').fill('needle');await page.locator('#liteSearchForm button').click();
 await expect(page.locator('#searchResults')).toContainText('1 / 1');
 await page.locator('#liteSearchClose').click();
 await expect(page.locator('#normalTextDisplay .search-current')).toContainText('needle');
 await page.locator('#backToInputBtn').click();await page.reload();await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await page.locator('#continueReadingCard').click();await page.locator('#liteTocBtn').click();await page.locator('#liteOpenBookmarks').click();
 await expect(page.locator('#bookmarksList')).toContainText('My place');
});


test('DOCX footnotes and endnotes open without changing the original prose',async({page})=>{
 await ready(page);const zip=new JSZip();
 zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Section 1</w:t><w:footnoteReference w:id="2"/><w:t> and more.</w:t><w:endnoteReference w:id="3"/></w:r></w:p></w:body></w:document>');
 zip.file('word/footnotes.xml','<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:id="2"><w:p><w:r><w:t>Footnote content.</w:t></w:r></w:p></w:footnote></w:footnotes>');
 zip.file('word/endnotes.xml','<w:endnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:endnote w:id="3"><w:p><w:r><w:t>Endnote content.</w:t></w:r></w:p></w:endnote></w:endnotes>');
 await page.locator('#fileInput').setInputFiles({name:'notes.docx',mimeType:'application/octet-stream',buffer:await zip.generateAsync({type:'nodebuffer'})});
 await expect(page.locator('.inline-note')).toHaveCount(2);
 await expect(page.locator('#normalTextDisplay')).toContainText('Section 1');
 await page.locator('.inline-note').first().click();await expect(page.locator('#liteNoteText')).toHaveText('Footnote content.');
 await page.locator('#liteNoteClose').click();await page.locator('.inline-note').last().click();await expect(page.locator('#liteNoteText')).toHaveText('Endnote content.');
});

test('page controls cross long-book rendering boundaries without losing place',async({page})=>{
 await ready(page);await openText(page,Array.from({length:9000},(_,i)=>'word'+i).join(' '));
 const edge=await page.evaluate(()=>{const pane=rsvpReader.normalTextDisplay;pane.scrollTop=pane.scrollHeight;return rsvpReader.renderWindowEnd;});
 await page.locator('#pageNextBtn').click();
 await expect.poll(()=>page.evaluate(()=>rsvpReader.currentIndex)).toBeGreaterThanOrEqual(edge-1);
 const current=await page.evaluate(()=>rsvpReader.currentIndex);
 await page.locator('#backToInputBtn').click();await page.reload();await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await page.locator('#continueReadingCard').click();
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBe(current);
});

test('time estimate is reused during adjacent word updates',async({page})=>{
 await ready(page);await openText(page,'one two three four five six seven eight nine ten '.repeat(100));
 await page.locator('#startRSVPBtn').click();
 const calls=await page.evaluate(()=>{
  let count=0;const original=rsvpReader.estimateEffectiveWpm.bind(rsvpReader);
  rsvpReader.estimateEffectiveWpm=(...args)=>{count++;return original(...args)};
  rsvpReader.liteEstimate=null;
  for(let i=0;i<30;i++){rsvpReader.currentIndex=i;rsvpReader.updateProgress();}
  return count;
 });
 expect(calls).toBe(1);
});
