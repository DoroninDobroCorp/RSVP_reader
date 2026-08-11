import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChromeExtension } from './build-chrome-extension.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const destination = join(root, 'dist');
const files = [
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
    'sample_text_ru.txt'
];

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

for (const file of files) {
    await cp(join(root, file), join(destination, file));
}

await cp(join(root, 'assets'), join(destination, 'assets'), { recursive: true });
await cp(join(root, 'vendor'), join(destination, 'vendor'), { recursive: true });
await buildChromeExtension({
    destination: join(destination, 'downloads', 'paceflow-quick-send.zip')
});

console.log(`Built bundled web assets in ${destination}`);
