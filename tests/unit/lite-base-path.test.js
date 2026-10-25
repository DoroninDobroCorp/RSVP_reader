const {getAppBaseUrl,resolveAppPath}=require('../../app-base-url.js');
const test=require('node:test');
const assert=require('node:assert/strict');
test('Lite resolves shared parser, demos and worker at root and /rsvp/',()=>{
 for(const prefix of ['', '/rsvp']){
  const url='https://reader.example'+prefix+'/lite.html?lang=ru';
  assert.equal(getAppBaseUrl(url),prefix);
  assert.equal(resolveAppPath('service-worker.js',url),prefix+'/service-worker.js');
  assert.equal(resolveAppPath('sample_text_ru.txt',url),prefix+'/sample_text_ru.txt');
 }
});
