const {test,expect}=require('@playwright/test');
const fs=require('fs');
test.use({serviceWorkers:'block',viewport:{width:390,height:844},hasTouch:true});

// A small synthetic book: four chapters, footnotes written the way FB2 stores them.
function fb2(withNotes=true){
 const filler=n=>Array.from({length:n},(_,i)=>'Quiet'+(i%7)+' words keep coming and the morning goes on.').join(' ');
 const note=(n,id)=>withNotes?'<a l:href="#'+id+'" type="note">['+n+']</a>':'';
 const section=(n,extra='')=>'<section><title><p>Chapter '+n+'</p></title><p>'+filler(60)+extra+'</p><p>'+filler(60)+'</p><p>'+filler(60)+'</p></section>';
 const notes='<body name="notes"><section id="n1"><title><p>1</p></title><p>First note text.</p></section><section id="n2"><title><p>2</p></title><p>Second note text.</p></section></body>';
 return Buffer.from('<?xml version="1.0" encoding="UTF-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink"><description><title-info><book-title>Notes book</book-title></title-info></description><body>'
  +section(1)+section(2,' The poem ends here'+note(1,'n1')+'.')+section(3,' Another line'+note(2,'n2')+'.')+section(4)+'</body>'+(withNotes?notes:'')+'</FictionBook>');
}
async function open(page,lang='en'){
 await page.goto('/lite.html?lang='+lang);
 await expect(page.locator('body')).toHaveAttribute('data-ready','true');
}
async function importBook(page,buffer=fb2()){
 await page.locator('#fileInput').setInputFiles({name:'Notes book.fb2',mimeType:'application/octet-stream',buffer});
 await expect(page.locator('#normalReadingSection')).toBeVisible();
}
const word=(page,index)=>page.locator('#normalTextDisplay [data-index="'+index+'"]');

test('speed reading is named for what it is, not for one word at a time',async({page})=>{
 await open(page,'ru');await importBook(page);
 await expect(page.locator('#startRSVPBtn')).toHaveText(/Быстрое чтение/);
 await page.locator('#startRSVPBtn').click();
 await expect(page.locator('#rsvpReadingSection')).toBeVisible();
 await expect(page.locator('#rsvpReadingSection')).not.toContainText(/По одному слову|One word at a time/);
 await expect(page.locator('.focus-mode-label')).toHaveCount(0);
});

test('speed-reading stop point is saved; text offers return or start from here',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);await importBook(page);
 // No stop yet: one quiet button.
 await expect(page.locator('#resumeRSVPBtn')).toBeHidden();
 await expect(page.locator('#startRSVPBtn')).toHaveText(/Speed reading/);
 // Read a little by speed reading, then stop.
 await word(page,60).click();
 await page.locator('#startRSVPBtn').click();
 await page.locator('#playPauseBtn').click();
 await expect.poll(()=>page.evaluate(()=>rsvpReader.currentIndex)).toBeGreaterThan(64);
 await page.locator('#playPauseBtn').click();
 const stop=await page.evaluate(()=>rsvpReader.currentIndex);
 await page.locator('#stopRSVPBtn').click();
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 expect(await page.evaluate(()=>rsvpReader.rsvpIndex)).toBe(stop);
 // Right after returning, the place and the stop are the same: still one button.
 await expect(page.locator('#resumeRSVPBtn')).toBeHidden();
 // Read on in plain text, far from the stop: both options appear.
 await page.evaluate(()=>{rsvpReader.setCurrentWordIndex(900,{scroll:false});});
 await expect(page.locator('#resumeRSVPBtn')).toBeVisible();
 await expect(page.locator('#startRSVPBtn')).toHaveText(/From here/);
 await expect(page.locator('#resumeRSVPBtn')).toHaveAccessibleName(/Return to speed reading at \d+%/);
 // The stop survives a reload (stored with the book).
 await page.evaluate(()=>rsvpReader.persistReadingPosition());
 await page.locator('#backToInputBtn').click();await page.reload();
 await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await page.locator('#continueReadingCard').click();
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 expect(await page.evaluate(()=>rsvpReader.rsvpIndex)).toBe(stop);
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBe(900);
 // Return: speed reading continues at the stop, the text position follows it.
 await page.locator('#resumeRSVPBtn').click();
 await expect(page.locator('#rsvpReadingSection')).toBeVisible();
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBe(stop);
 await page.locator('#stopRSVPBtn').click();
 await expect(page.locator('#resumeRSVPBtn')).toBeHidden();
 // From here: starts at the text position and does not touch the saved stop until it really reads.
 await page.evaluate(()=>{rsvpReader.setCurrentWordIndex(900,{scroll:false});});
 await page.locator('#startRSVPBtn').click();
 expect(await page.evaluate(()=>rsvpReader.currentIndex)).toBe(900);
 await page.locator('#stopRSVPBtn').click();
 expect(await page.evaluate(()=>rsvpReader.rsvpIndex)).toBe(stop);
 expect(errors).toEqual([]);
});

