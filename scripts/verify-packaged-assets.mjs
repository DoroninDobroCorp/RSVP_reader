import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import { configureFinalSeoText, configureWebText } from './product-config.mjs';
import { transformLegalForLocale } from './build-web.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const enCatalog = JSON.parse(await readFile(join(root, 'i18n', 'locales', 'en.json'), 'utf8'));

function applyLocaleToHtml(html, lang, catalog) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    document.documentElement.lang = lang;

    if (catalog) {
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (catalog[key] !== undefined) {
                el.textContent = catalog[key];
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (catalog[key] !== undefined) {
                el.setAttribute('placeholder', catalog[key]);
            }
        });
        document.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.getAttribute('data-i18n-title');
            if (catalog[key] !== undefined) {
                el.setAttribute('title', catalog[key]);
            }
        });
        document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
            const key = el.getAttribute('data-i18n-aria');
            if (catalog[key] !== undefined) {
                el.setAttribute('aria-label', catalog[key]);
            }
        });
    }

    document.querySelectorAll('[data-language]').forEach((el) => {
        const isActive = el.dataset.language === lang;
        if (isActive) {
            el.classList.add('active');
            el.setAttribute('aria-pressed', 'true');
        } else {
            el.classList.remove('active');
            el.setAttribute('aria-pressed', 'false');
        }
    });

    return dom.serialize().replace(/^<!DOCTYPE html>/i, '<!doctype html>');
}

