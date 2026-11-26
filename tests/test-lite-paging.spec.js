const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block',viewport:{width:390,height:844},hasTouch:true});

// Synthetic books only. Paragraph and word lengths vary so lines wrap differently from page to page.
const VOCAB=['quiet','morning','river','of','lamps','and','window','a','silver','to','gentle','evening','by','road'];
const PARAGRAPHS=[48,77,61,90,35,66];
function paragraphs(words,notes=false){
 const out=[];let index=0,p=0,note=0;
 while(index<words){
  const count=Math.min(PARAGRAPHS[p++%PARAGRAPHS.length],words-index),part=[];
  for(let k=0;k<count;k++,index++){
   let token=VOCAB[(index*5+Math.floor(index/13))%VOCAB.length]+index;
   if(notes&&k===20&&p%2===0)token+='<a l:href="#n'+(++note)+'" type="note">['+note+']</a>';
   part.push(token);
  }
  out.push(part.join(' '));
 }
 return {paragraphs:out,notes:note};
}
const bookText=words=>paragraphs(words).paragraphs.join('\n\n');
function fb2(words){
 const book=paragraphs(words,true);
 const body='<body>'+book.paragraphs.map(p=>'<p>'+p+'</p>').join('')+'</body>';
 const notes='<body name="notes">'+Array.from({length:book.notes},(_,i)=>'<section id="n'+(i+1)+'"><title><p>'+(i+1)+'</p></title><p>Note '+(i+1)+' text.</p></section>').join('')+'</body>';
 return Buffer.from('<?xml version="1.0" encoding="UTF-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink"><description><title-info><book-title>Paging notes</book-title></title-info></description>'+body+notes+'</FictionBook>');
}

