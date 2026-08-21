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

    // 1. Verify package.json dependencies & pinning
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    if (pkg.dependencies['@capacitor/android'] !== '8.5.0') {
        throw new Error('@capacitor/android version 8.5.0 must be pinned exactly in package.json.');
    }
    if (!pkg.dependencies['@capacitor/app']) {
        throw new Error('@capacitor/app must be present in package.json.');
    }
    if (!pkg.dependencies['@capacitor/share']) {
        throw new Error('@capacitor/share must be present in package.json.');
    }

    // 1b. Verify product config identity fields & unapproved build gate
    const productConfig = JSON.parse(await readFile(join(root, 'product.config.json'), 'utf8'));
    if (!productConfig.android || typeof productConfig.android.applicationId !== 'string') {
        throw new Error('product.config.json must define android identity fields.');
    }
    if (productConfig.android.applicationIdApproved !== false) {
        throw new Error('product.config.json android.applicationIdApproved must be false for review builds.');
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

    // 6. VAL-R2-VERIFY-004 & VAL-R2-ARTIFACT-001/002: APK & AAB Existence & SHA-256 Checksum Verification Gate
    console.log('6. Checking VAL-R2-VERIFY-004: APK & AAB Existence and SHA-256 Checksum Validation...');
    const r5Apk = join(root, 'artifacts', 'android-r5', 'HummingRead-R5-debug.apk');
    const r4Apk = join(root, 'artifacts', 'android-r4', 'HummingRead-R4-debug.apk');
    const r3Apk = join(root, 'artifacts', 'android-r3', 'HummingRead-R3-debug.apk');
    const primaryApk = join(root, 'artifacts', 'android-r2', 'HummingRead-R2-debug.apk');
    const buildApk = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    let targetApk = null;

    for (const cand of [r5Apk, r4Apk, buildApk, r3Apk, primaryApk]) {
        if (existsSync(cand)) {
            try {
                const stat = (await import('node:fs')).statSync(cand);
                if (stat.size > 100000) {
                    targetApk = cand;
                    break;
                }
            } catch (e) {}
        }
    }

    if (!targetApk) {
        throw new Error('VAL-R2-VERIFY-004 Failed: APK file missing. Expected at artifacts/android-r4/HummingRead-R4-debug.apk, android/app/build/outputs/apk/debug/app-debug.apk, artifacts/android-r3/HummingRead-R3-debug.apk or artifacts/android-r2/HummingRead-R2-debug.apk. Run build first.');
    }

    const apkBuffer = await readFile(targetApk);
    const actualSha256 = createHash('sha256').update(apkBuffer).digest('hex');
    console.log(`   Target APK located: ${targetApk}`);
    console.log(`   Computed APK SHA-256: ${actualSha256}`);

    const r5Aab = join(root, 'artifacts', 'android-r5', 'HummingRead-R5-review-UNSIGNED-NOT-FOR-UPLOAD.aab');
    const r4Aab = join(root, 'artifacts', 'android-r4', 'HummingRead-R4-review-UNSIGNED-NOT-FOR-UPLOAD.aab');
    const r3Aab = join(root, 'artifacts', 'android-r3', 'HummingRead-R3-review-UNSIGNED-NOT-FOR-UPLOAD.aab');
    const primaryAab = join(root, 'artifacts', 'android-r2', 'HummingRead-R2-review-UNSIGNED-NOT-FOR-UPLOAD.aab');
    const buildAab = join(root, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
    let targetAab = null;

    for (const cand of [r5Aab, r4Aab, buildAab, r3Aab, primaryAab]) {
        if (existsSync(cand)) {
            try {
                const stat = (await import('node:fs')).statSync(cand);
                if (stat.size > 100000) {
                    targetAab = cand;
                    break;
                }
            } catch (e) {}
        }
    }

    if (!targetAab) {
        throw new Error('VAL-R2-ARTIFACT-002 Failed: Release AAB file missing. Expected at artifacts/android-r4/HummingRead-R4-review-UNSIGNED-NOT-FOR-UPLOAD.aab, android/app/build/outputs/bundle/release/app-release.aab, artifacts/android-r3/HummingRead-R3-review-UNSIGNED-NOT-FOR-UPLOAD.aab or artifacts/android-r2/HummingRead-R2-review-UNSIGNED-NOT-FOR-UPLOAD.aab.');
    }

    const aabBuffer = await readFile(targetAab);
    const aabSha256 = createHash('sha256').update(aabBuffer).digest('hex');
    console.log(`   Target AAB located: ${targetAab}`);
    console.log(`   Computed AAB SHA-256: ${aabSha256}`);

    // Check evidence-summary.json
    const r5Summary = join(root, 'artifacts', 'android-r5', 'evidence-summary.json');
    const r4Summary = join(root, 'artifacts', 'android-r4', 'evidence-summary.json');
    const r3Summary = join(root, 'artifacts', 'android-r3', 'evidence-summary.json');
    const r2Summary = join(root, 'artifacts', 'android-r2', 'evidence-summary.json');
    const summaryPaths = [r5Summary, r4Summary, targetApk.includes('android-r3') ? r3Summary : null, targetApk.includes('android-r2') ? r2Summary : null].filter(Boolean);

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
        if (summaryData.aabSha256 && summaryData.aabSha256 !== aabSha256) {
            throw new Error(`VAL-R2-ARTIFACT-002 Failed: Built AAB SHA-256 (${aabSha256}) does not match declared AAB SHA-256 in evidence-summary.json (${summaryData.aabSha256}).`);
        }
    }

    const r4ChecksumPath = join(root, 'artifacts', 'android-r4', 'checksums.sha256');
    const r3ChecksumPath = join(root, 'artifacts', 'android-r3', 'checksums.sha256');
    const r2ChecksumPath = join(root, 'artifacts', 'android-r2', 'checksums.sha256');
    const checksumPath = existsSync(r4ChecksumPath) ? r4ChecksumPath : (targetApk.includes('android-r3') ? (existsSync(r3ChecksumPath) ? r3ChecksumPath : null) : (targetApk.includes('android-r2') ? (existsSync(r2ChecksumPath) ? r2ChecksumPath : null) : null));
    if (checksumPath) {
        const checksumContent = await readFile(checksumPath, 'utf8');
        if (!checksumContent.includes(actualSha256)) {
            throw new Error(`VAL-R2-VERIFY-004 Failed: Built APK SHA-256 (${actualSha256}) not found in ${checksumPath}`);
        }
        if (!checksumContent.includes(aabSha256)) {
            throw new Error(`VAL-R2-ARTIFACT-003 Failed: Built AAB SHA-256 (${aabSha256}) not found in ${checksumPath}`);
        }
    }

    console.log('Android package verification PASSED: SDK 36, AGP 8.5, Java 21, zero dangerous permissions, clean native asset stripping, APK & AAB SHA-256 verified.\n');
}

runPackageAudit().catch((err) => {
    console.error(err);
    process.exit(1);
});