test('the two entries and the contents sheet fit an iPhone and read clearly',async({page},testInfo)=>{
 await open(page,'ru');await importBook(page);
 await page.evaluate(()=>{rsvpReader.rsvpIndex=60;rsvpReader.setCurrentWordIndex(4900,{scroll:false});rsvpReader.renderNormalText({anchorIndex:4900});});
 const footer=page.locator('.text-footer');
 await expect(page.locator('#resumeRSVPBtn')).toBeVisible();
 const box=await footer.boundingBox();
 for(const id of ['#pagePrevBtn','#resumeRSVPBtn','#startRSVPBtn','#pageNextBtn','#liteTocBtn']){
  const b=await page.locator(id).boundingBox();
  expect(b.x,id).toBeGreaterThanOrEqual(box.x-1);expect(b.x+b.width,id).toBeLessThanOrEqual(box.x+box.width+1);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 await footer.screenshot({path:testInfo.outputPath('footer-split.png')});
 await page.locator('#liteTocBtn').click();
 await expect(page.locator('#tocModal')).toBeVisible();
 const here=page.locator('#tocList .toc-button.current');
 await expect(here).toHaveCount(1);
 await expect(here).toContainText('Chapter 4');
 await expect(here.locator('.toc-tag.here')).toHaveText('Вы здесь');
 const stopped=page.locator('#tocList .toc-button.stopped');
 await expect(stopped).toHaveCount(1);
 await expect(stopped).toContainText('Chapter 1');
 await expect(stopped.locator('.toc-tag.stop')).toContainText('Остановка быстрого чтения');
 // The title and the position line no longer run together on one line.
 const t=await stopped.locator('.toc-title').boundingBox(),m=await stopped.locator('.toc-meta').boundingBox();
 expect(m.y).toBeGreaterThan(t.y+t.height-1);
 await page.locator('#tocModal .sheet').screenshot({path:testInfo.outputPath('contents.png')});
 // Choosing a chapter keeps the stop where it was.
 await stopped.click();
 await expect(page.locator('#tocModal')).toBeHidden();
 expect(await page.evaluate(()=>rsvpReader.rsvpIndex)).toBe(60);
});

test('footnotes: quiet markers, readable note, no marker flashed while speed reading',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);await importBook(page,fb2(true));
 expect(await page.evaluate(()=>rsvpReader.currentNotes.length)).toBe(2);
 const buttons=page.locator('#normalTextDisplay .inline-note');
 await expect(buttons).toHaveCount(2);
 await expect(buttons.first()).toHaveText('[1]');
 await expect(buttons.first()).toHaveAccessibleName(/Note \[1\]/);
 await expect(page.locator('#normalTextDisplay [data-index]').filter({hasText:'[1]'})).toHaveCount(0);
 await buttons.first().scrollIntoViewIfNeeded();
 await buttons.first().click();
 await expect(page.locator('#liteNoteModal')).toBeVisible();
 await expect(page.locator('#liteNoteText')).toHaveText('First note text.');
 await page.locator('#liteNoteClose').click();
 // Speed reading does not flash the marker as part of the word.
 const flashed=await page.evaluate(()=>{
  const n=rsvpReader.currentNotes[0];const frame=rsvpReader.getFrameAt(n.wordIndex);
  return {token:rsvpReader.words[n.wordIndex],shown:frame.text};
 });
 expect(flashed.token).toContain('[1]');
 expect(flashed.shown).not.toContain('[');
 expect(errors).toEqual([]);
});