async function settle(page){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function openLite(page){
 await page.goto('/lite.html');
 await expect(page.locator('body')).toHaveAttribute('data-ready','true');
}
async function openBook(page,words){
 await openLite(page);
 await page.locator('#litePasteBtn').click();
 await page.locator('#litePasteTitle').fill('Paging book');
 await page.locator('#litePasteText').fill(bookText(words));
 await page.locator('#litePasteSubmit').click();
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 await settle(page);
}
async function openFb2(page,words){
 await openLite(page);
 await page.locator('#fileInput').setInputFiles({name:'Paging notes.fb2',mimeType:'application/octet-stream',buffer:fb2(words)});
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 await settle(page);
}
const scrollTo=async(page,where)=>{
 await page.evaluate(w=>{
  const view=rsvpReader.normalTextDisplay,max=view.scrollHeight-view.clientHeight;
  view.scrollTop=w==='top'?0:w==='bottom'?max:Math.floor(max*w);
 },where);
 await settle(page);
};

// What is on screen, measured, not inferred. A word is shorter than its line, so each line is the computed line
// height centred on its words. Words are grouped into lines in reading order; `first`/`last` are word indexes.
function SNAP(){
 const reader=window.rsvpReader,view=reader.normalTextDisplay,box=view.getBoundingClientRect();
 const style=getComputedStyle(view),lineHeight=parseFloat(style.lineHeight)||1.8*parseFloat(style.fontSize);
 const top=box.top,bottom=box.top+view.clientHeight,lines=[];
 let current=null;
 view.querySelectorAll('[data-index]').forEach(span=>{
  const index=Number(span.dataset.index);
  // The current word is underlined by a border and the full reader's words are padded: neither belongs to the line.
  const word=getComputedStyle(span),above=parseFloat(word.paddingTop)+parseFloat(word.borderTopWidth),below=parseFloat(word.paddingBottom)+parseFloat(word.borderBottomWidth);
  for(const rect of span.getClientRects()){
   const middle=(rect.top+above+rect.bottom-below)/2;
   if(middle<top-4*lineHeight||middle>bottom+4*lineHeight)continue;
   if(current&&Math.abs(middle-current.middle)<=lineHeight/2){
    current.sum+=middle;current.count++;current.middle=current.sum/current.count;current.last=index;
   }else{
    current={sum:middle,count:1,middle,first:index,last:index};lines.push(current);
   }
  }
 });
 const before=view.querySelector('.window-before'),after=view.querySelector('.window-after');
 const edge=element=>{if(!element)return null;const r=element.getBoundingClientRect();return {top:r.top-top,bottom:r.bottom-top};};
 return {
  scrollTop:view.scrollTop,max:view.scrollHeight-view.clientHeight,viewTop:top,viewBottom:bottom,lineHeight,height:view.clientHeight,
  start:reader.renderWindowStart,end:reader.renderWindowEnd,length:reader.words.length,current:reader.currentIndex,
  lines:lines.map(line=>({top:line.middle-lineHeight/2,bottom:line.middle+lineHeight/2,y:line.middle-lineHeight/2-top+view.scrollTop,first:line.first,last:line.last})),
  beforeButton:edge(before),afterButton:edge(after)
 };
}
const snap=page=>page.evaluate(SNAP);
const TOLERANCE=2;   // sub-pixel scroll positions and font metrics, the same slack the page turn allows
const FLUSH=3;       // how far from the edge a line may sit and still count as flush
const SEEN=3.5;      // less than this much of a line is not a visible line
const onScreen=(s,line)=>line.bottom>s.viewTop+SEEN&&line.top<s.viewBottom-SEEN;
const containing=(s,index)=>s.lines.find(line=>line.first<=index&&line.last>=index);
// Inside one window the text does not move, so a line is the same line when it sits at the same place in the text.
const sameLine=(s,line)=>s.lines.find(other=>Math.abs(other.y-line.y)<2);
const firstNotFullyVisible=s=>s.lines.findIndex(line=>line.bottom>s.viewBottom+TOLERANCE);
const firstFullyVisible=s=>s.lines.findIndex(line=>line.top>=s.viewTop-TOLERANCE);
const topLine=s=>s.lines.find(line=>line.bottom>s.viewTop+SEEN);
const bottomLine=s=>[...s.lines].reverse().find(line=>line.top<s.viewBottom-SEEN);

// The page after a forward turn starts with the first line that was not fully visible: flush at the top,
// no line that was already shown still visible, so nothing is read twice and nothing is skipped.
function expectForwardPage(before,after,label=''){
 const hiddenAt=firstNotFullyVisible(before);
 expect(hiddenAt,label+' a line below the view existed').toBeGreaterThan(0);
 const hidden=before.lines[hiddenAt],lastFull=before.lines[hiddenAt-1];
 const now=sameLine(after,hidden);
 expect(now,label+' the first unseen line is still rendered').toBeTruthy();
 if(after.scrollTop>=after.max-1){
  // the end of the window: the page cannot go further, the first unseen line is as high as it can be
  expect(now.top,label+' first unseen line is at or below the top').toBeGreaterThanOrEqual(after.viewTop-FLUSH);
 }else{
  expect(Math.abs(now.top-after.viewTop),label+' first unseen line is flush with the top').toBeLessThanOrEqual(FLUSH);
  expect(after.lines.filter(line=>line.y<hidden.y-2&&line.bottom>after.viewTop+SEEN).map(line=>[line.first,line.last]),
   label+' no already-read line stays visible').toEqual([]);
 }
 expect(lastFull.last,label+' the page before ended right where this one starts (a word wrapped over both lines is on both)').toBeLessThanOrEqual(hidden.first);
 return {hidden,lastFull,now};
}
// Backward is the mirror: the line right above the first fully visible one ends flush with the bottom edge and
// that first fully visible line is gone.
function expectBackwardPage(before,after,label=''){
 const shownAt=firstFullyVisible(before);
 expect(shownAt,label+' a line above the view existed').toBeGreaterThan(0);
 const shown=before.lines[shownAt],above=before.lines[shownAt-1];
 const now=sameLine(after,above);
 expect(now,label+' the line above is rendered').toBeTruthy();
 if(after.scrollTop<=1){
  expect(now.bottom,label+' the line above ends at or above the bottom').toBeLessThanOrEqual(after.viewBottom+FLUSH);
 }else{
  expect(Math.abs(now.bottom-after.viewBottom),label+' the line above ends flush with the bottom').toBeLessThanOrEqual(FLUSH);
  expect(after.lines.filter(line=>line.y>=shown.y-2&&line.top<after.viewBottom-SEEN).map(line=>[line.first,line.last]),
   label+' nothing of the old first line or after stays visible').toEqual([]);
 }
 return {shown,above,now};
}
const turn=async(page,direction)=>{
 await page.locator(direction>0?'#pageNextBtn':'#pagePrevBtn').click();
 await settle(page);
 return snap(page);
};
const readable=(page,index,step)=>page.evaluate(([i,s])=>rsvpReader.readableWordFrom(i,s),[index,step]);
const savedIndex=page=>page.evaluate(async()=>{
 const book=await rsvpReader.getBook(rsvpReader.currentBookId);return {saved:book.currentIndex,bookmark:Number(localStorage.getItem('rsvp_bookmark')),current:rsvpReader.currentIndex};
});

test('forward page turns inside a window start at the first unseen line, flush, with nothing repeated',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await openBook(page,3000);
 let state=await snap(page);
 expect(state.scrollTop).toBe(0);
 expect(state.start).toBe(0);
 for(let n=1;n<=10;n++){
  const next=await turn(page,1);
  expectForwardPage(state,next,'forward '+n+':');
  expect(next.start,'still the same window').toBe(0);
  expect(next.end).toBe(next.length);
  expect(next.scrollTop,'moved forward').toBeGreaterThan(state.scrollTop);
  const top=topLine(next);
  expect(next.current,'saved place is the first word at the top').toBeGreaterThanOrEqual(top.first);
  expect(next.current).toBeLessThanOrEqual(top.last);
  state=next;
 }
 await expect.poll(async()=>{const s=await savedIndex(page);return s.saved===s.current&&s.bookmark===s.current;},{message:'the position was saved'}).toBe(true);
 expect(errors).toEqual([]);
});

