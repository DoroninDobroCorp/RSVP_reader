import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const notice = await readFile(join(root, 'docs', 'THIRD_PARTY_NOTICES.md'), 'utf8');
const acknowledgements = await readFile(join(root, 'acknowledgements.html'), 'utf8');
let count = 0;

for (const [path, metadata] of Object.entries(lock.packages || {})) {
    if (!path.startsWith('node_modules/') || metadata.dev || metadata.optional) continue;
    const name = path.slice('node_modules/'.length);
    count += 1;
    if (!notice.includes(`\`${name}\``) || !notice.includes(`\`${metadata.version}\``)) {
        throw new Error(`Third-party notice is missing locked production package ${name}@${metadata.version}.`);
    }
}

for (const required of ['Capacitor', 'Mozilla Readability', 'ipaddr.js', 'JSZip', 'jsdom']) {
    if (!acknowledgements.includes(required)) {
        throw new Error(`User-readable acknowledgements are missing ${required}.`);
    }
}

console.log(`Verified notices for ${count} locked production packages and the bundled acknowledgements surface.`);
