import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertProductionConfiguration, productConfig } from './product-config.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const userFacingFiles = [
    'index.html',
    'privacy.html',
    'support.html',
    'acknowledgements.html',
    'manifest.json',
    'capacitor.config.json',
    'ios/App/App/Info.plist',
    'chrome-extension/manifest.json',
    'chrome-extension/popup.html',
    'chrome-extension/reader.html',
    'chrome-extension/_locales/en/messages.json',
    'chrome-extension/_locales/ru/messages.json',
    'docs/APP_STORE_COPY.md',
    'docs/APP_STORE_CHECKLIST.md',
    'docs/CHROME_EXTENSION.md',
    'docs/PRIVACY_POLICY.md'
];

for (const file of userFacingFiles) {
    const source = await readFile(join(root, file), 'utf8');
    if (/\bPaceFlow\b/u.test(source)) {
        throw new Error(`Obsolete user-facing brand leaked into ${file}.`);
    }
    if (/(?:YOUR_|REPLACE_ME|TODO_DOMAIN|TODO_EMAIL)/u.test(source)) {
        throw new Error(`Undocumented placeholder leaked into ${file}.`);
    }
}

const index = await readFile(join(root, 'index.html'), 'utf8');
for (const required of [
    productConfig.shortName,
    '__HUMMINGREAD_SITE_URL__',
    '__HUMMINGREAD_OG_IMAGE_URL__',
    'application/ld+json'
]) {
    if (!index.includes(required)) throw new Error(`Web metadata is missing ${required}.`);
}

const capacitor = JSON.parse(await readFile(join(root, 'capacitor.config.json'), 'utf8'));
if (capacitor.appName !== productConfig.shortName) {
    throw new Error('Capacitor display name does not match central product configuration.');
}
if (capacitor.appId !== productConfig.ios.currentBundleIdentifier) {
    throw new Error('Current bundle identifier must stay at the explicitly gated configured value.');
}
if (productConfig.ios.changeApproved === false
    && capacitor.appId === productConfig.ios.proposedBundleIdentifier) {
    throw new Error('Proposed bundle identifier was applied without owner approval.');
}

if (process.argv.includes('--production') || process.env.HUMMINGREAD_RELEASE_MODE === 'production') {
    assertProductionConfiguration();
}

console.log(`Verified provisional ${productConfig.shortName} brand consistency, metadata tokens, bundle-ID gate, and preview placeholders.`);
