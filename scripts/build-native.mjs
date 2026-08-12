import { cp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, 'dist');
const destination = join(root, 'dist-native');

await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });

for (const relativePath of [
    'downloads',
    'manifest.json',
    'manifest.webmanifest',
    'robots.txt',
    'service-worker.js',
    'sitemap.xml',
    'ru',
    'es'
]) {
    await rm(join(destination, relativePath), { recursive: true, force: true });
}

const brandDirectory = join(destination, 'assets', 'brand');
for (const entry of await readdir(brandDirectory)) {
    if (/^(?:hummingread-(?:chrome|og)|pico-quick-send)/u.test(entry)) {
        await rm(join(brandDirectory, entry), { force: true });
    }
}

const webOnlyBlock = /\s*<!-- WEB_ONLY_START -->[\s\S]*?<!-- WEB_ONLY_END -->\s*/u;
const nativeCopies = new Map([
    [
        'Pico turns books, articles and pasted text into a calm rhythm that keeps your eyes—and your place—moving forward.',
        'Pico turns local books, documents and pasted text into a calm rhythm that keeps your eyes—and your place—moving forward.'
    ],
    [
        'Paste, import, or send it from Chrome.',
        'Paste text or import a book or document from this device.'
    ],
    [
        'Drop text into the main lane, or use a fast lane for a link or Chrome handoff.',
        'Paste text into the reading lane or import a local book or document.'
    ],
    ['Surface-specific privacy', 'Private on this device'],
    [
        'Books, pasted text and progress stay local. The optional web article importer sends only the URL to the article service.',
        'Books, documents, pasted text, bookmarks and reading progress stay in the app’s local storage.'
    ]
]);

const indexPath = join(destination, 'index.html');
let index = await readFile(indexPath, 'utf8');
if (!webOnlyBlock.test(index)) throw new Error('Native build could not find the guarded web-only surface.');
index = index
    .replace('<html lang="en">', '<html lang="en" data-platform="native">')
    .replace(webOnlyBlock, '\n')
    .replace(/\s*<meta name="robots"[^>]*>/u, '')
    .replace(/\s*<link rel="canonical"[^>]*>/u, '')
    .replace(/\s*<meta property="og:[^>]*>/gu, '')
    .replace(/\s*<meta name="twitter:[^>]*>/gu, '')
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/u, '')
    .replace(/\s*<link rel="manifest"[^>]*>/u, '')
    .replace(/data-i18n="([^"]+)" data-native-i18n="([^"]+)"/gu, 'data-i18n="$2"');
for (const [webCopy, nativeCopy] of nativeCopies) index = index.replaceAll(webCopy, nativeCopy);
if (/articleImportForm|chromeExtensionPanel|hummingread-tester\.zip|Chrome Web Store/u.test(index)) {
    throw new Error('A web article or Chrome surface leaked into the native index.');
}
await writeFile(indexPath, index);

const privacyPath = join(destination, 'privacy.html');
let privacy = await readFile(privacyPath, 'utf8');
privacy = privacy
    .replace(/<!-- WEB_PRIVACY_START -->[\s\S]*?<!-- WEB_PRIVACY_END -->/gu, '')
    .replace(
        /<h2>Использование сети<\/h2>[\s\S]*?(?=<h2>Экспорт и удаление<\/h2>)/u,
        '<h2>Использование сети</h2>\n            <p>Приложение iOS читает локальные книги, документы и вставленный текст офлайн и не передаёт содержимое чтения разработчику.</p>\n            '
    )
    .replace(
        /<h2>Uso de la red<\/h2>[\s\S]*?(?=<h2>Exportación y eliminación<\/h2>)/u,
        '<h2>Uso de la red</h2>\n            <p>La aplicación para iOS lee libros locales, documentos y texto pegado sin conexión y no transmite el contenido de lectura al desarrollador.</p>\n            '
    )
    .replaceAll(
        'The native iOS app has no article importer or content-service endpoint and its full reading workflow works offline.',
        'The iOS app reads local books, documents and pasted text offline and does not send reading content to the developer.'
    )
    .replaceAll(
        'В нативном приложении iOS нет импорта статьи или адреса сервиса контента; весь сценарий чтения работает офлайн.',
        'Приложение iOS читает локальные книги, документы и вставленный текст офлайн и не передаёт содержимое чтения разработчику.'
    )
    .replaceAll(
        'La aplicación nativa para iOS no tiene importador de artículos ni punto de enlace de servicio de contenido y todo su flujo de lectura funciona sin conexión.',
        'La aplicación para iOS lee libros locales, documentos y texto pegado sin conexión y no transmite el contenido de lectura al desarrollador.'
    );
await writeFile(privacyPath, privacy);

const iosDestination = join(root, 'ios', 'App', 'App', 'public');
await cp(destination, iosDestination, { recursive: true });

console.log(`Built filtered native assets in ${destination}`);