const configuredTextFiles = new Set(['index.html', 'privacy.html', 'support.html', 'acknowledgements.html', 'robots.txt']);
const webPackagedFiles = [
    'index.html',
    'privacy.html',
    'support.html',
    'acknowledgements.html',
    'THIRD_PARTY_NOTICES.txt',
    'style.css',
    'i18n.js',
    'app.js',
    'epub-parser.js',
    'manifest.json',
    'manifest.webmanifest',
    'service-worker.js',
    'robots.txt',
    'sample_text.txt',
    'sample_text_ru.txt',
    'sample_text_es.txt',
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

for (const file of webPackagedFiles) {
    const source = await readFile(join(root, file));
    let expected = source;
    if (configuredTextFiles.has(file)) {
        let text = source.toString('utf8');
        if (file === 'index.html') {
            text = applyLocaleToHtml(text, 'en', enCatalog);
        } else if (['privacy.html', 'support.html', 'acknowledgements.html'].includes(file)) {
            const pageKey = file.replace('.html', '');
            text = transformLegalForLocale(text, pageKey, {
                lang: 'en',
                privacy: {
                    title: 'Privacy Policy — HummingRead',
                    description: 'HummingRead privacy policy — local-first speed reader for books and documents with zero tracking, ads, or account requirements.',
                    canonicalUrl: '__HUMMINGREAD_SITE_URL__privacy.html'
                },
                support: {
                    title: 'Support — HummingRead',
                    description: 'HummingRead tester support and troubleshooting guide for local-first book reading.',
                    canonicalUrl: '__HUMMINGREAD_SITE_URL__support.html'
                },
                acknowledgements: {
                    title: 'Open-source acknowledgements · HummingRead',
                    description: 'Open-source software acknowledgements and third-party notices for HummingRead.',
                    canonicalUrl: '__HUMMINGREAD_SITE_URL__acknowledgements.html'
                }
            });
        }
        text = configureWebText(text);
        expected = Buffer.from(text);
    }
    const web = await readFile(join(root, 'dist', file));
    if (digest(web) !== digest(expected)) {
        throw new Error(`Web packaged asset differs from configured source: ${file}`);
    }
}

async function expectMissing(path, description) {
    try {
        await readFile(path);
        throw new Error(`${description} must not be packaged.`);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
}

const sourceIndex = await readFile(join(root, 'index.html'), 'utf8');
for (const id of ['articleImportForm', 'chromeExtensionPanel']) {
    if (!new RegExp(`id="${id}"[^>]*hidden[^>]*aria-hidden="true"`, 'u').test(sourceIndex)) {
        throw new Error(`${id} is not hidden and inaccessible in static source HTML.`);
    }
}

for (const id of ['fileInput', 'libraryImportInput']) {
    const match = sourceIndex.match(new RegExp(`id="${id}"[^>]*accept="([^"]+)"`, 'u'));
    if (!match) throw new Error(`${id} must keep an explicit file-type allowlist.`);
    const acceptedTypes = match[1].split(',').map((value) => value.trim());
    if (acceptedTypes.includes('*/*')) {
        throw new Error(`${id} must not request every media type; iOS should open the document picker directly.`);
    }
    for (const extension of ['.epub', '.fb2', '.docx', '.txt', '.html', '.md', '.rtf']) {
        if (!acceptedTypes.includes(extension)) throw new Error(`${id} is missing ${extension}.`);
    }
}

const previewIndex = await readFile(join(root, 'dist', 'index.html'), 'utf8');
const previewRuIndex = await readFile(join(root, 'dist', 'ru', 'index.html'), 'utf8');
const previewEsIndex = await readFile(join(root, 'dist', 'es', 'index.html'), 'utf8');
const previewRobots = await readFile(join(root, 'dist', 'robots.txt'), 'utf8');

if (!previewIndex.includes('content="noindex,nofollow,noarchive"')
    || !previewRuIndex.includes('content="noindex,nofollow,noarchive"')
    || !previewEsIndex.includes('content="noindex,nofollow,noarchive"')
    || previewRobots !== 'User-agent: *\nDisallow: /\n') {
    throw new Error('Tester-preview SEO output is not consistently noindex/disallow.');
}

for (const [doc, lang] of [
    [previewIndex, 'en'],
    [previewRuIndex, 'ru'],
    [previewEsIndex, 'es']
]) {
    if (!doc.includes(`<html lang="${lang}">`)) {
        throw new Error(`Locale doc missing static <html lang="${lang}">.`);
    }
    if (!doc.includes('src="assets/brand/pico-hero-640.webp"') && !doc.includes('src="../assets/brand/pico-hero-640.webp"')) {
        throw new Error(`Locale doc ${lang} missing relative src for pico-hero-640.webp.`);
    }
    if (doc.includes('rel="canonical"')) {
        throw new Error(`Tester-preview locale doc ${lang} must not contain canonical URL.`);
    }
    if (doc.includes('hreflang=')) {
        throw new Error(`Tester-preview locale doc ${lang} must not contain hreflang tags.`);
    }
    if (doc.includes('application/ld+json')) {
        throw new Error(`Tester-preview locale doc ${lang} must not contain JSON-LD structured data.`);
    }
    if (doc.includes('sslip.io') || doc.includes('example.invalid')) {
        throw new Error(`Tester-preview locale doc ${lang} leaks temporary domain metadata.`);
    }
}

await expectMissing(join(root, 'dist', 'sitemap.xml'), 'Tester-preview sitemap');

const finalSeo = configureFinalSeoText(sourceIndex, 'https://reader.example/');
for (const required of [
    'content="index,follow"',
    '<link rel="canonical" href="https://reader.example/">',
    'application/ld+json',
    '"url": "https://reader.example/"',
    'https://reader.example/assets/brand/hummingread-og.png'
]) {
    if (!finalSeo.includes(required)) throw new Error(`Final-channel SEO structure is missing ${required}.`);
}
if (/__HUMMINGREAD_/u.test(finalSeo)) throw new Error('Final-channel SEO structure retains a placeholder.');

const nativeRoot = join(root, 'dist-native');
const iosRoot = join(root, 'ios', 'App', 'App', 'public');
const androidRoot = join(root, 'android', 'app', 'src', 'main', 'assets', 'public');
const nativeFiles = (await listFiles(nativeRoot)).filter((file) => !file.startsWith('android/'));
const iosFiles = (await listFiles(iosRoot)).filter((file) => !['cordova.js', 'cordova_plugins.js', 'capacitor.config.json'].includes(file));
if (JSON.stringify(iosFiles.sort()) !== JSON.stringify(nativeFiles.sort())) {
    throw new Error('The iOS public tree has stale or missing files compared with dist-native.');
}
for (const file of nativeFiles) {
    const native = await readFile(join(nativeRoot, file));
    const ios = await readFile(join(iosRoot, file));
    if (digest(native) !== digest(ios)) throw new Error(`iOS copy differs from filtered native asset: ${file}`);
}

const androidNativeRoot = join(root, 'dist-native', 'android');
const androidNativeFiles = (await listFiles(androidNativeRoot)).filter((file) => !['cordova.js', 'cordova_plugins.js', 'capacitor.config.json'].includes(file));
const androidFiles = (await listFiles(androidRoot)).filter((file) => !['cordova.js', 'cordova_plugins.js', 'capacitor.config.json'].includes(file));
if (JSON.stringify(androidFiles.sort()) !== JSON.stringify(androidNativeFiles.sort())) {
    throw new Error('The Android public tree has stale or missing files compared with dist-native/android.');
}
for (const file of androidNativeFiles) {
    const androidNative = await readFile(join(androidNativeRoot, file));
    const androidApp = await readFile(join(androidRoot, file));
    if (digest(androidNative) !== digest(androidApp)) throw new Error(`Android app asset differs from dist-native/android asset: ${file}`);
}

for (const forbidden of [
    'downloads/hummingread-tester.zip',
    'manifest.json',
    'robots.txt',
    'service-worker.js',
    'sitemap.xml',
    'assets/brand/hummingread-chrome-marquee.png',
    'assets/brand/hummingread-chrome-promo-small.png',
    'assets/brand/hummingread-og.png',
    'assets/brand/pico-quick-send.png'
]) {
    await expectMissing(join(nativeRoot, forbidden), `Native web/store-only payload ${forbidden}`);
    await expectMissing(join(iosRoot, forbidden), `iOS web/store-only payload ${forbidden}`);
}

const nativeIndex = await readFile(join(nativeRoot, 'index.html'), 'utf8');
const nativePrivacy = await readFile(join(nativeRoot, 'privacy.html'), 'utf8');
if (!nativeIndex.includes('data-platform="native"')
    || !nativeIndex.includes('data-i18n="nativeHeroHint"')
    || /articleImportForm|chromeExtensionPanel|Chrome Web Store|hummingread-tester\.zip/u.test(nativeIndex)
    || /article importer|Chrome extension|web\/PWA/iu.test(nativePrivacy)) {
    throw new Error('Filtered native first-paint content still exposes a web article or Chrome surface.');
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

console.log(`Verified ${webPackagedFiles.length} web assets, ${nativeFiles.length} filtered native/iOS assets, preview noindex and gated final SEO structure.`);
