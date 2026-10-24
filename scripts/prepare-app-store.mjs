import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { productConfig } from './product-config.mjs';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const destination = resolve(root,process.argv[2] || 'artifacts/app-store-connect');
const fields = {name:'name.txt',subtitle:'subtitle.txt',description:'description.txt',keywords:'keywords.txt',promotionalText:'promotional_text.txt'};
for (const locale of ['en-US','ru','es-ES']) {
  const data = JSON.parse(await readFile(join(root,'release/app-store',locale+'.json'),'utf8'));
  assert.equal(data.locale,locale);
  for (const [field,limit] of Object.entries({name:30,subtitle:30,description:4000,promotionalText:170})) {
    assert.equal(typeof data[field],'string',locale+' missing '+field);
    assert.ok(data[field].trim().length > 0 && Array.from(data[field]).length <= limit,locale+' '+field+' exceeds '+limit+' characters');
  }
  assert.ok(Buffer.byteLength(data.keywords,'utf8') <= 100,locale+' keywords exceed 100 UTF-8 bytes');
  assert.ok(data.keywords.split(',').every(v=>v.trim().length > 2),locale+' contains a keyword shorter than 3 characters');
  assert.ok(!/(?:https?:|<[^>]+>)/u.test(data.description),locale+' description must be plain text');
  const target=join(destination,locale); await mkdir(target,{recursive:true});
  for (const [key,file] of Object.entries(fields)) await writeFile(join(target,file),data[key]+'\n');
  const prefix=locale==='ru'?'ru/':locale==='es-ES'?'es/':'';
  await writeFile(join(target,'support_url.txt'),productConfig.urls.marketingSite+prefix+'support.html\n');
  await writeFile(join(target,'privacy_url.txt'),productConfig.urls.marketingSite+prefix+'privacy.html\n');
  await writeFile(join(target,'marketing_url.txt'),productConfig.website.baseUrl+prefix+'\n');
  await writeFile(join(target,'screenshot-headlines.txt'),data.screenshotHeadlines.map((v,i)=>(i+1)+'. '+v).join('\n')+'\n');
  console.log(locale+': name '+Array.from(data.name).length+'/30; subtitle '+Array.from(data.subtitle).length+'/30; keywords '+Buffer.byteLength(data.keywords,'utf8')+'/100 bytes; description '+Array.from(data.description).length+'/4000.');
}
console.log('Prepared copy/paste and fastlane-compatible metadata at '+destination+'. No upload was performed.');
