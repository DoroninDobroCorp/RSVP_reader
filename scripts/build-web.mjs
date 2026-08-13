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
    'app-base-url.js',
    'i18n.js',
    'app.js',
    'epub-parser.js',
    'manifest.json',
    'manifest.webmanifest',
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
await cp(join(root, 'sample_text.txt'), join(destination, 'sample_text_en.txt'));

// Pre-render English static body and active language button for root index.html
const rootIndexHtml = await readFile(join(root, 'index.html'), 'utf8');
await writeFile(join(destination, 'index.html'), applyLocaleToHtml(rootIndexHtml, 'en', catalogs.en));

const localeConfigs = {
    en: {
        lang: 'en',
        manifest: {
            name: 'HummingRead: Speed Reader',
            short_name: 'HummingRead',
            description: 'Read long books and articles in rhythm with Pico, your local-first focus pilot.',
            start_url: '/',
            display: 'standalone',
            background_color: '#f5eedf',
            theme_color: '#101529',
            orientation: 'any',
            id: '/',
            lang: 'en',
            icons: [
                {
                    src: '/assets/icons/app-icon-192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/assets/icons/app-icon-512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any maskable'
                }
            ],
            categories: ['books', 'productivity']
        },
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
    },
    ru: {
        lang: 'ru',
        manifest: {
            name: 'HummingRead: Скорочиталка',
            short_name: 'HummingRead',
            description: 'HummingRead — спокойная RSVP-скорочиталка для книг, вставленного текста и чтения по одному слову с Пико.',
            start_url: '/ru/',
            display: 'standalone',
            background_color: '#f5eedf',
            theme_color: '#101529',
            orientation: 'any',
            id: '/',
            lang: 'ru',
            icons: [
                {
                    src: '/assets/icons/app-icon-192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/assets/icons/app-icon-512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any maskable'
                }
            ],
            categories: ['books', 'productivity']
        },
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
        manifest: {
            name: 'HummingRead: Lector de velocidad',
            short_name: 'HummingRead',
            description: 'HummingRead es un lector de velocidad RSVP para libros, texto pegado y lectura enfocada palabra por palabra con Pico.',
            start_url: '/es/',
            display: 'standalone',
            background_color: '#f5eedf',
            theme_color: '#101529',
            orientation: 'any',
            id: '/',
            lang: 'es',
            icons: [
                {
                    src: '/assets/icons/app-icon-192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/assets/icons/app-icon-512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any maskable'
                }
            ],
            categories: ['books', 'productivity']
        },
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

function adjustRelativePathsForSubdir(html, lang) {
    let out = html;
    if (lang) {
        out = out.replace(/href="\/manifest\.webmanifest"/g, `href="/${lang}/manifest.webmanifest"`);
        out = out.replace(/href="manifest\.webmanifest"/g, `href="/${lang}/manifest.webmanifest"`);
        out = out.replace(/href="manifest\.json(\?[^"]*)?"/g, `href="/${lang}/manifest.webmanifest"`);
    }
    if (out.includes('src="assets/brand/pico-hero-640.webp"')) {
        out = out.replace(/src="assets\/brand\/pico-hero-640\.webp"/g, 'src="/assets/brand/pico-hero-640.webp"');
    }
    return out;
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
        `"url": "${config.index.canonicalUrl}"`
    );
    out = out.replace(
        /"inLanguage":\s*"en"/,
        `"inLanguage": "${config.lang}"`
    );
    out = out.replace(
        /"description":\s*"A local-first RSVP speed reader[^"]*"/,
        `"description": "${config.index.jsonLdDescription}"`
    );

    return adjustRelativePathsForSubdir(out, config.lang);
}

