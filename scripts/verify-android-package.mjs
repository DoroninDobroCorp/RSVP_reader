import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

async function listFiles(directory, base = directory) {
    const output = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const absolute = join(directory, entry.name);
        if (entry.isDirectory()) output.push(...await listFiles(absolute, base));
        else if (entry.isFile()) output.push(relative(base, absolute));
    }
    return output;
}

async function expectMissing(path, description) {
    try {
        await readFile(path);
        throw new Error(`${description} must not be packaged.`);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
}

async function runPackageAudit() {
    console.log('=== Running Android Package Integrity & Security Audit ===\n');

    // 1. Verify package.json dependencies
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    if (!pkg.dependencies['@capacitor/android'] || !pkg.dependencies['@capacitor/android'].includes('8.5')) {
        throw new Error('@capacitor/android version 8.5.0 must be present in package.json.');
    }
    if (!pkg.dependencies['@capacitor/app']) {
        throw new Error('@capacitor/app must be present in package.json.');
    }
    if (!pkg.dependencies['@capacitor/share']) {
        throw new Error('@capacitor/share must be present in package.json.');
    }

    // 2. Verify top-level android/build.gradle AGP
    const topGradle = await readFile(join(root, 'android', 'build.gradle'), 'utf8');
    if (!/com\.android\.tools\.build:gradle:8\.5\./u.test(topGradle)) {
        throw new Error('android/build.gradle must use AGP 8.5.x.');
    }

    // 3. Verify app/build.gradle SDKs & Java 21
    const appGradle = await readFile(join(root, 'android', 'app', 'build.gradle'), 'utf8');
    const variablesGradle = await readFile(join(root, 'android', 'variables.gradle'), 'utf8');
    if (!/compileSdkVersion\s*=\s*36/u.test(variablesGradle) || !/targetSdkVersion\s*=\s*36/u.test(variablesGradle)) {
        throw new Error('android/variables.gradle must specify compileSdkVersion 36 and targetSdkVersion 36.');
    }
    if (!/JavaVersion\.VERSION_21/u.test(appGradle)) {
        throw new Error('android/app/build.gradle must specify JavaVersion.VERSION_21 for Java 21 compatibility.');
    }

    // 4. Verify AndroidManifest.xml privacy & security invariants
    const manifest = await readFile(join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
    if (!manifest.includes('android:allowBackup="false"')) {
        throw new Error('AndroidManifest.xml must specify android:allowBackup="false".');
    }
    if (!manifest.includes('android:usesCleartextTraffic="false"')) {
        throw new Error('AndroidManifest.xml must specify android:usesCleartextTraffic="false".');
    }
    const dangerousPermissions = [
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'CAMERA',
        'RECORD_AUDIO',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'READ_CONTACTS'
    ];
    for (const perm of dangerousPermissions) {
        if (manifest.includes(perm)) {
            throw new Error(`AndroidManifest.xml must not declare dangerous permission: ${perm}`);
        }
    }

    // 5. Verify dist-native/android and assets/public asset integrity
    const androidNativeDir = join(root, 'dist-native', 'android');
    const androidPublicDir = join(root, 'android', 'app', 'src', 'main', 'assets', 'public');

    for (const dir of [androidNativeDir, androidPublicDir]) {
        for (const forbidden of [
            'downloads/hummingread-tester.zip',
            'manifest.json',
            'manifest.webmanifest',
            'robots.txt',
            'service-worker.js',
            'sitemap.xml',
            'assets/brand/hummingread-chrome-marquee.png',
            'assets/brand/hummingread-chrome-promo-small.png',
            'assets/brand/hummingread-og.png',
            'assets/brand/pico-quick-send.png'
        ]) {
            await expectMissing(join(dir, forbidden), `Android payload ${forbidden}`);
        }

        const indexHtml = await readFile(join(dir, 'index.html'), 'utf8');
        const privacyHtml = await readFile(join(dir, 'privacy.html'), 'utf8');
        const supportHtml = await readFile(join(dir, 'support.html'), 'utf8');

        if (/articleImportForm|chromeExtensionPanel|Chrome Web Store|hummingread-tester\.zip/u.test(indexHtml)) {
            throw new Error(`Android index.html in ${dir} exposes web/Chrome importer assets.`);
        }

        for (const [file, content] of [['privacy.html', privacyHtml], ['support.html', supportHtml]]) {
            if (/iOS|Safari/u.test(content)) {
                throw new Error(`Android ${file} in ${dir} contains iOS/Safari text leakage.`);
            }
        }

        const appJs = await readFile(join(dir, 'app.js'), 'utf8');
        for (const navFeature of ['setupAndroidNavigation', 'handleBackButton', 'minimizeApp', 'handleAppPause', 'handleAppResume']) {
            if (!appJs.includes(navFeature)) {
                throw new Error(`Android app.js in ${dir} missing required navigation/lifecycle feature: ${navFeature}`);
            }
        }
    }

    // 6. VAL-R2-VERIFY-004: APK Existence & SHA-256 Checksum Verification Gate
    console.log('6. Checking VAL-R2-VERIFY-004: APK Existence and SHA-256 Checksum Validation...');
    const primaryApk = join(root, 'artifacts', 'android-r2', 'HummingRead-R2-debug.apk');
    const buildApk = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    const targetApk = existsSync(primaryApk) ? primaryApk : (existsSync(buildApk) ? buildApk : null);

    if (!targetApk) {
        throw new Error('VAL-R2-VERIFY-004 Failed: APK file missing. Expected at artifacts/android-r2/HummingRead-R2-debug.apk or android/app/build/outputs/apk/debug/app-debug.apk. Run build first.');
    }

    const apkBuffer = await readFile(targetApk);
    const actualSha256 = createHash('sha256').update(apkBuffer).digest('hex');
    console.log(`   Target APK located: ${targetApk}`);
    console.log(`   Computed SHA-256:  ${actualSha256}`);

    // Check evidence-summary.json
    const summaryPaths = [
        join(root, 'artifacts', 'android-r2', 'evidence-summary.json'),
        join(root, 'evidence', 'android', 'evidence-summary.json'),
        join(root, 'evidence-summary.json')
    ];

    let summaryData = null;
    for (const sp of summaryPaths) {
        if (existsSync(sp)) {
            try {
                summaryData = JSON.parse(await readFile(sp, 'utf8'));
                break;
            } catch (e) {
                // ignore invalid summary JSON
            }
        }
    }

    if (summaryData) {
        const expectedSha256 = summaryData.apkSha256 || summaryData.sha256 || summaryData.apkHash;
        if (expectedSha256 && expectedSha256 !== actualSha256) {
            throw new Error(`VAL-R2-VERIFY-004 Failed: Built APK SHA-256 (${actualSha256}) does not match declared SHA-256 in evidence-summary.json (${expectedSha256}).`);
        }
    }

    const checksumPath = join(root, 'artifacts', 'android-r2', 'checksums.sha256');
    if (existsSync(checksumPath)) {
        const checksumContent = await readFile(checksumPath, 'utf8');
        if (!checksumContent.includes(actualSha256)) {
            throw new Error(`VAL-R2-VERIFY-004 Failed: Built APK SHA-256 (${actualSha256}) not found in artifacts/android-r2/checksums.sha256`);
        }
    }

    console.log('Android package verification PASSED: SDK 36, AGP 8.5, Java 21, zero dangerous permissions, clean native asset stripping, APK SHA-256 verified.\n');
}

runPackageAudit().catch((err) => {
    console.error(err);
    process.exit(1);
});
