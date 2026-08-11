import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { transformExtensionFile } from './build-chrome-extension.mjs';
import { productConfig, siteMatchPattern } from './product-config.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const extensionRoot = join(root, 'chrome-extension');
const sourceManifest = JSON.parse(await readFile(join(extensionRoot, 'manifest.json'), 'utf8'));
const requiredFiles = [
    'manifest.json',
    'background.js',
    'bridge.js',
    'core.js',
    'popup.html',
    'popup.css',
    'popup.js',
    'reader.html',
    'reader.css',
    'reader.js',
    'assets/pico-quick-send.png',
    '_locales/en/messages.json',
    '_locales/ru/messages.json',
    'icons/icon-16.png',
    'icons/icon-32.png',
    'icons/icon-48.png',
    'icons/icon-128.png'
];
const iconSizes = new Map([
    ['icons/icon-16.png', 16],
    ['icons/icon-32.png', 32],
    ['icons/icon-48.png', 48],
    ['icons/icon-128.png', 128]
]);
const imageSizes = new Map([
    ...iconSizes,
    ['assets/pico-quick-send.png', { width: 420, height: 280 }]
]);

function pngDimensions(buffer) {
    if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
        throw new Error('Chrome icon is not a valid PNG.');
    }
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
    };
}

if (sourceManifest.manifest_version !== 3 || sourceManifest.background?.service_worker !== 'background.js') {
    throw new Error('Chrome extension must use a Manifest V3 service worker.');
}
if (sourceManifest.host_permissions || sourceManifest.content_scripts) {
    throw new Error('Tracked extension source must not hard-code a preview host; the build injects one configured origin.');
}
const expectedPermissions = ['activeTab', 'alarms', 'contextMenus', 'scripting', 'storage'];
if (JSON.stringify([...sourceManifest.permissions].sort()) !== JSON.stringify(expectedPermissions.sort())) {
    throw new Error(`Chrome permissions must be exactly: ${expectedPermissions.join(', ')}.`);
}
if (sourceManifest.permissions.includes('clipboardRead')
    || sourceManifest.permissions.includes('tabs')
    || sourceManifest.permissions.includes('history')
    || JSON.stringify(sourceManifest).includes('<all_urls>')) {
    throw new Error('Chrome extension requests a forbidden broad, history, tabs, or clipboard permission.');
}

const webArchive = await readFile(join(root, 'dist', 'downloads', 'hummingread-tester.zip'));
const iosArchive = await readFile(join(root, 'ios', 'App', 'App', 'public', 'downloads', 'hummingread-tester.zip'));
const digest = (value) => createHash('sha256').update(value).digest('hex');
if (digest(webArchive) !== digest(iosArchive)) {
    throw new Error('Web and iOS extension tester archives differ.');
}

const zip = await JSZip.loadAsync(webArchive);
const archiveEntries = Object.values(zip.files);
if (archiveEntries.some((entry) => entry.dir) || archiveEntries.length !== requiredFiles.length) {
    throw new Error('Chrome ZIP must contain only the 17 fixed file entries and no generated directory records.');
}
const fixedTimestamp = new Date('2026-08-11T00:00:00Z').getTime();
if (archiveEntries.some((entry) => entry.date.getTime() !== fixedTimestamp)) {
    throw new Error('Chrome ZIP entries must all use the fixed release timestamp.');
}
const packagedFiles = archiveEntries.map((entry) => entry.name).sort();
if (JSON.stringify(packagedFiles) !== JSON.stringify([...requiredFiles].sort())) {
    throw new Error(`Chrome ZIP contains unexpected or missing public files: ${packagedFiles.join(', ')}`);
}

for (const file of requiredFiles) {
    const archived = zip.file(file);
    if (!archived) throw new Error(`Chrome ZIP is missing ${file}.`);
    const source = await readFile(join(extensionRoot, file));
    const packaged = await archived.async('nodebuffer');
    const expected = transformExtensionFile(file, source);
    if (digest(expected) !== digest(packaged)) throw new Error(`Chrome ZIP differs from configured source: ${file}`);
    if (imageSizes.has(file)) {
        const size = imageSizes.get(file);
        const dimensions = pngDimensions(packaged);
        const width = typeof size === 'number' ? size : size.width;
        const height = typeof size === 'number' ? size : size.height;
        if (dimensions.width !== width || dimensions.height !== height) {
            throw new Error(`Chrome image ${file} must be exactly ${width}x${height}.`);
        }
    }
}

const packagedManifest = JSON.parse(await zip.file('manifest.json').async('string'));
const configuredMatch = siteMatchPattern();
if (packagedManifest.version !== productConfig.versions.extension
    || packagedManifest.short_name !== productConfig.shortName
    || JSON.stringify(packagedManifest.host_permissions) !== JSON.stringify([configuredMatch])
    || JSON.stringify(packagedManifest.content_scripts?.[0]?.matches) !== JSON.stringify([configuredMatch])) {
    throw new Error('Chrome tester manifest does not match the central product/preview configuration.');
}
if (!packagedManifest.content_security_policy?.extension_pages?.includes("script-src 'self'")) {
    throw new Error('Chrome extension CSP must allow only bundled scripts.');
}

const packagedCore = await zip.file('core.js').async('string');
if (packagedCore.includes('__HUMMINGREAD_MARKETING_SITE_URL__')
    || !packagedCore.includes(productConfig.urls.marketingSite)) {
    throw new Error('Chrome tester core did not receive the configured preview URL.');
}

for (const script of ['background.js', 'bridge.js', 'core.js', 'popup.js', 'reader.js']) {
    const source = await readFile(join(extensionRoot, script), 'utf8');
    if (/\b(?:eval|new Function)\s*\(/u.test(source)) {
        throw new Error(`Remote-code-compatible execution is forbidden in ${script}.`);
    }
}

console.log(
    `Verified Manifest V3 Chrome extension ${packagedManifest.version}: ${requiredFiles.length} deterministic files, minimal permissions, local reader, and one configured preview origin.`
);
