import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { productConfig } from './product-config.mjs';

// Android retains its existing full UI; the owner-selected iOS presentation
// has its own deterministic payload and shares the same storage/parser engine.
export async function buildIosReader(root) {
 const output=join(root,'dist-native-ios');
 await rm(output,{recursive:true,force:true});
 await cp(join(root,'dist-native'),output,{recursive:true});
 await rm(join(output,'android'),{recursive:true,force:true});
 if(productConfig.ios.readerUi==='lite'){
  const full=new JSDOM(await readFile(join(output,'index.html'),'utf8'));
  full.window.document.body.dataset.nativeReader='full';
  const home=full.window.document.getElementById('homeBtn');
  const link=full.window.document.createElement('a');
  for(const attr of home.attributes)if(attr.name!=='type')link.setAttribute(attr.name,attr.value);
  link.href='index.html';link.innerHTML=home.innerHTML;link.style.textDecoration='none';
  home.replaceWith(link);
  await writeFile(join(output,'full.html'),full.serialize());
  for(const name of ['lite.css','lite.js'])await cp(join(root,'dist',name),join(output,name));
  const lite=new JSDOM(await readFile(join(root,'dist/lite.html'),'utf8'));
  const doc=lite.window.document;
  doc.documentElement.dataset.platform='native';
  doc.body.dataset.nativeReader='lite';
  doc.title='HummingRead';
  doc.querySelector('meta[name="robots"]')?.remove();
  doc.querySelector('meta[name="description"]')?.setAttribute('content','HummingRead — private, local book reading.');
  doc.querySelector('.wordmark').href='index.html';
  doc.querySelector('.wordmark small')?.remove();
  for(const [key,nativeKey,text] of [['privacy','nativePrivacy','Books and progress stay on this device.'],['full','nativeFull','All tools'],['preview','nativePreview','HummingRead']]){
   doc.querySelectorAll('[data-lite="'+key+'"]').forEach(el=>{el.dataset.lite=nativeKey;el.textContent=text;});
  }
  doc.querySelectorAll('.full-version').forEach(el=>el.href='full.html');
  for(const script of doc.querySelectorAll('script[src]')){
   script.src=script.getAttribute('src').replace('lite-base-url.js','app-base-url.js').replace('lite-core.js','app.js');
  }
  await writeFile(join(output,'index.html'),lite.serialize());
 }
 const ios=join(root,'ios/App/App/public');
 await rm(ios,{recursive:true,force:true});
 await cp(output,ios,{recursive:true});
 console.log('Built iOS presentation: '+(productConfig.ios.readerUi||'full'));
}