export function transformLegalForLocale(html, pageKey, config) {
    const pageConfig = config ? config[pageKey] : null;
    const lang = config ? config.lang : 'en';
    const dom = new JSDOM(html);
    const document = dom.window.document;

    document.documentElement.lang = lang;

    if (pageConfig) {
        const titleEl = document.querySelector('title');
        if (titleEl) titleEl.textContent = pageConfig.title;

        const descEl = document.querySelector('meta[name="description"]');
        if (descEl) descEl.setAttribute('content', pageConfig.description);

        const canonicalEl = document.querySelector('link[rel="canonical"]');
        if (canonicalEl) canonicalEl.setAttribute('href', pageConfig.canonicalUrl);
    }

    const articles = Array.from(document.querySelectorAll('article.legal-card'));
    for (const article of articles) {
        const articleLang = article.getAttribute('lang') || 'en';
        if (articleLang === lang) {
            article.setAttribute('lang', lang);
            if (lang !== 'en') {
                const noticesLink = article.querySelector('a[href="THIRD_PARTY_NOTICES.txt"]');
                if (noticesLink) {
                    noticesLink.setAttribute('href', '../THIRD_PARTY_NOTICES.txt');
                }
            }
        } else {
            article.remove();
        }
    }

    const docFile = `${pageKey}.html`;
    const backText = {
        en: '← Back to HummingRead',
        ru: '← На главную HummingRead',
        es: '← Volver a HummingRead'
    }[lang] || '← Back to HummingRead';

    function getRelativeLegalUrl(targetLang) {
        if (lang === targetLang) {
            return docFile;
        }
        if (lang === 'en') {
            return `${targetLang}/${docFile}`;
        }
        if (targetLang === 'en') {
            return `../${docFile}`;
        }
        return `../${targetLang}/${docFile}`;
    }

    const localeLinks = [
        { code: 'en', label: 'English' },
        { code: 'ru', label: 'Русский' },
        { code: 'es', label: 'Español' }
    ];

    function createLocaleNav() {
        const nav = document.createElement('nav');
        nav.className = 'legal-locale-nav';
        nav.setAttribute('aria-label', 'Language navigation');

        for (const loc of localeLinks) {
            const a = document.createElement('a');
            a.className = 'legal-locale-link' + (loc.code === lang ? ' active' : '');
            a.href = getRelativeLegalUrl(loc.code);
            a.setAttribute('lang', loc.code);
            a.setAttribute('hreflang', loc.code);
            a.setAttribute('data-language', loc.code);
            if (loc.code === lang) {
                a.setAttribute('aria-current', 'page');
            }
            a.textContent = loc.label;
            nav.appendChild(a);
        }
        return nav;
    }

    const main = document.querySelector('main.legal-page');
    if (main) {
        let backBtn = main.querySelector('.legal-back');
        if (backBtn) {
            backBtn.textContent = backText;
            backBtn.href = 'index.html';
        }

        let navHeader = main.querySelector('.legal-nav-header');
        if (!navHeader) {
            navHeader = document.createElement('header');
            navHeader.className = 'legal-nav-header';
            if (backBtn) {
                main.insertBefore(navHeader, backBtn);
                navHeader.appendChild(backBtn);
            } else {
                main.insertBefore(navHeader, main.firstChild);
            }
        }

        const existingNavHeaderNav = navHeader.querySelector('.legal-locale-nav');
        if (existingNavHeaderNav) existingNavHeaderNav.remove();
        navHeader.appendChild(createLocaleNav());

        let footer = main.querySelector('.legal-footer');
        if (!footer) {
            footer = document.createElement('footer');
            footer.className = 'legal-footer';
            main.appendChild(footer);
        } else {
            footer.innerHTML = '';
        }
        footer.appendChild(createLocaleNav());
    }

    let out = dom.serialize().replace(/^<!DOCTYPE html>/i, '<!doctype html>');
    return adjustRelativePathsForSubdir(out, lang === 'en' ? null : lang);
}

// Generate locale directories and manifests
for (const [locale, config] of Object.entries(localeConfigs)) {
    const isRoot = locale === 'en';
    const targetDir = isRoot ? destination : join(destination, locale);
    await mkdir(targetDir, { recursive: true });

    if (config.manifest) {
        const manifestJson = JSON.stringify(config.manifest, null, 2) + '\n';
        await writeFile(join(targetDir, 'manifest.webmanifest'), manifestJson);
        await writeFile(join(targetDir, 'manifest.json'), manifestJson);
    }

    if (!isRoot) {
        const indexHtml = await readFile(join(root, 'index.html'), 'utf8');
        await writeFile(join(targetDir, 'index.html'), transformIndexForLocale(indexHtml, config));
    }

    const privacyHtml = await readFile(join(root, 'privacy.html'), 'utf8');
    await writeFile(join(targetDir, 'privacy.html'), transformLegalForLocale(privacyHtml, 'privacy', config));

    const supportHtml = await readFile(join(root, 'support.html'), 'utf8');
    await writeFile(join(targetDir, 'support.html'), transformLegalForLocale(supportHtml, 'support', config));

    const ackHtml = await readFile(join(root, 'acknowledgements.html'), 'utf8');
    await writeFile(join(targetDir, 'acknowledgements.html'), transformLegalForLocale(ackHtml, 'acknowledgements', config));
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
