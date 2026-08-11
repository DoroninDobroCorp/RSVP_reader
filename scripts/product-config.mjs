import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
    ['ios.proposedBundleIdentifier', productConfig.ios?.proposedBundleIdentifier]
];

for (const [key, value] of requiredStrings) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`Product configuration value ${key} must be a non-empty string.`);
    }
}

for (const key of ['support', 'privacy', 'marketingSite', 'chromeWebStore', 'appStore', 'publicArticleApiBase']) {
    const value = productConfig.urls[key];
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`Product URL ${key} must use HTTP or HTTPS.`);
    }
}

export function assertProductionConfiguration() {
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

export function configureWebText(source) {
    const siteUrl = productConfig.urls.marketingSite.endsWith('/')
        ? productConfig.urls.marketingSite
        : `${productConfig.urls.marketingSite}/`;
    return source
        .replaceAll('__HUMMINGREAD_SITE_URL__', siteUrl)
        .replaceAll('__HUMMINGREAD_OG_IMAGE_URL__', `${siteUrl}assets/brand/hummingread-og.png`);
}
