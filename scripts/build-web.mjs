import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { buildChromeExtension } from './build-chrome-extension.mjs';
import { configureWebText, productConfig } from './product-config.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const destination = join(root, 'dist');
const files = [
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
    'service-worker.js',
    'sample_text.txt',
    'sample_text_ru.txt',
    'sample_text_es.txt',
    'robots.txt',
    ...(productConfig.release.channel === 'production' ? ['sitemap.xml'] : [])
];

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

const catalogs = {
    en: JSON.parse(await readFile(join(root, 'i18n', 'locales', 'en.json'), 'utf8')),
    ru: JSON.parse(await readFile(join(root, 'i18n', 'locales', 'ru.json'), 'utf8')),
    es: JSON.parse(await readFile(join(root, 'i18n', 'locales', 'es.json'), 'utf8'))
};

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

for (const file of files) {
    await cp(join(root, file), join(destination, file));
}

// Pre-render English static body and active language button for root index.html
const rootIndexHtml = await readFile(join(root, 'index.html'), 'utf8');
await writeFile(join(destination, 'index.html'), applyLocaleToHtml(rootIndexHtml, 'en', catalogs.en));

const localeConfigs = {
    ru: {
        lang: 'ru',
        index: {
            title: 'HummingRead: Скорочиталка',
            description: 'HummingRead — спокойная RSVP-скорочиталка для книг, вставленного текста и чтения по одному слову с Пико.',
            ogTitle: 'HummingRead: Скорочиталка',
            ogDescription: 'Читайте книги и длинные тексты в спокойном ритме по одному слову.',
            twitterTitle: 'HummingRead: Скорочиталка',
            twitterDescription: 'Читайте в своём ритме — слово за словом вместе с Пико.',
            canonicalUrl: '__HUMMINGREAD_SITE_URL__ru/',
            jsonLdDescription: 'Локальная RSVP-скорочиталка для книг, вставленного текста и чтения по одному слову.'
        },
        privacy: {
            title: 'Политика конфиденциальности — HummingRead',
            description: 'Политика конфиденциальности HummingRead — приложения для чтения книг и документов без рекламы, отслеживания и облачной синхронизации.',
            canonicalUrl: '__HUMMINGREAD_SITE_URL__ru/privacy.html'
        },
        support: {
            title: 'Поддержка — HummingRead',
            description: 'Руководство по поддержке тестеров HummingRead и устранению неполадок локального чтения.',
            canonicalUrl: '__HUMMINGREAD_SITE_URL__ru/support.html'
        },
        acknowledgements: {
            title: 'Благодарности и лицензии · HummingRead',
            description: 'Благодарности авторам открытого исходного кода и уведомления о сторонних лицензиях HummingRead.',
            canonicalUrl: '__HUMMINGREAD_SITE_URL__ru/acknowledgements.html'
        }
    },
    es: {
        lang: 'es',
        index: {
            title: 'HummingRead: Lector de velocidad',
            description: 'HummingRead es un lector de velocidad RSVP para libros, texto pegado y lectura enfocada palabra por palabra con Pico.',
            ogTitle: 'HummingRead: Lector de velocidad',
            ogDescription: 'Lee libros y textos largos en un ritmo tranquilo palabra por palabra.',
            twitterTitle: 'HummingRead: Lector de velocidad',
            twitterDescription: 'RSVP, una palabra a la vez — guiado por Pico.',
            canonicalUrl: '__HUMMINGREAD_SITE_URL__es/',
            jsonLdDescription: 'Un lector de velocidad RSVP local para libros, texto pegado y lectura enfocada palabra por palabra.'
        },
        privacy: {
            title: 'Política de privacidad — HummingRead',
            description: 'Política de privacidad de HummingRead — lector de libros y documentos sin publicidad, seguimiento ni sincronización en la nube.',
            canonicalUrl: '__HUMMINGREAD_SITE_URL__es/privacy.html'
        },
        support: {
            title: 'Soporte — HummingRead',
            description: 'Guía de soporte para probadores de HummingRead y solución de problemas para lectura local.',
            canonicalUrl: '__HUMMINGREAD_SITE_URL__es/support.html'
        },
        acknowledgements: {
            title: 'Reconocimientos de código abierto · HummingRead',
            description: 'Reconocimientos de software de código abierto y avisos a terceros para HummingRead.',
            canonicalUrl: '__HUMMINGREAD_SITE_URL__es/acknowledgements.html'
        }
    }
};

