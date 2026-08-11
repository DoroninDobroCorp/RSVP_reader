import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureWebText } from './product-config.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const configuredTextFiles = new Set(['index.html', 'robots.txt', 'sitemap.xml']);
const packagedFiles = [
    'index.html',
    'privacy.html',
    'support.html',
    'acknowledgements.html',
    'style.css',
    'i18n.js',
    'app.js',
    'epub-parser.js',
    'manifest.json',
    'service-worker.js',
    'robots.txt',
    'sitemap.xml',
    'sample_text.txt',
    'sample_text_ru.txt',
    'assets/brand/pico-hero.png',
    'assets/brand/pico-quick-send.png',
    'assets/brand/pico-hero-640.webp',
    'assets/brand/pico-quick-send-640.webp',
    'assets/brand/pico-mark-1024.png',
    'assets/brand/hummingread-og.png',
    'assets/brand/hummingread-chrome-promo-small.png',
    'assets/brand/hummingread-chrome-marquee.png',
    'assets/icons/app-icon-32.png',
    'assets/icons/app-icon-64.png',
    'assets/icons/app-icon-180.png',
    'assets/icons/app-icon-192.png',
    'assets/icons/app-icon-512.png'
];

const digest = (contents) => createHash('sha256').update(contents).digest('hex');

function pngMetadata(buffer) {
    if (buffer.length < 26 || buffer.toString('ascii', 1, 4) !== 'PNG') {
        throw new Error('Expected a valid PNG asset.');
    }
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
        colorType: buffer[25]
    };
}

for (const file of packagedFiles) {
    const source = await readFile(join(root, file));
    const expected = configuredTextFiles.has(file)
        ? Buffer.from(configureWebText(source.toString('utf8')))
        : source;
    const web = await readFile(join(root, 'dist', file));
    const ios = await readFile(join(root, 'ios', 'App', 'App', 'public', file));

    if (digest(web) !== digest(expected) || digest(ios) !== digest(expected)) {
        throw new Error(`Packaged asset differs from configured source: ${file}`);
    }
}

const rasterRequirements = new Map([
    ['assets/icons/app-icon-32.png', [32, 32, false]],
    ['assets/icons/app-icon-64.png', [64, 64, false]],
    ['assets/icons/app-icon-128.png', [128, 128, false]],
    ['assets/icons/app-icon-180.png', [180, 180, false]],
    ['assets/icons/app-icon-192.png', [192, 192, false]],
    ['assets/icons/app-icon-512.png', [512, 512, false]],
    ['assets/icons/app-icon-1024.png', [1024, 1024, false]],
    ['assets/brand/hummingread-og.png', [1200, 630, true]],
    ['assets/brand/hummingread-chrome-promo-small.png', [440, 280, false]],
    ['assets/brand/hummingread-chrome-marquee.png', [1400, 560, false]]
]);
for (const [file, [width, height, alphaAllowed]] of rasterRequirements) {
    const metadata = pngMetadata(await readFile(join(root, file)));
    if (metadata.width !== width || metadata.height !== height) {
        throw new Error(`${file} must be exactly ${width}x${height}.`);
    }
    if (!alphaAllowed && [4, 6].includes(metadata.colorType)) {
        throw new Error(`${file} must not contain an alpha channel.`);
    }
}

for (const file of [
    'assets/brand/design-tokens.json',
    'assets/brand/hummingread-icon-master.svg',
    'assets/brand/hummingread-chrome-marquee.svg',
    'assets/brand/hummingread-chrome-promo-small.svg',
    'assets/brand/hummingread-mascot-master.svg',
    'assets/brand/hummingread-monochrome.svg',
    'assets/brand/hummingread-og-master.svg',
    'assets/brand/hummingread-wordmark.svg',
    'assets/brand/pico-poses.svg'
]) {
    const source = await readFile(join(root, file), 'utf8');
    if (!source.trim()) throw new Error(`Editable brand source is empty: ${file}`);
}

async function listFiles(directory, base = directory) {
    const output = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const absolute = join(directory, entry.name);
        if (entry.isDirectory()) output.push(...await listFiles(absolute, base));
        else if (entry.isFile()) output.push(relative(base, absolute));
    }
    return output;
}

const publicRoot = join(root, 'dist');
const forbiddenNames = new Set([
    '.git', '.env', 'server.js', 'package.json', 'package-lock.json',
    'sync-store.json', 'node_modules', 'tests', 'ios', 'AGENTS.md',
    'MASTER_MISSION.md', 'FOLLOWUP_MISSION.md'
]);
const publicFiles = await listFiles(publicRoot);
for (const file of publicFiles) {
    const segments = file.split(/[\\/]/u);
    if (segments.some((segment) => forbiddenNames.has(segment))
        || /\.(?:epub|fb2|docx|rtf|env|pem|key)$/iu.test(file)) {
        throw new Error(`Private or source-only entry leaked into dist: ${file}`);
    }
}

const infoPlist = await readFile(join(root, 'ios', 'App', 'App', 'Info.plist'), 'utf8');
if (!infoPlist.includes('<string>arm64</string>') || infoPlist.includes('<string>armv7</string>')) {
    throw new Error('Info.plist must require arm64 and must not retain the legacy armv7 capability.');
}
if (!infoPlist.includes('<string>HummingRead</string>')) {
    throw new Error('Info.plist must expose the provisional HummingRead display name.');
}

const privacyManifest = await readFile(join(root, 'ios', 'App', 'App', 'PrivacyInfo.xcprivacy'), 'utf8');
for (const requiredValue of ['NSPrivacyTracking', 'C617.1', 'CA92.1']) {
    if (!privacyManifest.includes(requiredValue)) {
        throw new Error(`PrivacyInfo.xcprivacy is missing ${requiredValue}.`);
    }
}

console.log(`Verified ${packagedFiles.length} configured source/web/iOS assets, icon/OG dimensions and alpha, editable masters, native privacy metadata, and public-root isolation.`);
