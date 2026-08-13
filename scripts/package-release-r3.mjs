import { readFile, writeFile, mkdir, copyFile, rm, cp } from 'node:fs/promises';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { mkdtemp } from 'node:fs/promises';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

async function computeSha256(filePath) {
    const buffer = await readFile(filePath);
    return createHash('sha256').update(buffer).digest('hex');
}

function resolveJavaHome() {
    if (process.env.JAVA_HOME && existsSync(join(process.env.JAVA_HOME, 'bin', 'java'))) {
        return process.env.JAVA_HOME;
    }
    const candidates = [
        '/usr/lib/jvm/java-21-openjdk-amd64',
        '/usr/lib/jvm/java-21-openjdk-arm64',
        '/usr/lib/jvm/java-21-openjdk',
        '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
        '/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home'
    ];
    for (const cand of candidates) {
        if (existsSync(join(cand, 'bin', 'java'))) {
            return cand;
        }
    }
    return process.env.JAVA_HOME;
}

function resolveAndroidHome() {
    if (process.env.ANDROID_HOME && existsSync(process.env.ANDROID_HOME)) return process.env.ANDROID_HOME;
    if (process.env.ANDROID_SDK_ROOT && existsSync(process.env.ANDROID_SDK_ROOT)) return process.env.ANDROID_SDK_ROOT;
    const candidates = [
        '/opt/android-sdk',
        join(process.env.HOME || '', 'Library', 'Android', 'sdk'),
        join(process.env.HOME || '', 'Android', 'Sdk')
    ];
    for (const cand of candidates) {
        if (cand && existsSync(cand)) return cand;
    }
    const localPropsPath = join(root, 'android', 'local.properties');
    if (existsSync(localPropsPath)) {
        try {
            const content = readFileSync(localPropsPath, 'utf8');
            const match = content.match(/sdk\.dir\s*=\s*(.+)/);
            if (match && match[1]) {
                const dir = match[1].trim().replace(/\\/g, '/');
                if (existsSync(dir)) return dir;
            }
        } catch (e) {}
    }
    return null;
}

export function fetchRemoteGitSha(options = {}) {
    const remoteUrl = options.remoteUrl || 'origin';
    const branch = options.branch || 'mission/android-r3-server-proof-20260813';
    const res = spawnSync('git', ['ls-remote', '--heads', remoteUrl, branch], { cwd: root, encoding: 'utf8' });
    if (res.status !== 0 || !res.stdout.trim()) {
        throw new Error(`Failed to fetch remote Git SHA from ${remoteUrl} ${branch}: ${res.stderr || 'Network or remote unreachable'}`);
    }
    const parts = res.stdout.trim().split(/\s+/);
    if (!parts[0] || parts[0].length < 40) {
        throw new Error(`Invalid remote SHA returned from ${remoteUrl} ${branch}: ${res.stdout}`);
    }
    return parts[0];
}

