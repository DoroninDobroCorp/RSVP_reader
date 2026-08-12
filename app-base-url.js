/**
 * HummingRead App Base URL & Centralized Path Resolution Helper
 */

function getAppBaseUrl(urlLocation) {
    let href = '';
    if (typeof urlLocation === 'string') {
        href = urlLocation;
    } else if (urlLocation && urlLocation.href) {
        href = urlLocation.href;
    } else if (typeof window !== 'undefined' && window.location) {
        href = window.location.href;
    } else {
        return '/';
    }

    try {
        const parsed = new URL(href, 'http://localhost');
        let pathname = parsed.pathname;

        // Clean known file names from the end of the pathname
        pathname = pathname.replace(/\/(?:index\.html|privacy\.html|support\.html|acknowledgements\.html)$/i, '/');

        // Clean known locale subpaths (/ru/, /es/, /ru, /es) from the end of the pathname
        if (pathname.endsWith('/ru/') || pathname.endsWith('/es/')) {
            pathname = pathname.slice(0, -3);
        } else if (pathname.endsWith('/ru') || pathname.endsWith('/es')) {
            pathname = pathname.slice(0, -2);
        }

        if (!pathname.endsWith('/')) {
            pathname += '/';
        }

        return pathname;
    } catch (e) {
        return '/';
    }
}

function resolveAppPath(relativePath, urlLocation) {
    const basePath = getAppBaseUrl(urlLocation);
    const cleanRelative = (relativePath || '').replace(/^\/+/, '');
    return basePath + cleanRelative;
}

if (typeof window !== 'undefined') {
    window.PaceFlowAppBaseUrl = { getAppBaseUrl, resolveAppPath };
    window.getAppBaseUrl = getAppBaseUrl;
    window.resolveAppPath = resolveAppPath;
    window.appBaseUrl = getAppBaseUrl();
}

if (typeof globalThis !== 'undefined') {
    globalThis.getAppBaseUrl = getAppBaseUrl;
    globalThis.resolveAppPath = resolveAppPath;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getAppBaseUrl, resolveAppPath };
}
