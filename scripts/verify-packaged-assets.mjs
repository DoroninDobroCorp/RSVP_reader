import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packagedFiles = [
    'index.html',
    'privacy.html',
    'support.html',
    'style.css',
    'i18n.js',
    'app.js',
    'epub-parser.js',
    'manifest.json',
    'service-worker.js',
    'sample_text.txt',
    'sample_text_ru.txt',
    'assets/brand/pico-hero.png',
    'assets/brand/pico-quick-send.png',
    'assets/brand/pico-mark-1024.png',
    'assets/icons/app-icon-192.png',
    'assets/icons/app-icon-512.png'
];

const digest = (contents) => createHash('sha256').update(contents).digest('hex');

for (const file of packagedFiles) {
    const source = await readFile(join(root, file));
    const web = await readFile(join(root, 'dist', file));
    const ios = await readFile(join(root, 'ios', 'App', 'App', 'public', file));
    const expected = digest(source);

    if (digest(web) !== expected || digest(ios) !== expected) {
        throw new Error(`Packaged asset differs from source: ${file}`);
    }
}

const infoPlist = await readFile(join(root, 'ios', 'App', 'App', 'Info.plist'), 'utf8');
if (!infoPlist.includes('<string>arm64</string>') || infoPlist.includes('<string>armv7</string>')) {
    throw new Error('Info.plist must require arm64 and must not retain the legacy armv7 capability.');
}

const privacyManifest = await readFile(join(root, 'ios', 'App', 'App', 'PrivacyInfo.xcprivacy'), 'utf8');
for (const requiredValue of ['NSPrivacyTracking', 'C617.1', 'CA92.1']) {
    if (!privacyManifest.includes(requiredValue)) {
        throw new Error(`PrivacyInfo.xcprivacy is missing ${requiredValue}.`);
    }
}

console.log(`Verified ${packagedFiles.length} source, web, and iOS assets plus native privacy metadata.`);