function adjustRelativePathsForSubdir(html) {
    return html
        .replace(/href="manifest\.json(\?[^"]*)?"/g, 'href="../manifest.json$1"')
        .replace(/href="manifest\.webmanifest(\?[^"]*)?"/g, 'href="../manifest.webmanifest$1"')
        .replace(/href="style\.css(\?[^"]*)?"/g, 'href="../style.css$1"')
        .replace(/href="assets\//g, 'href="../assets/')
        .replace(/src="assets\//g, 'src="../assets/')
        .replace(/src="vendor\//g, 'src="../vendor/')
        .replace(/src="i18n\.js(\?[^"]*)?"/g, 'src="../i18n.js$1"')
        .replace(/src="app\.js(\?[^"]*)?"/g, 'src="../app.js$1"')
        .replace(/src="epub-parser\.js(\?[^"]*)?"/g, 'src="../epub-parser.js$1"')
        .replace(/href="downloads\//g, 'href="../downloads/')
        .replace(/href="THIRD_PARTY_NOTICES\.txt"/g, 'href="../THIRD_PARTY_NOTICES.txt"');
}

function transformIndexForLocale(html, config) {
    let out = applyLocaleToHtml(html, config.lang, catalogs[config.lang]);
    out = out.replace(/<title>[^<]*<\/title>/, `<title>${config.index.title}</title>`);
    out = out.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${config.index.description}">`);
    out = out.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${config.index.ogTitle}">`);
    out = out.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${config.index.ogDescription}">`);
    out = out.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${config.index.canonicalUrl}">`);
    out = out.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${config.index.twitterTitle}">`);
    out = out.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${config.index.twitterDescription}">`);
    out = out.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${config.index.canonicalUrl}">`);

    // Structured data JSON-LD update
    out = out.replace(
        /"url":\s*"__HUMMINGREAD_SITE_URL__"/,
        `"url": "${config.index.canonicalUrl}",\n      "inLanguage": "${config.lang}"`
    );
    out = out.replace(
        /"description":\s*"A local-first RSVP speed reader[^"]*"/,
        `"description": "${config.index.jsonLdDescription}"`
    );

    return adjustRelativePathsForSubdir(out);
}

function transformLegalForLocale(html, pageKey, config) {
    const pageConfig = config[pageKey];
    let out = html.replace(/<html lang="[^"]*">/, `<html lang="${config.lang}">`);
    out = out.replace(/<title>[^<]*<\/title>/, `<title>${pageConfig.title}</title>`);
    out = out.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${pageConfig.description}">`);
    out = out.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${pageConfig.canonicalUrl}">`);
    return adjustRelativePathsForSubdir(out);
}

// Generate locale directories
for (const [locale, config] of Object.entries(localeConfigs)) {
    const localeDir = join(destination, locale);
    await mkdir(localeDir, { recursive: true });

    const indexHtml = await readFile(join(root, 'index.html'), 'utf8');
    await writeFile(join(localeDir, 'index.html'), transformIndexForLocale(indexHtml, config));

    const privacyHtml = await readFile(join(root, 'privacy.html'), 'utf8');
    await writeFile(join(localeDir, 'privacy.html'), transformLegalForLocale(privacyHtml, 'privacy', config));

    const supportHtml = await readFile(join(root, 'support.html'), 'utf8');
    await writeFile(join(localeDir, 'support.html'), transformLegalForLocale(supportHtml, 'support', config));

    const ackHtml = await readFile(join(root, 'acknowledgements.html'), 'utf8');
    await writeFile(join(localeDir, 'acknowledgements.html'), transformLegalForLocale(ackHtml, 'acknowledgements', config));
}

// Configure web text for all HTML files, robots.txt, and sitemap.xml
const configuredTextFiles = [
    'index.html',
    'privacy.html',
    'support.html',
    'acknowledgements.html',
    'ru/index.html',
    'ru/privacy.html',
    'ru/support.html',
    'ru/acknowledgements.html',
    'es/index.html',
    'es/privacy.html',
    'es/support.html',
    'es/acknowledgements.html',
    'robots.txt',
    ...(productConfig.release.channel === 'production' ? ['sitemap.xml'] : [])
];

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
