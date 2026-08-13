import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('VAL-R2-ARTIFACT-001..006: Android R2 Server Artifacts & Evidence Package', async () => {
    // 1. VAL-R2-ARTIFACT-001: Durably Stored Debug Tester APK Generation
    const apkPath = join(root, 'artifacts', 'android-r2', 'HummingRead-R2-debug.apk');
    assert.ok(existsSync(apkPath), 'HummingRead-R2-debug.apk must exist at artifacts/android-r2/HummingRead-R2-debug.apk');

    const apkBuffer = await readFile(apkPath);
    const apkSha256 = createHash('sha256').update(apkBuffer).digest('hex');
    assert.ok(apkSha256 && apkSha256.length === 64, 'APK SHA-256 must be a 64-character hex string');

    // 2. VAL-R2-ARTIFACT-002: Unsigned Review AAB Candidate Generation
    const aabPath = join(root, 'artifacts', 'android-r2', 'HummingRead-R2-review-UNSIGNED-NOT-FOR-UPLOAD.aab');
    assert.ok(existsSync(aabPath), 'HummingRead-R2-review-UNSIGNED-NOT-FOR-UPLOAD.aab must exist at artifacts/android-r2/HummingRead-R2-review-UNSIGNED-NOT-FOR-UPLOAD.aab');

    const aabBuffer = await readFile(aabPath);
    const aabSha256 = createHash('sha256').update(aabBuffer).digest('hex');
    assert.ok(aabSha256 && aabSha256.length === 64, 'AAB SHA-256 must be a 64-character hex string');

    // 3. VAL-R2-ARTIFACT-003: SHA-256 Checksum Manifest Generation
    const checksumsPath = join(root, 'artifacts', 'android-r2', 'checksums.sha256');
    assert.ok(existsSync(checksumsPath), 'checksums.sha256 must exist at artifacts/android-r2/checksums.sha256');

    const checksumsContent = await readFile(checksumsPath, 'utf8');
    assert.ok(checksumsContent.includes(apkSha256), `checksums.sha256 must contain APK hash ${apkSha256}`);
    assert.ok(checksumsContent.includes('HummingRead-R2-debug.apk'), 'checksums.sha256 must reference HummingRead-R2-debug.apk');
    assert.ok(checksumsContent.includes(aabSha256), `checksums.sha256 must contain AAB hash ${aabSha256}`);
    assert.ok(checksumsContent.includes('HummingRead-R2-review-UNSIGNED-NOT-FOR-UPLOAD.aab'), 'checksums.sha256 must reference HummingRead-R2-review-UNSIGNED-NOT-FOR-UPLOAD.aab');

    // 4. VAL-R2-ARTIFACT-004: Comprehensive Machine-Readable evidence-summary.json Assembly
    const summaryPath = join(root, 'artifacts', 'android-r2', 'evidence-summary.json');
    assert.ok(existsSync(summaryPath), 'evidence-summary.json must exist at artifacts/android-r2/evidence-summary.json');

    const summaryData = JSON.parse(await readFile(summaryPath, 'utf8'));
    assert.ok(summaryData.commitSha || summaryData.gitSha, 'evidence-summary.json must contain commitSha/gitSha');
    assert.equal(summaryData.jdkVersion, '21', 'JDK version must be 21');
    assert.equal(summaryData.androidSdkLevel, 36, 'Android SDK level must be 36');
    assert.equal(summaryData.apkSha256, apkSha256, 'apkSha256 in summary must match computed APK SHA-256');
    assert.equal(summaryData.aabSha256, aabSha256, 'aabSha256 in summary must match computed AAB SHA-256');
    assert.equal(summaryData.unitTestStatus, 'PASSED', 'unitTestStatus must be PASSED');
    assert.equal(summaryData.builtTestStatus, 'PASSED', 'builtTestStatus must be PASSED');
    assert.equal(summaryData.masterVerificationStatus, 'PASSED', 'masterVerificationStatus must be PASSED');
    assert.equal(summaryData.emulatorQaStatus, 'PASSED', 'emulatorQaStatus must be PASSED');
    assert.ok(Array.isArray(summaryData.avds) && summaryData.avds.includes('test_avd_api36'), 'avds array must contain test_avd_api36');
    assert.ok(summaryData.assertions['VAL-R2-ARTIFACT-001'], 'Assertions map must contain VAL-R2-ARTIFACT-001');

    // 5. VAL-R2-ARTIFACT-005: Automated Documentation Evidence Package Updates
    const releaseEvidence = await readFile(join(root, 'docs', 'RELEASE_EVIDENCE.md'), 'utf8');
    const androidArch = await readFile(join(root, 'docs', 'ANDROID_ARCHITECTURE.md'), 'utf8');
    const androidTesterGuide = await readFile(join(root, 'docs', 'ANDROID_TESTER_GUIDE.md'), 'utf8');
    const readme = await readFile(join(root, 'README.md'), 'utf8');

    assert.ok(releaseEvidence.includes('HummingRead-R2-debug.apk'), 'docs/RELEASE_EVIDENCE.md must reference HummingRead-R2-debug.apk');
    assert.ok(releaseEvidence.includes('HummingRead-R2-review-UNSIGNED-NOT-FOR-UPLOAD.aab'), 'docs/RELEASE_EVIDENCE.md must reference HummingRead-R2-review-UNSIGNED-NOT-FOR-UPLOAD.aab');
    assert.ok(androidArch.includes('HummingRead R2 Android Architecture'), 'docs/ANDROID_ARCHITECTURE.md must contain architecture title');
    assert.ok(androidArch.includes('artifacts/android-r2/'), 'docs/ANDROID_ARCHITECTURE.md must reference artifacts/android-r2/');
    assert.ok(androidTesterGuide.includes('HummingRead Android Tester Guide'), 'docs/ANDROID_TESTER_GUIDE.md must contain tester guide title');
    assert.ok(androidTesterGuide.includes('artifacts/android-r2/checksums.sha256'), 'docs/ANDROID_TESTER_GUIDE.md must reference checksums.sha256');
    assert.ok(readme.includes('artifacts/android-r2/HummingRead-R2-debug.apk'), 'README.md must reference HummingRead-R2-debug.apk');
    assert.ok(readme.includes('package-release-r2.mjs'), 'README.md must reference package-release-r2.mjs');

    // 6. VAL-R2-ARTIFACT-006: Local vs Remote Git Commit SHA Synchronization Verification Helper
    const { packageReleaseR2 } = await import('../../scripts/package-release-r2.mjs');
    const result = await packageReleaseR2({ writeFiles: false });
    assert.ok(result.commitSha, 'packageReleaseR2 result must return commitSha');
    assert.ok(result.apkSha256, 'packageReleaseR2 result must return apkSha256');
    assert.ok(result.aabSha256, 'packageReleaseR2 result must return aabSha256');
});
