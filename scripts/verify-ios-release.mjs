import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { productConfig } from './product-config.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=(p)=>readFile(join(root,p),'utf8');
const [project,plist,privacy,spm,scheme,index,nativeConfig]=await Promise.all([
  read('ios/App/App.xcodeproj/project.pbxproj'),read('ios/App/App/Info.plist'),
  read('ios/App/App/PrivacyInfo.xcprivacy'),read('ios/App/CapApp-SPM/Package.swift'),
  read('ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme'),
  read('ios/App/App/public/index.html'),read('ios/App/App/capacitor.config.json')
]);
const config=JSON.parse(nativeConfig);
assert.equal(config.appId,productConfig.ios.currentBundleIdentifier);
assert.ok(!config.server?.url,'Native bundle must not load a remote website');
assert.ok(!config.server?.allowNavigation?.length,'Native bundle must not allow arbitrary remote navigation');
assert.ok(project.includes('PRODUCT_BUNDLE_IDENTIFIER = '+productConfig.ios.currentBundleIdentifier+';'));
assert.ok(project.includes('MARKETING_VERSION = '+productConfig.versions.ios+';'));
assert.ok(project.includes('CURRENT_PROJECT_VERSION = '+productConfig.versions.iosBuild+';'));
assert.ok(scheme.includes('BlueprintIdentifier="504EC3031FED79650016851F"') && scheme.includes('ArchiveAction buildConfiguration="Release"'));
assert.ok(/<key>NSPrivacyTracking<\/key>\s*<false\/>/u.test(privacy));
assert.ok(/<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\/>/u.test(privacy));
assert.ok(/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/u.test(plist));
for (const locale of ['en','ru','es']) assert.ok(plist.includes('<string>'+locale+'</string>'));
const capacitorVersion=JSON.parse(await read('node_modules/@capacitor/ios/package.json')).version;
assert.ok(spm.includes('exact: "'+capacitorVersion+'"'),'SwiftPM Capacitor pin must match installed iOS package');
for(const path of ['ios/App/CapApp-SPM/Package.resolved','ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved']){
 const lock=JSON.parse(await read(path));
 const pin=lock.pins.find(p=>p.identity==='capacitor-swift-pm');
 assert.equal(pin?.state?.version,capacitorVersion,'Xcode SwiftPM lock version is stale');
}
assert.ok(index.includes('data-platform="native"'));
if(productConfig.ios.readerUi==='lite'){
 assert.ok(index.includes('data-reader-ui="lite"'));
 assert.ok(!index.includes('lite-core.js') && !index.includes('lite-base-url.js'));
 assert.ok(!index.includes('full.html'), 'iOS reader must not expose the legacy full interface');
 assert.ok((await read('ios/App/App/public/lite.js')).includes('nativePrivacy'));
}
assert.ok(!/articleImportForm|chromeExtensionPanel|data-rsvp-demo|marketing-link|data-i18n="appStorePending"/u.test(index));
for (const path of ['support.html','ru/support.html','es/support.html']) assert.ok((await read('ios/App/App/public/'+path)).includes('mailto:'+productConfig.supportEmail));
for (const path of ['about','downloads','service-worker.js','full.html']) await assert.rejects(access(join(root,'ios/App/App/public',path)),undefined,'Web-only payload leaked: '+path);
const icon=await sharp(join(root,'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')).metadata();
assert.equal(icon.width,1024); assert.equal(icon.height,1024); assert.equal(icon.hasAlpha,false);
console.log('PASS: iOS source/package checks, shared archive scheme, matching Capacitor pins, EN/RU/ES support, local-only assets, privacy declarations and opaque 1024 icon.');
console.log('NOT TESTED HERE: Xcode compilation/Analyze/archive, signing, device/simulator execution, VoiceOver, TestFlight and App Review.');