test('backward page turns mirror it, and forward then backward never overlaps or leaves a gap',async({page})=>{
 await openBook(page,3000);
 await scrollTo(page,'bottom');
 let state=await snap(page);
 for(let n=1;n<=8;n++){
  const next=await turn(page,-1);
  expectBackwardPage(state,next,'backward '+n+':');
  expect(next.scrollTop,'moved backward').toBeLessThan(state.scrollTop);
  state=next;
 }
 await scrollTo(page,0.4);
 const start=await snap(page);
 let forward=start;
 for(let n=1;n<=4;n++){
  const before=forward;
  forward=await turn(page,1);
  const {lastFull}=expectForwardPage(before,forward,'round trip forward '+n+':');
  const back=await turn(page,-1);
  // the page before is back: its last fully visible line ends the view again, the new top line is gone
  expect(Math.abs(bottomLine(back).y-lastFull.y),'round trip '+n+': the old last line ends the view').toBeLessThan(2);
  expect(Math.abs(bottomLine(back).bottom-back.viewBottom),'round trip '+n+': flush at the bottom').toBeLessThanOrEqual(FLUSH);
  expect(back.lines.filter(line=>line.y>=forward.lines[firstFullyVisible(forward)].y-2&&line.top<back.viewBottom-SEEN).length,'no gap, no overlap').toBe(0);
  forward=await turn(page,1); // and on again from the same place
 }
});

test('the ends of the book: the last page stops at the end, the first page stays at the start',async({page})=>{
 await openBook(page,1200);
 const first=await snap(page);
 const stay=await turn(page,-1);
 expect(stay.scrollTop).toBe(first.scrollTop);
 expect(stay.start).toBe(0);
 let state=first,guard=0;
 while(state.scrollTop<state.max-2&&guard++<80)state=await turn(page,1);
 expect(state.scrollTop).toBeGreaterThanOrEqual(state.max-2);
 const end=await turn(page,1);
 expect(end.scrollTop).toBe(state.scrollTop);
 expect(end.start).toBe(0);
 expect(end.end).toBe(end.length);
 expect(await page.locator('.text-window-button').count()).toBe(0);
});

test('window seam forward: the first line shown holds the first word that was never rendered',async({page})=>{
 await openBook(page,9000);
 let state=await snap(page);
 expect([state.start,state.end]).toEqual([0,4200]);
 // Go to the last pages of the window first, then turn across the seam.
 await page.evaluate(()=>{const view=rsvpReader.normalTextDisplay;view.scrollTop=view.scrollHeight-view.clientHeight-2.6*view.clientHeight;});
 await settle(page);
 state=await snap(page);
 let crossed=null;
 for(let n=0;n<8&&!crossed;n++){
  const next=await turn(page,1);
  if(next.start===state.start){expectForwardPage(state,next,'in the last pages '+n+':');state=next;continue;}
  crossed={before:state,after:next};
 }
 expect(crossed,'a turn crossed the window seam').toBeTruthy();
 const {before,after}=crossed;
 expect(before.scrollTop,'the old window was at its end').toBeGreaterThanOrEqual(before.max-2);
 const seam=await readable(page,before.end,1);
 const line=topLine(after);
 expect(line.first,'the first visible line starts at most one line before the seam word').toBeLessThanOrEqual(seam);
 expect(line.last).toBeGreaterThanOrEqual(seam);
 expect(seam-line.first,'only words of that one line repeat').toBeLessThan(15);
 expect(Math.abs(line.top-after.viewTop),'flush with the top').toBeLessThanOrEqual(FLUSH);
 expect(after.start,'the usual share of earlier text stays rendered above').toBeLessThanOrEqual(before.end-1000);
 expect(after.end).toBeGreaterThan(before.end+1000);
 expect(after.lines.filter(l=>l.last<seam&&l.first<line.first&&l.bottom>after.viewTop+SEEN),'nothing older is visible').toEqual([]);
 expect(after.beforeButton.bottom,'the show-earlier button is out of sight').toBeLessThan(0);
 expect(after.current,'the saved place follows the visible text').toBeGreaterThanOrEqual(line.first);
 expect(after.current).toBeLessThanOrEqual(line.last);
 await expect.poll(async()=>{const s=await savedIndex(page);return s.saved===s.current;},{message:'the position was saved'}).toBe(true);
 // And the next page continues from there, flush.
 const next=await turn(page,1);
 expectForwardPage(after,next,'after the seam:');
});

