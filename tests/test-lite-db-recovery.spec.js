const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block',viewport:{width:390,height:844},hasTouch:true});
const book=(title)=>Buffer.from('# '+title+'\n\n'+Array.from({length:30},(_,i)=>'Paragraph '+i+' of '+title+' keeps a quiet morning going.').join('\n\n'));
async function open(page){
 await page.goto('/lite.html');
 await expect(page.locator('body')).toHaveAttribute('data-ready','true');
}
test('a lost storage connection is reopened and the import still succeeds',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);
 await page.locator('#fileInput').setInputFiles({name:'First.md',mimeType:'text/markdown',buffer:book('First')});
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 await page.locator('#backToInputBtn').click();
 // iOS can drop the IndexedDB connection while the app idles in the background.
 await page.evaluate(()=>{rsvpReader.db.close();});
 await page.locator('#fileInput').setInputFiles({name:'Second.md',mimeType:'text/markdown',buffer:book('Second')});
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 await expect(page.locator('.toast.error')).toHaveCount(0);
 expect(await page.evaluate(()=>rsvpReader.library.map(b=>b.name).sort())).toEqual(['First','Second']);
 expect(await page.evaluate(()=>rsvpReader.storageMode)).toBe('indexeddb');
 // And it is really stored: it survives a reload.
 await page.locator('#backToInputBtn').click();await page.reload();
 await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await expect(page.locator('.book-open')).toHaveCount(2);
 expect(errors).toEqual([]);
});
test('a connection reported as closed is reopened before the next action',async({page})=>{
 await open(page);
 await page.locator('#fileInput').setInputFiles({name:'First.md',mimeType:'text/markdown',buffer:book('First')});
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 await page.locator('#backToInputBtn').click();
 await page.evaluate(()=>{const db=rsvpReader.db;db.close();rsvpReader.dbConnectionLost=true;});
 await page.locator('.book-open').first().click();
 await expect(page.locator('#normalReadingSection')).toBeVisible();
 await expect(page.locator('.toast.error')).toHaveCount(0);
 expect(await page.evaluate(()=>rsvpReader.dbConnectionLost)).toBe(false);
});
