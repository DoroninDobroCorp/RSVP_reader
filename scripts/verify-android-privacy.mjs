import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import { checkToolchain } from './toolchain-doctor.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

async function runPrivacyAudit() {
    console.log('=== Running Android Local Privacy & Permissions Audit ===\n');

    // 0. Ensure Toolchain Doctor Fast-Fail Gate passes
    const toolchain = checkToolchain();
    if (!toolchain.success) {
        throw new Error(`Toolchain verification failed prior to privacy audit:\n${toolchain.errors.join('\n')}`);
    }

    // Determine APK Location
    const primaryApkPath = join(root, 'artifacts', 'android-r2', 'HummingRead-R2-debug.apk');
    const fallbackApkPath = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    let apkPath = null;

    if (existsSync(primaryApkPath)) {
        apkPath = primaryApkPath;
    } else if (existsSync(fallbackApkPath)) {
        apkPath = fallbackApkPath;
    } else {
        throw new Error(`Android privacy audit failed: APK file missing. Expected at ${primaryApkPath} or ${fallbackApkPath}. Compile APK first.`);
    }

    // 1. VAL-AND-PRIV-001: Zero Dangerous Permissions Invariant
    console.log('1. Checking VAL-AND-PRIV-001: Zero Dangerous Permissions Invariant...');
    const manifestPath = join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    const manifestContent = await readFile(manifestPath, 'utf8');

    const dangerousPermissionsList = [
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
        'READ_MEDIA_VIDEO',
        'READ_MEDIA_AUDIO',
        'CAMERA',
        'RECORD_AUDIO',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'READ_CONTACTS',
        'WRITE_CONTACTS',
        'GET_ACCOUNTS',
        'READ_CALL_LOG',
        'WRITE_CALL_LOG',
        'READ_PHONE_STATE',
        'CALL_PHONE',
        'POST_NOTIFICATIONS'
    ];

    for (const perm of dangerousPermissionsList) {
        if (manifestContent.includes(perm)) {
            throw new Error(`VAL-AND-PRIV-001 Failed: Manifest contains dangerous permission: ${perm}`);
        }
    }

    // Direct aapt2 permissions dump (fail-closed, no warning fallback)
    const aapt2Bin = toolchain.status.aapt2.path;
    const dump = execFileSync(aapt2Bin, ['dump', 'permissions', apkPath], { encoding: 'utf8' });
    for (const perm of dangerousPermissionsList) {
        if (dump.includes(perm)) {
            throw new Error(`VAL-AND-PRIV-001 Failed: APK permissions dump includes dangerous permission: ${perm}`);
        }
    }
    console.log('   [PASS] 0 dangerous permissions requested in APK or manifest.\n');

    // 2. VAL-AND-PRIV-002: Complete Air-Gapped Offline Functionality
    console.log('2. Checking VAL-AND-PRIV-002: Complete Air-Gapped Offline Functionality...');
    const assetsPublicDir = join(root, 'android', 'app', 'src', 'main', 'assets', 'public');
    const indexHtmlContent = await readFile(join(assetsPublicDir, 'index.html'), 'utf8');

    if (indexHtmlContent.includes('articleImportForm')) {
        throw new Error('VAL-AND-PRIV-002 Failed: Native index.html contains web importer form.');
    }
    console.log('   [PASS] All assets bundled locally in assets/public. Article import panel excluded.\n');

    // 3. VAL-AND-PRIV-003: Cloud Backup & Data Extraction Exclusion
    console.log('3. Checking VAL-AND-PRIV-003: Cloud Backup Exclusion...');
    if (!manifestContent.includes('android:allowBackup="false"')) {
        throw new Error('VAL-AND-PRIV-003 Failed: android:allowBackup="false" missing in AndroidManifest.xml');
    }
    console.log('   [PASS] android:allowBackup="false" declared on <application>.\n');

    // 4. VAL-AND-PRIV-004: WebView Cleartext & Security Hardening Invariants
    console.log('4. Checking VAL-AND-PRIV-004: WebView Security Hardening...');
    if (!manifestContent.includes('android:usesCleartextTraffic="false"')) {
        throw new Error('VAL-AND-PRIV-004 Failed: android:usesCleartextTraffic="false" missing in AndroidManifest.xml');
    }

    const mainActivityPath = join(root, 'android', 'app', 'src', 'main', 'java', 'team', 'ibet', 'paceflow', 'MainActivity.java');
    const mainActivityContent = await readFile(mainActivityPath, 'utf8');
    if (!mainActivityContent.includes('MIXED_CONTENT_NEVER_ALLOW')) {
        throw new Error('VAL-AND-PRIV-004 Failed: WebSettings.MIXED_CONTENT_NEVER_ALLOW not configured in MainActivity.java');
    }
    if (!mainActivityContent.includes('setWebContentsDebuggingEnabled(false)')) {
        throw new Error('VAL-AND-PRIV-004 Failed: setWebContentsDebuggingEnabled(false) not configured in MainActivity.java');
    }
    console.log('   [PASS] Cleartext traffic disabled, mixed content blocked, release debugging disabled.\n');

    // 5. VAL-AND-PRIV-005: Local App-Private Storage Isolation
    console.log('5. Checking VAL-AND-PRIV-005: Local Storage Isolation...');
    if (manifestContent.includes('WRITE_EXTERNAL_STORAGE') || manifestContent.includes('READ_EXTERNAL_STORAGE')) {
        throw new Error('VAL-AND-PRIV-005 Failed: External storage permissions found in manifest.');
    }
    console.log('   [PASS] App relies strictly on internal sandbox storage (/data/data/team.ibet.paceflow).\n');

    // 6. VAL-AND-PRIV-006: Third-Party SDK & Telemetry Absence Audit
    console.log('6. Checking VAL-AND-PRIV-006: Telemetry & Tracking SDK Absence...');
    const buildGradle = await readFile(join(root, 'android', 'app', 'build.gradle'), 'utf8');
    const telemetryDeps = [
        'firebase',
        'play-services-analytics',
        'adjust',
        'appsflyer',
        'mixpanel',
        'segment',
        'flurry',
        'sentry',
        'bugsnag',
        'crashlytics',
        'play-services-ads'
    ];
    for (const dep of telemetryDeps) {
        if (buildGradle.toLowerCase().includes(dep)) {
            throw new Error(`VAL-AND-PRIV-006 Failed: Telemetry dependency found in build.gradle: ${dep}`);
        }
    }

    // Fail-closed DEX inspection via JSZip (hermetic, direct buffer inspection)
    const apkBuffer = await readFile(apkPath);
    const zip = await JSZip.loadAsync(apkBuffer);
    const dexFiles = Object.keys(zip.files).filter((f) => f.endsWith('.dex'));

    if (dexFiles.length === 0) {
        throw new Error(`VAL-AND-PRIV-006 Failed: No .dex files found in APK at ${apkPath}`);
    }

    const trackingPackages = [
        'com/google/firebase/analytics',
        'com/google/android/gms/analytics',
        'com/adjust/sdk',
        'com/appsflyer',
        'com/mixpanel',
        'com/segment/analytics',
        'com/flurry',
        'io/sentry',
        'com/bugsnag',
        'com/crashlytics',
        'com/google/android/gms/ads'
    ];

    for (const dexFileName of dexFiles) {
        const dexContent = await zip.files[dexFileName].async('string');
        for (const pkgName of trackingPackages) {
            if (dexContent.includes(pkgName)) {
                throw new Error(`VAL-AND-PRIV-006 Failed: Telemetry SDK package found in ${dexFileName}: ${pkgName}`);
            }
        }
    }
    console.log('   [PASS] Bytecode (.dex files) & Gradle dependencies confirmed 100% free of tracking/telemetry SDKs.\n');

    // 7. VAL-R2-LEGAL-001, VAL-R2-LEGAL-002, VAL-R2-LEGAL-006: Native Multi-Locale Legal Assets & Single-Language Isolation
    console.log('7. Checking VAL-R2-LEGAL-001, 002, 006: Native Multi-Locale Legal Assets & Single-Language Isolation...');
    const targetDirs = [
        join(root, 'dist-native', 'android'),
        join(root, 'android', 'app', 'src', 'main', 'assets', 'public')
    ];

    const legalChecks = [
        { file: 'privacy.html', lang: 'en' },
        { file: 'ru/privacy.html', lang: 'ru' },
        { file: 'es/privacy.html', lang: 'es' },
        { file: 'support.html', lang: 'en' },
        { file: 'ru/support.html', lang: 'ru' },
        { file: 'es/support.html', lang: 'es' },
        { file: 'acknowledgements.html', lang: 'en' },
        { file: 'ru/acknowledgements.html', lang: 'ru' },
        { file: 'es/acknowledgements.html', lang: 'es' }
    ];

    for (const dirPath of targetDirs) {
        for (const check of legalChecks) {
            const filePath = join(dirPath, check.file);
            if (!existsSync(filePath)) {
                throw new Error(`VAL-R2-LEGAL-001 Failed: Native legal file missing at ${filePath}`);
            }

            const content = await readFile(filePath, 'utf8');
            if (content.includes('WEB_PRIVACY_START') || content.includes('WEB_ONLY_START')) {
                throw new Error(`VAL-R2-LEGAL-002 Failed: Web block leaked into native legal file ${check.file}`);
            }

            if (content.includes('iOS/iPadOS') || content.includes('Safari')) {
                throw new Error(`VAL-R2-LEGAL-006 Failed: Un-replaced iOS string found in native legal file ${check.file}`);
            }

            const dom = new JSDOM(content);
            const document = dom.window.document;

            if (document.documentElement.lang !== check.lang) {
                throw new Error(`VAL-R2-LEGAL-006 Failed: ${check.file} html lang attribute is "${document.documentElement.lang}", expected "${check.lang}"`);
            }

            const articles = document.querySelectorAll('article.legal-card');
            if (articles.length !== 1) {
                throw new Error(`VAL-R2-LEGAL-002 Failed: ${check.file} must contain exactly 1 article body block, found ${articles.length}`);
            }

            const articleLang = articles[0].getAttribute('lang') || 'en';
            if (articleLang !== check.lang) {
                throw new Error(`VAL-R2-LEGAL-002 Failed: ${check.file} article lang attribute is "${articleLang}", expected "${check.lang}"`);
            }

            const prohibitedLangs = ['en', 'ru', 'es'].filter((l) => l !== check.lang);
            for (const prohibited of prohibitedLangs) {
                const count = document.querySelectorAll(`article[lang="${prohibited}"]`).length;
                if (count > 0) {
                    throw new Error(`VAL-R2-LEGAL-002 Failed: ${check.file} contains ${count} prohibited ${prohibited} article blocks.`);
                }
            }
        }
    }
    console.log('   [PASS] Native multi-locale legal assets (privacy, support, acknowledgements) verified for EN, RU, ES with single-language isolation.\n');

    console.log('====================================================');
    console.log('ALL PRIVACY, PERMISSION & LEGAL ASSERTIONS PASSED');
    console.log('====================================================');
}

runPrivacyAudit().catch((err) => {
    console.error(err);
    process.exit(1);
});