test('window seam backward: the last line shown holds the last word that was never rendered',async({page})=>{
 await openBook(page,9000);
 await page.evaluate(()=>rsvpReader.renderNormalText({anchorIndex:6000}));
 await settle(page);
 await scrollTo(page,'top');
 let state=await snap(page);
 expect(state.start).toBeGreaterThan(1000);
 const oldStart=state.start;
 // A page back from the very top of the window crosses it.
 const after=await turn(page,-1);
 const seam=await readable(page,oldStart-1,-1);
 const line=bottomLine(after);
 expect(after.start).toBeLessThan(oldStart);
 expect(line.last,'the last visible line ends at most one line after the seam word').toBeGreaterThanOrEqual(seam);
 expect(line.first).toBeLessThanOrEqual(seam);
 expect(line.last-seam,'only words of that one line repeat').toBeLessThan(15);
 expect(Math.abs(line.bottom-after.viewBottom),'flush with the bottom').toBeLessThanOrEqual(FLUSH);
 expect(after.end,'the usual share of later text stays rendered below').toBeGreaterThanOrEqual(oldStart+1000);
 expect(after.lines.filter(l=>l.first>line.last&&l.top<after.viewBottom-SEEN),'nothing later is visible').toEqual([]);
 await expect.poll(async()=>{const s=await savedIndex(page);return s.saved===s.current;},{message:'the position was saved'}).toBe(true);
 // And the next page back continues from there.
 const next=await turn(page,-1);
 expectBackwardPage(after,next,'after the backward seam:');
});

test('show later text: the first never-rendered word is on the first line, nothing skipped, twice in a row',async({page})=>{
 await openBook(page,9000);
 for(let round=1;round<=2;round++){
  await scrollTo(page,'bottom');
  const before=await snap(page);
  const oldEnd=before.end;
  expect(await page.locator('.window-after').isVisible()).toBe(true);
  await page.locator('.window-after').click();
  await settle(page);
  const after=await snap(page);
  const seam=await readable(page,oldEnd,1);
  const line=topLine(after);
  const label='show later '+round+': ';
  expect(line.first,label+'the first visible line starts at most one line before the old window end').toBeLessThanOrEqual(seam);
  expect(line.last,label+'it holds the old window end').toBeGreaterThanOrEqual(seam);
  expect(seam-line.first,label+'only words of that one line repeat').toBeLessThan(15);
  expect(Math.abs(line.top-after.viewTop),label+'flush with the top').toBeLessThanOrEqual(FLUSH);
  expect(after.start,label+'a cushion of earlier text is rendered').toBeLessThanOrEqual(oldEnd-1000);
  expect(after.start,label+'the usual 38% of the window lies before the first unseen word (last window is clamped)')
   .toBe(Math.min(oldEnd-Math.floor(4200*0.38),after.length-4200));
  expect(after.beforeButton.bottom,label+'the show-earlier button is out of sight').toBeLessThan(0);
  expect(after.current,label+'the saved place follows').toBeGreaterThanOrEqual(line.first);
  expect(after.current).toBeLessThanOrEqual(line.last);
  // No word between the old window and the first line is missing from the page.
  const gaps=await page.evaluate(()=>{
   const reader=rsvpReader,missing=[];
   for(let i=reader.renderWindowStart;i<reader.renderWindowEnd;i++)if(reader.isReadableToken(reader.words[i])&&!reader.wordSpans[i])missing.push(i);
   return missing;
  });
  expect(gaps,label+'every readable word of the new window is rendered').toEqual([]);
  await expect.poll(async()=>{const s=await savedIndex(page);return s.saved===s.current;},{message:'the position was saved'}).toBe(true);
 }
});

test('show earlier text: the word before the old window is on the last line, nothing skipped, with later text below',async({page})=>{
 await openBook(page,9000);
 await page.evaluate(()=>rsvpReader.renderNormalText({anchorIndex:8500}));
 await settle(page);
 for(let round=1;round<=2;round++){
  await scrollTo(page,'top');
  const before=await snap(page);
  const oldStart=before.start;
  expect(oldStart).toBeGreaterThan(0);
  expect(await page.locator('.window-before').isVisible()).toBe(true);
  await page.locator('.window-before').click();
  await settle(page);
  const after=await snap(page);
  const seam=await readable(page,oldStart-1,-1);
  const line=bottomLine(after);
  const label='show earlier '+round+': ';
  expect(line.last,label+'the last visible line ends at most one line after the word before the old window').toBeGreaterThanOrEqual(seam);
  expect(line.first).toBeLessThanOrEqual(seam);
  expect(line.last-seam,label+'only words of that one line repeat').toBeLessThan(15);
  expect(Math.abs(line.bottom-after.viewBottom),label+'flush with the bottom').toBeLessThanOrEqual(FLUSH);
  expect(after.end,label+'a cushion of later text is rendered').toBeGreaterThanOrEqual(oldStart+1000);
  expect(after.lines.filter(l=>l.first>line.last&&l.top<after.viewBottom-SEEN),label+'nothing later is visible').toEqual([]);
  const top=topLine(after),second=after.lines[after.lines.indexOf(top)+1];
  expect(after.current,label+'the saved place follows the top of the view').toBeGreaterThanOrEqual(top.first);
  expect(after.current).toBeLessThanOrEqual(second.last);
  const gaps=await page.evaluate(()=>{
   const reader=rsvpReader,missing=[];
   for(let i=reader.renderWindowStart;i<reader.renderWindowEnd;i++)if(reader.isReadableToken(reader.words[i])&&!reader.wordSpans[i])missing.push(i);
   return missing;
  });
  expect(gaps,label+'every readable word of the new window is rendered').toEqual([]);
  await expect.poll(async()=>{const s=await savedIndex(page);return s.saved===s.current;},{message:'the position was saved'}).toBe(true);
 }
});

