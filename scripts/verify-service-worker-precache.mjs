import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const worker = await readFile(join(root, 'service-worker.js'), 'utf8');
const index = await readFile(join(root, 'index.html'), 'utf8');
const required = [
    './index.html',
    './privacy.html',
    './support.html',
    './acknowledgements.html',
    './ru/',
    './ru/index.html',
    './ru/privacy.html',
    './ru/support.html',
    './ru/acknowledgements.html',
    './es/',
    './es/index.html',
    './es/privacy.html',
    './es/support.html',
    './es/acknowledgements.html',
    './manifest.webmanifest',
    './ru/manifest.webmanifest',
    './es/manifest.webmanifest',
    './assets/brand/pico-hero-640.webp',
    './assets/brand/pico-quick-send-640.webp',
    './sample_text.txt',
    './sample_text_ru.txt',
    './sample_text_es.txt',
    './sample_text_en.txt'
];

for (const asset of required) {
    if (!worker.includes(`'${asset}'`)) throw new Error(`Service worker does not precache ${asset}.`);
}
if (!worker.includes("const CACHE_NAME = 'hummingread-reader-v50'")
    || !worker.includes('/^(?:paceflow|hummingread)-reader-/u')) {
    throw new Error('Service-worker v50 migration must clean legacy and current branded caches.');
}
if (!index.includes('manifest') || !index.includes('app.js?v=50')) {
    throw new Error('App shell asset version does not match the final service-worker generation.');
}
if (!/endsWith\('\/api\/article'\)\) return;/u.test(worker)) {
    throw new Error('Article responses must remain outside service-worker caching.');
}

console.log('Verified v50 app-shell precache, legacy cache migration, and API cache exclusions.');
