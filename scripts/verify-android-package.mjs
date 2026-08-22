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
    const targetApk = join(root, 'artifacts', 'android-r5', 'HummingRead-R5-debug.apk');
    const targetAab = join(root, 'artifacts', 'android-r5', 'HummingRead-R5-review-UNSIGNED-NOT-FOR-UPLOAD.aab');
    const buildSummaryPath = join(root, 'artifacts', 'android-r5', 'build-summary.json');
    const checksumPath = join(root, 'artifacts', 'android-r5', 'checksums.sha256');
    for (const [artifactPath, label] of [[targetApk, 'APK'], [targetAab, 'AAB']]) {
        if (!existsSync(artifactPath)) {
            throw new Error(`VAL-R5-ARTIFACT Failed: fresh R5 ${label} missing at ${artifactPath}.`);
        }
    }
    if (!existsSync(buildSummaryPath) || !existsSync(checksumPath)) {
        throw new Error('VAL-R5-ARTIFACT Failed: R5 build-summary.json and checksums.sha256 are required.');
    }

    const apkBuffer = await readFile(targetApk);
    const aabBuffer = await readFile(targetAab);
    if (apkBuffer.length <= 100000 || aabBuffer.length <= 100000) {
        throw new Error('VAL-R5-ARTIFACT Failed: R5 APK or AAB is implausibly small.');
    }
    const actualSha256 = createHash('sha256').update(apkBuffer).digest('hex');
    const aabSha256 = createHash('sha256').update(aabBuffer).digest('hex');
    const buildSummary = JSON.parse(await readFile(buildSummaryPath, 'utf8'));
    const testedSourceSha = process.env.TESTED_SOURCE_SHA;
    if (!testedSourceSha || buildSummary.testedSourceSha !== testedSourceSha) {
        throw new Error(`VAL-R5-ARTIFACT source mismatch: expected ${testedSourceSha || 'TESTED_SOURCE_SHA missing'}, got ${buildSummary.testedSourceSha || 'unknown'}.`);
    }
    if (buildSummary.apkSha256 !== actualSha256 || buildSummary.aabSha256 !== aabSha256) {
        throw new Error('VAL-R5-ARTIFACT Failed: computed APK/AAB hashes do not match build-summary.json.');
    }
    const checksumContent = await readFile(checksumPath, 'utf8');
    if (!checksumContent.includes(actualSha256) || !checksumContent.includes(aabSha256)) {
        throw new Error('VAL-R5-ARTIFACT Failed: computed APK/AAB hashes are missing from checksums.sha256.');
    }
    console.log(`   Target APK located: ${targetApk}`);
    console.log(`   Computed APK SHA-256: ${actualSha256}`);
    console.log(`   Target AAB located: ${targetAab}`);
    console.log(`   Computed AAB SHA-256: ${aabSha256}`);

    console.log('Android package verification PASSED: SDK 36, AGP 8.5, Java 21, zero dangerous permissions, clean native asset stripping, APK & AAB SHA-256 verified.\n');
}

runPackageAudit().catch((err) => {
    console.error(err);
    process.exit(1);
});