test('show later on the last window keeps the clamp and still lands on the first unseen word',async({page})=>{
 await openBook(page,5000);
 await scrollTo(page,'bottom');
 const before=await snap(page);
 await page.locator('.window-after').click();
 await settle(page);
 const after=await snap(page);
 const seam=await readable(page,before.end,1);
 const line=topLine(after);
 expect(after.end).toBe(after.length);
 expect(after.end-after.start).toBe(4200);
 expect(await page.locator('.window-after').count()).toBe(0);
 expect(line.first).toBeLessThanOrEqual(seam);
 expect(line.last).toBeGreaterThanOrEqual(seam);
 expect(Math.abs(line.top-after.viewTop)).toBeLessThanOrEqual(FLUSH);
});

test('a window change makes one scroll adjustment, not two fighting each other',async({page})=>{
 await openBook(page,9000);
 await page.evaluate(()=>{
  const view=rsvpReader.normalTextDisplay,descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'scrollTop');
  window.__scrolls=[];
  const scrollTo=view.scrollTo.bind(view);
  view.scrollTo=(...args)=>{window.__scrolls.push('scrollTo');return scrollTo(...args);};
  Object.defineProperty(view,'scrollTop',{configurable:true,get(){return descriptor.get.call(view);},set(value){window.__scrolls.push('scrollTop');descriptor.set.call(view,value);}});
 });
 const count=async()=>{await settle(page);await page.waitForTimeout(150);return page.evaluate(()=>{const n=window.__scrolls.length;window.__scrolls=[];return n;});};
 await scrollTo(page,'bottom');await count();
 await page.locator('#pageNextBtn').click();
 expect(await count(),'page turn across the seam').toBe(1);
 await scrollTo(page,'bottom');await count();
 await page.locator('.window-after').click();
 expect(await count(),'show later').toBe(1);
 await scrollTo(page,'top');await count();
 await page.locator('.window-before').click();
 expect(await count(),'show earlier').toBe(1);
 await page.locator('#pageNextBtn').click();
 expect(await count(),'an ordinary page turn').toBe(1);
});

test('footnote markers do not move the lines: pages still start flush',async({page})=>{
 await openFb2(page,3000);
 expect(await page.locator('#normalTextDisplay .inline-note').count()).toBeGreaterThan(10);
 let state=await snap(page);
 for(let n=1;n<=8;n++){
  const next=await turn(page,1);
  expectForwardPage(state,next,'notes forward '+n+':');
  state=next;
 }
 for(let n=1;n<=4;n++){
  const next=await turn(page,-1);
  expectBackwardPage(state,next,'notes backward '+n+':');
  state=next;
 }
});

test('words longer than a line wrap over two lines without upsetting the pages',async({page})=>{
 await openLite(page);
 const long='https://example.com/'+'abcdefghij'.repeat(6);
 const text=bookText(2500).split(' ').map((word,i)=>i%23===7?long+i:word).join(' ');
 await page.locator('#litePasteBtn').click();
 await page.locator('#litePasteText').fill(text);
 await page.locator('#litePasteSubmit').click();
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 await settle(page);
 const wrapped=await page.evaluate(()=>[...document.querySelectorAll('#normalTextDisplay [data-index]')].filter(span=>span.getClientRects().length>1).length);
 expect(wrapped,'some words really wrap over two lines').toBeGreaterThan(10);
 let state=await snap(page);
 for(let n=1;n<=10;n++){
  const next=await turn(page,1);
  expectForwardPage(state,next,'long words forward '+n+':');
  state=next;
 }
 for(let n=1;n<=8;n++){
  const next=await turn(page,-1);
  expectBackwardPage(state,next,'long words backward '+n+':');
  state=next;
 }
});