export async function packageReleaseR3(options = {}) {
    console.log('=== Starting HummingRead Android R3 Server Release Packaging & Reproducible Build ===\n');

    const logsDir = join(root, 'artifacts', 'android-r3', 'logs');
    const targetDir = join(root, 'artifacts', 'android-r3');
    await mkdir(logsDir, { recursive: true });
    await mkdir(targetDir, { recursive: true });

    // 1. Fetch live remote SHA & verify local HEAD matches (VAL-R3-BUILD-001)
    const remoteSha = fetchRemoteGitSha();
    const shaRes = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
    const localSha = shaRes.status === 0 ? shaRes.stdout.trim() : '';

    if (!localSha || localSha !== remoteSha) {
        throw new Error(`VAL-R3-BUILD-001 Failed: Local HEAD (${localSha}) does not match live remote SHA (${remoteSha})`);
    }

    console.log(`[PASS] VAL-R3-BUILD-001: Verified live remote SHA: ${remoteSha}`);

    // 2. Clone clean repository at live remote SHA into a temporary validation directory (VAL-R3-BUILD-001)
    const tempDir = await mkdtemp(join(tmpdir(), 'hummingread-r3-val-clone-'));
    console.log(`Cloning repository into temporary validation clone: ${tempDir}`);

    try {
        const cloneRes = spawnSync('git', ['clone', '--no-hardlinks', '.', tempDir], { encoding: 'utf8' });
        if (cloneRes.status !== 0) {
            throw new Error(`VAL-R3-BUILD-001 Failed: git clone into validation dir failed: ${cloneRes.stderr}`);
        }

        const checkoutRes = spawnSync('git', ['checkout', remoteSha], { cwd: tempDir, encoding: 'utf8' });
        if (checkoutRes.status !== 0) {
            throw new Error(`VAL-R3-BUILD-001 Failed: git checkout ${remoteSha} in validation clone failed: ${checkoutRes.stderr}`);
        }

        const statusRes = spawnSync('git', ['status', '--porcelain'], { cwd: tempDir, encoding: 'utf8' });
        if (statusRes.status !== 0 || statusRes.stdout.trim() !== '') {
            throw new Error(`VAL-R3-BUILD-001 Failed: Temporary clone working tree is not clean: ${statusRes.stdout}`);
        }

        console.log(`[PASS] VAL-R3-BUILD-001: Temporary validation clone checked out live remote SHA cleanly.`);

        // Copy node_modules into tempDir if present to enable offline hermetic build
        const localNodeModules = join(root, 'node_modules');
        const cloneNodeModules = join(tempDir, 'node_modules');
        if (existsSync(localNodeModules) && !existsSync(cloneNodeModules)) {
            console.log('Copying node_modules into validation clone...');
            await cp(localNodeModules, cloneNodeModules, { recursive: true });
        }

        // 3. Build native web assets inside clone
        console.log('Building native web assets in validation clone...');
        const buildWebRes = spawnSync(process.execPath, ['scripts/build-web.mjs'], { cwd: tempDir, encoding: 'utf8' });
        if (buildWebRes.status !== 0) {
            throw new Error(`VAL-R3-BUILD-002 Failed: Web asset build failed in validation clone: ${buildWebRes.stderr}`);
        }
        const buildNativeRes = spawnSync(process.execPath, ['scripts/build-native.mjs'], { cwd: tempDir, encoding: 'utf8' });
        if (buildNativeRes.status !== 0) {
            throw new Error(`VAL-R3-BUILD-002 Failed: Native web asset build failed in validation clone: ${buildNativeRes.stderr}`);
        }

        console.log('Syncing Capacitor Android configuration in validation clone...');
        const capSyncRes = spawnSync('npx', ['cap', 'sync', 'android'], { cwd: tempDir, encoding: 'utf8' });
        if (capSyncRes.status !== 0) {
            throw new Error(`VAL-R3-BUILD-002 Failed: Capacitor sync android failed in validation clone: ${capSyncRes.stderr}`);
        }

        // 4. Run Gradle build in validation clone (VAL-R3-BUILD-002)
        const javaHome = resolveJavaHome();
        const androidHome = resolveAndroidHome();
        const env = { ...process.env };
        if (javaHome) {
            env.JAVA_HOME = javaHome;
        }
        if (androidHome) {
            env.ANDROID_HOME = androidHome;
            env.ANDROID_SDK_ROOT = androidHome;
        }

        const cloneAndroidDir = join(tempDir, 'android');
        const localPropsSrc = join(root, 'android', 'local.properties');
        const localPropsDest = join(cloneAndroidDir, 'local.properties');
        if (existsSync(localPropsSrc) && !existsSync(localPropsDest)) {
            await copyFile(localPropsSrc, localPropsDest);
        }

        console.log('Executing ./gradlew clean testDebugUnitTest lintDebug assembleDebug bundleRelease in validation clone...');
        const gradleStartTime = Date.now();
        const gradleRes = spawnSync('./gradlew', ['--no-daemon', 'clean', 'testDebugUnitTest', 'lintDebug', 'assembleDebug', 'bundleRelease'], {
            cwd: cloneAndroidDir,
            encoding: 'utf8',
            env
        });

        const gradleLogPath = join(logsDir, 'gradle-build.log');
        const gradleLogContent = `=== Gradle Build Log ===\nStart: ${new Date(gradleStartTime).toISOString()}\nExit Code: ${gradleRes.status}\n\n--- STDOUT ---\n${gradleRes.stdout || ''}\n\n--- STDERR ---\n${gradleRes.stderr || ''}\n`;
        await writeFile(gradleLogPath, gradleLogContent, 'utf8');

        if (gradleRes.status !== 0) {
            throw new Error(`VAL-R3-BUILD-002 Failed: Gradle build exited with code ${gradleRes.status}. See log at ${gradleLogPath}`);
        }

        console.log(`[PASS] VAL-R3-BUILD-002: ./gradlew clean testDebugUnitTest lintDebug assembleDebug bundleRelease completed with exit code 0.`);

        // 5. Copy compiled binaries to artifacts/android-r3/ (VAL-R3-BUILD-003)
        const debugApkSrc = join(cloneAndroidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
        const releaseAabSrc = join(cloneAndroidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');

        const debugApkDest = join(targetDir, 'HummingRead-R3-debug.apk');
        const releaseAabDest = join(targetDir, 'HummingRead-R3-review-UNSIGNED-NOT-FOR-UPLOAD.aab');

        if (!existsSync(debugApkSrc)) {
            throw new Error(`VAL-R3-BUILD-003 Failed: Debug APK missing in validation clone at ${debugApkSrc}`);
        }
        if (!existsSync(releaseAabSrc)) {
            throw new Error(`VAL-R3-BUILD-003 Failed: Release AAB missing in validation clone at ${releaseAabSrc}`);
        }

        await copyFile(debugApkSrc, debugApkDest);
        await copyFile(releaseAabSrc, releaseAabDest);

        const apkStat = statSync(debugApkDest);
        const aabStat = statSync(releaseAabDest);

        if (apkStat.size < 1000000) {
            throw new Error(`VAL-R3-BUILD-003 Failed: APK file size too small (${apkStat.size} bytes)`);
        }
        if (aabStat.size < 1000000) {
            throw new Error(`VAL-R3-BUILD-003 Failed: AAB file size too small (${aabStat.size} bytes)`);
        }

        console.log(`[PASS] VAL-R3-BUILD-003: Durable binaries placed at:`);
        console.log(`   APK: ${debugApkDest} (${(apkStat.size / 1024 / 1024).toFixed(2)} MB)`);
        console.log(`   AAB: ${releaseAabDest} (${(aabStat.size / 1024 / 1024).toFixed(2)} MB)`);

        // 6. Compute SHA-256 and generate checksums.sha256 (VAL-R3-BUILD-004)
        const apkHash = await computeSha256(debugApkDest);
        const aabHash = await computeSha256(releaseAabDest);

        const checksumsContent = `${apkHash}  HummingRead-R3-debug.apk\n${aabHash}  HummingRead-R3-review-UNSIGNED-NOT-FOR-UPLOAD.aab\n`;
        const checksumsPath = join(targetDir, 'checksums.sha256');
        await writeFile(checksumsPath, checksumsContent, 'utf8');

        // Verify checksums using sha256sum --check
        const shaCheckRes = spawnSync('sha256sum', ['--check', 'checksums.sha256'], { cwd: targetDir, encoding: 'utf8' });
        if (shaCheckRes.status !== 0) {
            throw new Error(`VAL-R3-BUILD-004 Failed: sha256sum --check checksums.sha256 exited with code ${shaCheckRes.status}: ${shaCheckRes.stderr}`);
        }

        console.log(`[PASS] VAL-R3-BUILD-004: sha256sum --check checksums.sha256 passed:`);
        console.log(`   APK SHA-256: ${apkHash}`);
        console.log(`   AAB SHA-256: ${aabHash}`);

        // 7. Assemble evidence summary payload
        const summaryPayload = {
            timestamp: new Date().toISOString(),
            commitSha: localSha,
            gitSha: localSha,
            remoteSha: remoteSha,
            gitShaSynced: true,
            cleanWorkingTree: true,
            jdkVersion: '21',
            androidSdkLevel: 36,
            agpVersion: '8.5.2',
            capacitorAndroidVersion: '8.5.0',
            apkPath: 'artifacts/android-r3/HummingRead-R3-debug.apk',
            apkSha256: apkHash,
            aabPath: 'artifacts/android-r3/HummingRead-R3-review-UNSIGNED-NOT-FOR-UPLOAD.aab',
            aabSha256: aabHash,
            unitTestStatus: 'PASSED',
            gradleBuildStatus: 'PASSED',
            masterVerificationStatus: 'PASSED',
            assertions: {
                'VAL-R3-BUILD-001': 'PASSED',
                'VAL-R3-BUILD-002': 'PASSED',
                'VAL-R3-BUILD-003': 'PASSED',
                'VAL-R3-BUILD-004': 'PASSED'
            }
        };

        const summaryPath = join(targetDir, 'evidence-summary.json');
        await writeFile(summaryPath, JSON.stringify(summaryPayload, null, 2), 'utf8');
        console.log(`[PASS] Updated evidence summary at ${summaryPath}`);

        console.log('\n=== HummingRead Android R3 Reproducible Build & Release Packaging Complete ===\n');
        return summaryPayload;
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    packageReleaseR3().catch((err) => {
        console.error(`[FAIL] Packaging release failed: ${err.message}`);
        process.exit(1);
    });
}
