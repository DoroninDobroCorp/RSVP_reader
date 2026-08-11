import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChromeExtension } from './build-chrome-extension.mjs';
import { configureWebText } from './product-config.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const destination = join(root, 'dist');
const files = [
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
    'sample_text.txt',
    'sample_text_ru.txt',
    'robots.txt',
    'sitemap.xml'
];

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

for (const file of files) {
    await cp(join(root, file), join(destination, file));
}

const configuredTextFiles = ['index.html', 'robots.txt', 'sitemap.xml'];
for (const file of configuredTextFiles) {
    const path = join(destination, file);
    const configured = configureWebText(await readFile(path, 'utf8'));
    await writeFile(path, configured);
}

await cp(join(root, 'assets'), join(destination, 'assets'), { recursive: true });
await cp(join(root, 'vendor'), join(destination, 'vendor'), { recursive: true });
await buildChromeExtension({
    destination: join(destination, 'downloads', 'hummingread-tester.zip')
});

console.log(`Built bundled web assets in ${destination}`);