// Swipes ---------------------------------------------------------------------------------------------------------
async function spyTurns(page){
 await page.evaluate(()=>{
  window.__turns=[];const original=rsvpReader.turnPage.bind(rsvpReader);
  rsvpReader.turnPage=direction=>{window.__turns.push(direction);return original(direction);};
 });
}
const turns=page=>page.evaluate(()=>window.__turns.slice());
async function swipe(page,dx,dy=0,end='touchEnd'){
 const box=await page.locator('#normalTextDisplay').boundingBox();
 const x=box.x+box.width/2,y=box.y+box.height/2,cdp=await page.context().newCDPSession(page);
 const send=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
 await send('touchStart',[{x,y}]);
 for(let step=1;step<=6;step++)await send('touchMove',[{x:x+dx*step/6,y:y+dy*step/6}]);
 await send(end,[]);
 await cdp.detach();
 await settle(page);
}
async function touches(page,steps){
 await page.evaluate(list=>{
  const view=document.getElementById('normalTextDisplay');
  const make=t=>new Touch({identifier:t.id,target:view,clientX:t.x,clientY:t.y});
  for(const step of list){
   const active=step.touches.map(make),changed=step.changed.map(make);
   view.dispatchEvent(new TouchEvent(step.type,{bubbles:true,cancelable:true,touches:active,targetTouches:active,changedTouches:changed}));
  }
 },steps);
 await settle(page);
}

test('swiping left and right turns the page exactly like the buttons; other gestures do nothing',async({page})=>{
 await openBook(page,3000);
 await spyTurns(page);
 await scrollTo(page,0.3);
 const start=await snap(page);
 // Left swipe = next page, right swipe = previous page.
 await swipe(page,-120,6);
 expect(await turns(page)).toEqual([1]);
 const bySwipe=await snap(page);
 expectForwardPage(start,bySwipe,'swipe left:');
 await scrollTo(page,0.3);
 const byButton=await turn(page,1);
 expect(Math.abs(byButton.scrollTop-bySwipe.scrollTop),'same page as the button (to the pixel the scroll position is rounded to)').toBeLessThanOrEqual(2);
 await swipe(page,120,-8);
 expect(await turns(page)).toEqual([1,1,-1]);
 const back=await snap(page);
 expectBackwardPage(byButton,back,'swipe right:');
 await scrollTo(page,0.3);
 const backByButton=await turn(page,-1);
 await scrollTo(page,0.3);
 await swipe(page,120,0);
 expect(Math.abs((await snap(page)).scrollTop-backByButton.scrollTop)).toBeLessThanOrEqual(2);
 // A mostly vertical gesture is a scroll, a short one is a tap or a drag: no page turn.
 const count=(await turns(page)).length;
 await swipe(page,-70,-140);
 await swipe(page,40,0);
 await swipe(page,-54,0);
 expect((await turns(page)).length,'vertical, short and just-too-short gestures').toBe(count);
 // A cancelled touch does not turn the page.
 await swipe(page,-120,0,'touchCancel');
 expect((await turns(page)).length).toBe(count);
});

