import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

export const root = dirname(dirname(fileURLToPath(import.meta.url)));
export const productConfig = JSON.parse(
    await readFile(join(root, 'product.config.json'), 'utf8')
);

const requiredStrings = [
    ['productName', productConfig.productName],
    ['shortName', productConfig.shortName],
    ['mascotName', productConfig.mascotName],
    ['taglines.en', productConfig.taglines?.en],
    ['taglines.ru', productConfig.taglines?.ru],
    ['taglines.es', productConfig.taglines?.es],
    ['urls.support', productConfig.urls?.support],
    ['urls.privacy', productConfig.urls?.privacy],
    ['urls.marketingSite', productConfig.urls?.marketingSite],
    ['urls.chromeWebStore', productConfig.urls?.chromeWebStore],
    ['urls.appStore', productConfig.urls?.appStore],
    ['urls.publicArticleApiBase', productConfig.urls?.publicArticleApiBase],
    ['versions.web', productConfig.versions?.web],
    ['versions.ios', productConfig.versions?.ios],
    ['versions.iosBuild', productConfig.versions?.iosBuild],
    ['versions.extension', productConfig.versions?.extension],
    ['ios.currentBundleIdentifier', productConfig.ios?.currentBundleIdentifier],
    ['ios.proposedBundleIdentifier', productConfig.ios?.proposedBundleIdentifier],
    ['android.applicationId', productConfig.android?.applicationId],
    ['android.proposedApplicationId', productConfig.android?.proposedApplicationId],
    ['android.versionName', productConfig.android?.versionName]
];

for (const [key, value] of requiredStrings) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`Product configuration value ${key} must be a non-empty string.`);
    }
}

if (typeof productConfig.android?.versionCode !== 'number' || productConfig.android.versionCode < 1) {
    throw new Error('Product configuration android.versionCode must be a positive number.');
}
if (typeof productConfig.android?.applicationIdApproved !== 'boolean') {
    throw new Error('Product configuration android.applicationIdApproved must be a boolean.');
}
if (typeof productConfig.android?.minSdkVersion !== 'number' || productConfig.android.minSdkVersion < 1) {
    throw new Error('Product configuration android.minSdkVersion must be a positive number.');
}
if (typeof productConfig.android?.targetSdkVersion !== 'number' || productConfig.android.targetSdkVersion < 1) {
    throw new Error('Product configuration android.targetSdkVersion must be a positive number.');
}
if (typeof productConfig.android?.compileSdkVersion !== 'number' || productConfig.android.compileSdkVersion < 1) {
    throw new Error('Product configuration android.compileSdkVersion must be a positive number.');
}

for (const key of ['support', 'privacy', 'marketingSite', 'chromeWebStore', 'appStore', 'publicArticleApiBase']) {
    const value = productConfig.urls[key];
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`Product URL ${key} must use HTTP or HTTPS.`);
    }
}

export function assertAndroidUploadApproved() {
    if (!productConfig.android?.applicationIdApproved) {
        throw new Error(
            'Android upload configuration is not approved: applicationIdApproved is false for review builds.'
        );
    }
}

export function assertProductionConfiguration() {
    assertAndroidUploadApproved();
    const serializedUrls = JSON.stringify(productConfig.urls);
    if (!productConfig.release?.finalDomainApproved
        || !productConfig.release?.storeUrlsApproved
        || productConfig.release?.channel !== 'production'
        || /(?:sslip\.io|example\.invalid)/u.test(serializedUrls)) {
        throw new Error(
            'Production configuration is not approved: replace preview/placeholder URLs and record owner approval.'
        );
    }
}

export function siteMatchPattern(siteUrl = productConfig.urls.marketingSite) {
    const parsed = new URL(siteUrl);
    const pathname = parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`;
    return `${parsed.origin}${pathname}*`;
}

function normalizedSiteUrl(value) {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('The site URL must use HTTP or HTTPS.');
    return value.endsWith('/') ? value : `${value}/`;
}

export function configureFinalSeoText(source, siteUrl = productConfig.urls.marketingSite) {
    const normalized = normalizedSiteUrl(siteUrl);
    return source
        .replaceAll('__HUMMINGREAD_SITE_URL__', normalized)
        .replaceAll('__HUMMINGREAD_OG_IMAGE_URL__', `${normalized}assets/brand/hummingread-og.png`);
}

function stripPreviewSeoFromHtml(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        if (document.head) document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', 'noindex,nofollow,noarchive');

    document.querySelectorAll('link[rel="canonical"]').forEach((el) => el.remove());
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
    document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.remove());

    document.querySelectorAll('meta').forEach((el) => {
        const content = el.getAttribute('content') || '';
        if (content.includes('__HUMMINGREAD_SITE_URL__') || content.includes('sslip.io') || content.includes('example.invalid')) {
            el.remove();
        }
    });

    return dom.serialize().replace(/^<!DOCTYPE html>/i, '<!doctype html>');
}

export function configureWebText(source, channel = productConfig.release.channel, siteUrl = productConfig.urls.marketingSite) {
    if (channel === 'production') {
        if (channel === productConfig.release.channel) {
            assertProductionConfiguration();
        }
        return configureFinalSeoText(source, siteUrl);
    }
    if (channel !== 'tester-preview') {
        throw new Error(`Unsupported release channel: ${channel}`);
    }

    if (/^User-agent:/u.test(source)) return 'User-agent: *\nDisallow: /\n';

    if (!source.includes('<!doctype html>') && !source.includes('<!DOCTYPE html>')) {
        return configureFinalSeoText(source, siteUrl);
    }

    const configured = configureFinalSeoText(source, siteUrl);
    return stripPreviewSeoFromHtml(configured);
}