test('opening the very same file again adds its footnotes to the book already on the shelf',async({page})=>{
 await open(page);
 await importBook(page,fb2(true));
 await page.locator('#backToInputBtn').click();
 const book=await page.evaluate(async()=>{
  const b=rsvpReader.library[0];
  // Make it look like an import from before footnotes were understood, read to word 700.
  await rsvpReader.mutateBook(b.id,latest=>({...latest,notes:[],currentIndex:700,rsvpIndex:100}),{bookGeneration:rsvpReader.getBookWriteGeneration(b.id)});
  await rsvpReader.loadLibrary();
  rsvpReader.currentIndex=700;rsvpReader.rsvpIndex=100;rsvpReader.currentNotes=[];
  return {id:b.id};
 });
 await page.locator('#fileInput').setInputFiles({name:'Notes book.fb2',mimeType:'application/octet-stream',buffer:fb2(true)});
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 const after=await page.evaluate(()=>({count:rsvpReader.library.length,id:rsvpReader.currentBookId,notes:rsvpReader.currentNotes.length,index:rsvpReader.currentIndex,rsvp:rsvpReader.rsvpIndex}));
 expect(after).toEqual({count:1,id:book.id,notes:2,index:700,rsvp:100});
 await expect(page.locator('.toast').first()).toContainText('Footnotes added');
});

for(const lang of ['en','ru','es'])for(const width of [320,375,390,430]){
 test('return and from-here buttons fit without overlap: '+lang+' '+width,async({page})=>{
  await page.setViewportSize({width,height:780});
  await open(page,lang);await importBook(page);
  await page.evaluate(()=>{rsvpReader.rsvpIndex=100;rsvpReader.setCurrentWordIndex(1500,{scroll:false});});
  await expect(page.locator('#resumeRSVPBtn')).toBeVisible();
  const footer=await page.locator('.text-footer').boundingBox();
  const rects=[];
  for(const id of ['#pagePrevBtn','#resumeRSVPBtn','#startRSVPBtn','#pageNextBtn','#liteTocBtn']){
   const b=await page.locator(id).boundingBox();rects.push({id,left:b.x,right:b.x+b.width});
   expect(b.x,id).toBeGreaterThanOrEqual(footer.x-1);expect(b.x+b.width,id).toBeLessThanOrEqual(footer.x+footer.width+1);
  }
  for(let i=1;i<rects.length;i++)expect(rects[i].left,rects[i-1].id+' / '+rects[i].id).toBeGreaterThanOrEqual(rects[i-1].right-0.5);
 });
}

for(const [name,size] of [['portrait',{width:390,height:844}],['short landscape',{width:844,height:390}]]){
 test('on pause the word where reading stopped sits in the middle of the context block: '+name,async({page})=>{
  await page.setViewportSize(size);
  await open(page);await importBook(page);
  for(const index of [2000,4200]){
   await page.evaluate(i=>{rsvpReader.setCurrentWordIndex(i,{scroll:false});},index);
   await page.locator('#startRSVPBtn').click();
   await expect(page.locator('#rsvpPauseContext .pause-current')).toHaveCount(1);
   await expect.poll(async()=>page.evaluate(()=>{
    const pane=document.getElementById('rsvpPauseContext'),current=pane.querySelector('.pause-current');
    const p=pane.getBoundingClientRect(),c=current.getBoundingClientRect();
    return Math.round(Math.abs((c.top+c.height/2)-(p.top+p.height/2)));
   }),{message:'distance of the stopped word from the middle of the block'}).toBeLessThanOrEqual(16);
   await page.locator('#stopRSVPBtn').click();
  }
 });
}