test('a cancelled touch and a second finger forget the swipe start',async({page})=>{
 await openBook(page,3000);
 await spyTurns(page);
 await scrollTo(page,0.3);
 const mid=await page.evaluate(()=>{const r=document.getElementById('normalTextDisplay').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
 const at=(id,dx)=>({id,x:mid.x+dx,y:mid.y});
 // touch cancelled, then a stray touchend far to the left: nothing may turn
 await touches(page,[
  {type:'touchstart',touches:[at(1,0)],changed:[at(1,0)]},
  {type:'touchcancel',touches:[],changed:[at(1,-60)]},
  {type:'touchend',touches:[],changed:[at(1,-150)]}
 ]);
 expect(await turns(page),'cancelled touch').toEqual([]);
 // a second finger arrives; the finger that lifts is not the one the swipe started with
 await touches(page,[
  {type:'touchstart',touches:[at(1,0)],changed:[at(1,0)]},
  {type:'touchstart',touches:[at(1,0),at(2,10)],changed:[at(2,10)]},
  {type:'touchend',touches:[at(1,0)],changed:[at(2,-150)]},
  {type:'touchend',touches:[],changed:[at(1,-150)]}
 ]);
 expect(await turns(page),'second finger').toEqual([]);
 // and an ordinary one-finger swipe afterwards still works
 await touches(page,[
  {type:'touchstart',touches:[at(1,0)],changed:[at(1,0)]},
  {type:'touchend',touches:[],changed:[at(1,-150)]}
 ]);
 expect(await turns(page)).toEqual([1]);
});

// Different screens and type -------------------------------------------------------------------------------------
const screens=[{name:'390x844',width:390,height:844},{name:'375x667',width:375,height:667},{name:'320x568',width:320,height:568},{name:'844x390 landscape',width:844,height:390}];
const looks=[{name:'default'},{name:'large text',size:30},{name:'small text',size:18},{name:'sans typeface',sans:true},{name:'large sans',size:30,sans:true}];
for(const screen of screens)for(const look of looks){
 test('pages start flush on '+screen.name+', '+look.name,async({page})=>{
  await page.setViewportSize({width:screen.width,height:screen.height});
  await openBook(page,9000);
  await page.evaluate(()=>rsvpReader.renderNormalText({anchorIndex:4500}));
  await settle(page);
  if(look.size||look.sans){
   await page.locator('#liteTextSettings').click();
   if(look.size)await page.locator('#fontSizeInput').fill(String(look.size));
   if(look.sans)await page.locator('#fontSansBtn').click();
   await page.locator('#closeSettingsBtn').click();
   await settle(page);
   const applied=await page.evaluate(()=>({size:getComputedStyle(rsvpReader.normalTextDisplay).fontSize,family:getComputedStyle(rsvpReader.normalTextDisplay).fontFamily}));
   if(look.size)expect(parseFloat(applied.size)).toBe(look.size);
   if(look.sans)expect(applied.family).toMatch(/apple-system|Segoe|sans/i);
  }
  await scrollTo(page,0.25);
  let state=await snap(page);
  const pitch=state.lines[1].top-state.lines[0].top;
  expect(Math.abs(pitch-state.lineHeight)<1.5||pitch>state.lineHeight,'line pitch is the computed line height').toBe(true);
  for(let n=1;n<=5;n++){
   const next=await turn(page,1);
   expectForwardPage(state,next,screen.name+' '+look.name+' forward '+n+':');
   state=next;
  }
  for(let n=1;n<=4;n++){
   const next=await turn(page,-1);
   expectBackwardPage(state,next,screen.name+' '+look.name+' backward '+n+':');
   state=next;
  }
  // and across both seams at this size
  await scrollTo(page,'bottom');
  const lastPage=await snap(page);
  const crossed=await turn(page,1);
  const seam=await readable(page,lastPage.end,1);
  const line=topLine(crossed);
  expect(crossed.start).toBeGreaterThan(lastPage.start);
  expect(line.first).toBeLessThanOrEqual(seam);
  expect(line.last).toBeGreaterThanOrEqual(seam);
  expect(Math.abs(line.top-crossed.viewTop)).toBeLessThanOrEqual(FLUSH);
  await scrollTo(page,'top');
  const firstPage=await snap(page);
  const back=await turn(page,-1);
  const before=await readable(page,firstPage.start-1,-1);
  const last=bottomLine(back);
  expect(back.start).toBeLessThan(firstPage.start);
  expect(last.first).toBeLessThanOrEqual(before);
  expect(last.last).toBeGreaterThanOrEqual(before);
  expect(Math.abs(last.bottom-back.viewBottom)).toBeLessThanOrEqual(FLUSH);
 });
}

test('the line box model matches the browser: a zero-width probe at the top of a line sits where the model says',async({page})=>{
 await openBook(page,600);
 for(const style of [{},{size:30},{sans:true}]){
  if(style.size||style.sans){
   await page.locator('#liteTextSettings').click();
   if(style.size)await page.locator('#fontSizeInput').fill(String(style.size));
   if(style.sans)await page.locator('#fontSansBtn').click();
   await page.locator('#closeSettingsBtn').click();
   await settle(page);
  }
  const result=await page.evaluate(()=>{
   const view=rsvpReader.normalTextDisplay,style=getComputedStyle(view),lineHeight=parseFloat(style.lineHeight),diffs=[];
   // A probe aligned to the top of the line box and as tall as the line sits exactly on that line box.
   const measure=(span,lineStart)=>{
    const rect=span.getBoundingClientRect(),probe=document.createElement('span');
    probe.style.cssText='display:inline-block;width:0;height:'+lineHeight+'px;vertical-align:top';
    const model=rsvpReader.textLineBox(rect,lineHeight,span);
    // at the start of a line, no-wrap keeps the probe on the same line as its word
    if(lineStart)span.style.whiteSpace='nowrap';
    span.prepend(probe);
    const probeBox=probe.getBoundingClientRect();
    diffs.push({top:model.top-probeBox.top,bottom:model.bottom-probeBox.bottom,current:span.classList.contains('current-word')});
    probe.remove();span.style.whiteSpace='';
   };
   const spans=[...view.querySelectorAll('[data-index]')].slice(0,200);
   let lastTop=null;
   for(const span of spans){
    const rect=span.getBoundingClientRect();
    if(lastTop!==null&&Math.abs(rect.top-lastTop)<3)continue;
    lastTop=rect.top;measure(span,true);
    if(diffs.length>=25)break;
   }
   // The current word is underlined by a border, which must not move its line.
   measure(view.querySelector('.current-word'),true);
   // Words in the middle of a line too.
   spans.slice(10,40).forEach((span,i)=>{
    const previous=spans[10+i-1].getBoundingClientRect(),rect=span.getBoundingClientRect();
    measure(span,Math.abs(rect.top-previous.top)>3);
   });
   return {lineHeight,worstTop:Math.max(...diffs.map(d=>Math.abs(d.top))),worstBottom:Math.max(...diffs.map(d=>Math.abs(d.bottom))),n:diffs.length,
    current:diffs.filter(d=>d.current).length};
  });
  expect(result.current,'the current word was probed').toBeGreaterThan(0);
  expect(result.n).toBeGreaterThan(10);
  expect(result.worstTop,JSON.stringify(style)+' line top model').toBeLessThanOrEqual(1.01);
  expect(result.worstBottom,JSON.stringify(style)+' line bottom model').toBeLessThanOrEqual(1.01);
 }
});

test('opening a book places the current word in the middle of the view',async({page})=>{
 await openBook(page,3000);
 await page.evaluate(()=>{rsvpReader.setCurrentWordIndex(1500,{scroll:false});return rsvpReader.persistReadingPosition();});
 await page.locator('#backToInputBtn').click();
 await page.locator('#continueReadingCard').click();
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 await settle(page);
 const measured=await page.evaluate(()=>{
  const view=rsvpReader.normalTextDisplay,word=rsvpReader.wordSpans[rsvpReader.currentIndex],box=view.getBoundingClientRect(),rect=word.getBoundingClientRect();
  const lineHeight=parseFloat(getComputedStyle(view).lineHeight);
  return {index:rsvpReader.currentIndex,offset:(rect.top+rect.bottom)/2-box.top-view.clientHeight/2,lineHeight,parent:word.offsetParent&&word.offsetParent.id};
 });
 expect(measured.index).toBe(1500);
 expect(Math.abs(measured.offset),'distance of the current word from the vertical middle').toBeLessThanOrEqual(measured.lineHeight/2);
 // The same holds for a search hit: it is brought to the middle too.
 await page.locator('#liteTocBtn').click();
 await page.locator('#liteOpenSearch').click();
 const target=await readable(page,2300,1);
 await page.locator('#searchInput').fill(await page.evaluate(i=>rsvpReader.words[i],target));
 await page.locator('#liteSearchForm button[type=submit]').click();
 await expect.poll(()=>page.evaluate(()=>rsvpReader.currentIndex)).toBe(target);
 await page.locator('#liteSearchClose').click();
 await expect.poll(()=>page.evaluate(i=>{
  const view=rsvpReader.normalTextDisplay,word=rsvpReader.wordSpans[i],box=view.getBoundingClientRect(),rect=word.getBoundingClientRect();
  return Math.abs((rect.top+rect.bottom)/2-box.top-view.clientHeight/2);
 },target),{message:'search hit near the middle'}).toBeLessThanOrEqual(36);
});

// The full reader shares renderNormalText: its show-later / show-earlier buttons use the same placement. -------------
test('full reader: show later and show earlier land on the first unseen word',async({page})=>{
 await page.goto('/?paging='+Date.now());
 await page.waitForFunction(()=>Boolean(window.rsvpReader));
 await page.evaluate(()=>window.rsvpReader.ready);
 await page.locator('#textInput').fill(bookText(9000));
 await page.locator('#bookNameInput').fill('Paging full reader');
 await page.evaluate(()=>window.rsvpReader.startNormalReading());
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 await settle(page);
 await page.evaluate(()=>{const view=rsvpReader.normalTextDisplay;view.scrollTop=view.scrollHeight;});
 await settle(page);
 const before=await snap(page);
 await page.locator('.window-after').scrollIntoViewIfNeeded();
 await page.locator('.window-after').click();
 await settle(page);
 const after=await snap(page);
 const seam=await readable(page,before.end,1);
 const line=topLine(after);
 expect(line.first).toBeLessThanOrEqual(seam);
 expect(line.last).toBeGreaterThanOrEqual(seam);
 expect(seam-line.first).toBeLessThan(25);
 expect(Math.abs(line.top-after.viewTop)).toBeLessThanOrEqual(FLUSH+3);
 expect(after.start).toBeLessThanOrEqual(before.end-1000);
 await page.evaluate(()=>{rsvpReader.normalTextDisplay.scrollTop=0;});
 await settle(page);
 const old=await snap(page);
 await page.locator('.window-before').click();
 await settle(page);
 const earlier=await snap(page);
 const word=await readable(page,old.start-1,-1);
 const last=bottomLine(earlier);
 expect(last.first).toBeLessThanOrEqual(word);
 expect(last.last).toBeGreaterThanOrEqual(word);
 expect(last.last-word).toBeLessThan(25);
 expect(Math.abs(last.bottom-earlier.viewBottom)).toBeLessThanOrEqual(FLUSH+3);
 expect(earlier.end).toBeGreaterThanOrEqual(old.start+1000);
});
