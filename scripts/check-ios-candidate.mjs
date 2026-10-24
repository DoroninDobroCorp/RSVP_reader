import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const out=join(root,'artifacts/ios-candidate'); await mkdir(out,{recursive:true});
const results=[];
const steps=[
 ['build-native','npm',['run','cap:sync']],
 ['unit','npm',['run','test:unit']],
 ['package','npm',['run','verify:package']],
 ['brand','npm',['run','verify:brand']],
 ['precache','npm',['run','verify:precache']],
 ['notices','npm',['run','verify:notices']],
 ['metadata','npm',['run','store:prepare']],
 ['store-copy','npm',['run','verify:store-copy']],
 ['ios-source','npm',['run','ios:verify-source']],
 ['security','npm',['audit','--audit-level=moderate']],
 ['isolation','npm',['run','test:isolation']],
 ['web-built','npm',['run','test:web-built']],
 ['browsers','npx',['playwright','test','tests/test-production-regressions.spec.js','tests/test-marketing.spec.js','--project=chromium','--project=webkit','--project=mobile-safari']],
 ['offline','npm',['run','test:offline']],
 ['extension','npm',['run','test:extension']],
 ['determinism','npm',['run','verify:determinism']]
];
const sha=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();
for(const [id,cmd,args] of steps){
 const started=new Date().toISOString();
 const r=spawnSync(cmd,args,{cwd:root,encoding:'utf8',env:{...process.env,PLAYWRIGHT_WORKERS:process.env.PLAYWRIGHT_WORKERS||'3'},maxBuffer:30*1024*1024});
 const log=join(out,id+'.log'); await writeFile(log,(r.stdout||'')+(r.stderr||'')+(r.error?'\n'+r.error.stack:''));
 results.push({id,cmd,args,started,ended:new Date().toISOString(),exitCode:r.status,status:r.status===0?'PASS':'FAIL',log});
 console.log(id+': '+results.at(-1).status+' (exit '+r.status+')');
 if(r.status!==0)break;
}
const summary={sourceSha:sha,checkedAt:new Date().toISOString(),platform:process.platform,results,planned:steps.length,executed:results.length,webChecksPassed:results.length===steps.length&&results.every(r=>r.status==='PASS'),nativeReleaseStatus:'BLOCKED',nativeGates:['Current-Xcode build and Analyze','Developer membership and signing','Physical iPhone/iPad and TestFlight QA','Actual localized screenshots','App Store Connect declarations and App Review']};
await writeFile(join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log('Native App Store release remains BLOCKED until account, Xcode, device and review gates are completed.');
process.exit(summary.webChecksPassed?2:1);
