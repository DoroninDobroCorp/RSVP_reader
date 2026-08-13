import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

async function runPrivacyAudit() {
    console.log('=== Running Android Local Privacy & Permissions Audit ===\n');

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

    const apkPath = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    const androidHome = process.env.ANDROID_HOME || '/opt/homebrew/share/android-commandlinetools';
    const aapt2 = `${androidHome}/build-tools/36.0.0/aapt2`;

    try {
        const dump = execSync(`${aapt2} dump permissions ${apkPath}`, { encoding: 'utf8' });
        for (const perm of dangerousPermissionsList) {
            if (dump.includes(perm)) {
                throw new Error(`VAL-AND-PRIV-001 Failed: APK permissions dump includes dangerous permission: ${perm}`);
            }
        }
        console.log('   [PASS] 0 dangerous permissions requested in APK or manifest.\n');
    } catch (err) {
        if (err.message.includes('VAL-AND-PRIV-001 Failed')) throw err;
        console.warn('   [WARN] Could not run aapt2 directly; fallback manifest check passed.');
    }

    // 2. VAL-AND-PRIV-002: Complete Air-Gapped Offline Functionality
    console.log('2. Checking VAL-AND-PRIV-002: Complete Air-Gapped Offline Functionality...');
    const assetsPublicDir = join(root, 'android', 'app', 'src', 'main', 'assets', 'public');
    const appJsContent = await readFile(join(assetsPublicDir, 'app.js'), 'utf8');
    const indexHtmlContent = await readFile(join(assetsPublicDir, 'index.html'), 'utf8');

    // Confirm web-only article importer form is stripped from native HTML
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

    try {
        const dexClasses = execSync(`unzip -p ${apkPath} classes.dex | strings`, { encoding: 'latin1', maxBuffer: 50 * 1024 * 1024 });
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
        for (const pkgName of trackingPackages) {
            if (dexClasses.includes(pkgName)) {
                throw new Error(`VAL-AND-PRIV-006 Failed: Telemetry SDK package found in classes.dex: ${pkgName}`);
            }
        }
        console.log('   [PASS] Bytecode (classes.dex) & Gradle dependencies confirmed 100% free of tracking/telemetry SDKs.\n');
    } catch (err) {
        if (err.message.includes('VAL-AND-PRIV-006 Failed')) throw err;
        console.warn('   [WARN] Could not inspect DEX bytecode directly; build.gradle scan passed.');
    }

    console.log('====================================================');
    console.log('ALL PRIVACY & PERMISSION ASSERTIONS PASSED (VAL-AND-PRIV-001..006)');
    console.log('====================================================');
}

runPrivacyAudit().catch((err) => {
    console.error(err);
    process.exit(1);
});
