import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const extensionRoot = join(root, 'chrome-extension');
const manifest = JSON.parse(await readFile(join(extensionRoot, 'manifest.json'), 'utf8'));
const requiredFiles = [
    'manifest.json',
    'background.js',
    'bridge.js',
    'core.js',
    'popup.html',
    'popup.css',
    'popup.js',
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

function pngDimensions(buffer) {
    if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
        throw new Error('Chrome icon is not a valid PNG.');
    }
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
    };
}

if (manifest.manifest_version !== 3 || manifest.background?.service_worker !== 'background.js') {
    throw new Error('Chrome package is not a valid Manifest V3 service-worker extension.');
}
if (manifest.permissions.includes('tabs') || manifest.permissions.includes('history')) {
    throw new Error('Chrome extension must not request browsing-history permissions.');
}
if (JSON.stringify(manifest).includes('<all_urls>')) {
    throw new Error('Chrome extension must not request access to all websites.');
}
if (JSON.stringify(manifest.host_permissions) !== JSON.stringify(['https://145.239.82.124.sslip.io/rsvp/*'])
    || JSON.stringify(manifest.content_scripts?.[0]?.matches) !== JSON.stringify(['https://145.239.82.124.sslip.io/rsvp/*'])) {
    throw new Error('Chrome extension host access must be limited to the production PaceFlow path.');
}
for (const permission of ['activeTab', 'alarms', 'clipboardRead', 'contextMenus', 'scripting', 'storage']) {
    if (!manifest.permissions.includes(permission)) throw new Error(`Missing Chrome permission: ${permission}`);
}

const webArchive = await readFile(join(root, 'dist', 'downloads', 'paceflow-quick-send.zip'));
const iosArchive = await readFile(join(root, 'ios', 'App', 'App', 'public', 'downloads', 'paceflow-quick-send.zip'));
const digest = (value) => createHash('sha256').update(value).digest('hex');
if (digest(webArchive) !== digest(iosArchive)) {
    throw new Error('Web and iOS extension download archives differ.');
}

const zip = await JSZip.loadAsync(webArchive);
for (const file of requiredFiles) {
    const archived = zip.file(file);
    if (!archived) throw new Error(`Chrome ZIP is missing ${file}.`);
    const source = await readFile(join(extensionRoot, file));
    const packaged = await archived.async('nodebuffer');
    if (digest(source) !== digest(packaged)) throw new Error(`Chrome ZIP differs from source: ${file}`);
    if (iconSizes.has(file)) {
        const expected = iconSizes.get(file);
        const dimensions = pngDimensions(packaged);
        if (dimensions.width !== expected || dimensions.height !== expected) {
            throw new Error(`Chrome icon ${file} must be exactly ${expected}x${expected}.`);
        }
    }
}

for (const script of ['background.js', 'bridge.js', 'core.js', 'popup.js']) {
    const source = await readFile(join(extensionRoot, script), 'utf8');
    if (/\b(?:eval|new Function)\s*\(/u.test(source)) {
        throw new Error(`Remote-code-compatible execution is forbidden in ${script}.`);
    }
}

console.log(`Verified Manifest V3 Chrome extension ${manifest.version} with ${requiredFiles.length} packaged files.`);
