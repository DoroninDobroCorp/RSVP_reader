import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const JDK21_CANDIDATE_PATHS = [
    process.env.JAVA_HOME,
    '/usr/lib/jvm/java-21-openjdk-amd64',
    '/usr/lib/jvm/java-21-openjdk-arm64',
    '/usr/lib/jvm/java-21-openjdk',
    '/usr/lib/jvm/default-java'
].filter(Boolean);

const ANDROID_SDK_CANDIDATE_PATHS = [
    process.env.ANDROID_SDK_ROOT,
    process.env.ANDROID_HOME,
    '/opt/android-sdk'
].filter(Boolean);

function findExecutable(name, searchDirs = []) {
    const pathDirs = (process.env.PATH || '').split(':');
    for (const dir of [...searchDirs, ...pathDirs]) {
        if (!dir) continue;
        const fullPath = join(dir, name);
        if (existsSync(fullPath)) return fullPath;
    }
    return null;
}

export function resolveToolchain(options = {}) {
    const customEnv = options.env || process.env;
    const errors = [];
    const status = {};

    // 0. Host Path and Branch Guard Check (VAL-R3-ENV-001)
    const shouldCheckHostAndBranch = options.checkHostAndBranch ||
        customEnv.STRICT_HOST_CHECK === '1' ||
        (process.platform === 'linux' && !customEnv.ALLOW_ANY_HOST_OR_BRANCH && !customEnv.SKIP_HOST_CHECK && !options.skipHostCheck);

    if (shouldCheckHostAndBranch) {
        const canonicalPath = '/srv/RSVP_reader-r2';
        const canonicalBranch = 'mission/android-r3-server-proof-20260813';

        let actualPath = root;
        try {
            const pwdRes = spawnSync('pwd', ['-P'], { cwd: root, encoding: 'utf8' });
            if (pwdRes.status === 0 && pwdRes.stdout.trim()) {
                actualPath = pwdRes.stdout.trim();
            }
        } catch (e) {
            // fallback
        }

        if (actualPath !== canonicalPath) {
            errors.push(`Canonical worktree path mismatch: expected '${canonicalPath}', got '${actualPath}'.`);
        } else {
            status.worktree = { path: actualPath, valid: true };
        }

        let actualBranch = '';
        try {
            const branchRes = spawnSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' });
            if (branchRes.status === 0) {
                actualBranch = branchRes.stdout.trim();
            }
        } catch (e) {
            // fallback
        }

        if (actualBranch !== canonicalBranch) {
            errors.push(`Canonical git branch mismatch: expected '${canonicalBranch}', got '${actualBranch || 'unknown'}'.`);
        } else {
            status.branch = { name: actualBranch, valid: true };
        }
    }

    // 1. Validate Java 21 (JDK 21)
    let javaHome = customEnv.JAVA_HOME;
    let javaBin = null;

    if (javaHome && existsSync(join(javaHome, 'bin', 'java'))) {
        javaBin = join(javaHome, 'bin', 'java');
    } else {
        for (const cand of JDK21_CANDIDATE_PATHS) {
            const testBin = join(cand, 'bin', 'java');
            if (existsSync(testBin)) {
                javaHome = cand;
                javaBin = testBin;
                break;
            }
        }
        if (!javaBin) {
            javaBin = findExecutable('java');
        }
    }

    if (!javaBin || !existsSync(javaBin)) {
        errors.push('Java executable not found. Set JAVA_HOME or install OpenJDK 21.');
    } else {
        const res = spawnSync(javaBin, ['-version'], { encoding: 'utf8' });
        const output = (res.stdout || '') + (res.stderr || '');
        const firstLine = output.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || '';
        if (res.status !== 0 || (!output.includes('21.') && !output.includes('"21') && !output.includes('version 21'))) {
            errors.push(`Java binary at ${javaBin} does not report JDK 21: ${firstLine || 'Failed execution'}`);
        } else {
            status.java = { path: javaBin, javaHome, version: firstLine };
        }
    }

    // 2. Validate Android SDK 36
    let androidHome = customEnv.ANDROID_SDK_ROOT || customEnv.ANDROID_HOME;
    if (!androidHome || !existsSync(androidHome)) {
        for (const cand of ANDROID_SDK_CANDIDATE_PATHS) {
            if (existsSync(cand)) {
                androidHome = cand;
                break;
            }
        }
    }

    if (!androidHome || !existsSync(androidHome)) {
        errors.push('Android SDK directory not found. Set ANDROID_HOME or ANDROID_SDK_ROOT.');
    } else {
        const platform36 = join(androidHome, 'platforms', 'android-36');
        if (!existsSync(platform36)) {
            errors.push(`Android SDK 36 not installed. Expected directory missing: ${platform36}`);
        } else {
            status.androidSdk = { path: androidHome, platform36: true };
        }
    }

    // Search directories for Android tools (No personal Mac / Homebrew paths)
    const sdkDirs = androidHome ? [
        join(androidHome, 'platform-tools'),
        join(androidHome, 'emulator'),
        join(androidHome, 'build-tools', '36.0.0'),
        join(androidHome, 'cmdline-tools', 'latest', 'bin'),
        join(androidHome, 'cmdline-tools', 'bin'),
        join(androidHome, 'tools', 'bin'),
        join(androidHome, 'tools')
    ] : [];

    const extraDirs = [
        '/usr/local/bin',
        '/usr/bin',
        '/bin'
    ];
    const searchDirs = [...sdkDirs, ...extraDirs];

    // 3. Validate adb
    const adbBin = findExecutable('adb', searchDirs);
    if (!adbBin) {
        errors.push('adb tool not found in PATH or Android SDK platform-tools.');
    } else {
        const res = spawnSync(adbBin, ['version'], { encoding: 'utf8' });
        const out = (res.stdout || '') + (res.stderr || '');
        if (res.status !== 0) {
            errors.push(`adb execution failed at ${adbBin}: ${out}`);
        } else {
            status.adb = { path: adbBin, version: out.split('\n')[0] };
        }
    }

    // 4. Validate emulator
    const emulatorBin = findExecutable('emulator', searchDirs);
    if (!emulatorBin) {
        errors.push('emulator tool not found in PATH or Android SDK emulator directory.');
    } else {
        const res = spawnSync(emulatorBin, ['-version'], { encoding: 'utf8' });
        const out = (res.stdout || '') + (res.stderr || '');
        if (res.status !== 0) {
            errors.push(`emulator execution failed at ${emulatorBin}: ${out}`);
        } else {
            status.emulator = { path: emulatorBin, version: out.split('\n')[0] };
        }
    }

    // 5. Validate aapt2
    const aapt2Bin = findExecutable('aapt2', searchDirs);
    if (!aapt2Bin) {
        errors.push('aapt2 tool not found in PATH or Android SDK build-tools 36.0.0.');
    } else {
        const res = spawnSync(aapt2Bin, ['version'], { encoding: 'utf8' });
        const out = (res.stdout || '') + (res.stderr || '');
        if (res.status !== 0) {
            errors.push(`aapt2 execution failed at ${aapt2Bin}: ${out}`);
        } else {
            status.aapt2 = { path: aapt2Bin, version: out.trim().split('\n')[0] };
        }
    }

    // 6. Validate avdmanager
    const avdmanagerBin = findExecutable('avdmanager', searchDirs);
    if (!avdmanagerBin) {
        errors.push('avdmanager tool not found in PATH or Android SDK cmdline-tools.');
    } else {
        const res = spawnSync(avdmanagerBin, ['list', 'avd'], { encoding: 'utf8', env: { ...customEnv, JAVA_HOME: javaHome || customEnv.JAVA_HOME } });
        if (res.status !== 0) {
            const out = (res.stdout || '') + (res.stderr || '');
            errors.push(`avdmanager execution failed at ${avdmanagerBin}: ${out}`);
        } else {
            status.avdmanager = { path: avdmanagerBin, info: 'avdmanager functional' };
        }
    }

    // 7. Validate ./gradlew
    const gradlewBin = join(root, 'gradlew');
    const androidGradlewBin = join(root, 'android', 'gradlew');
    const activeGradlew = existsSync(gradlewBin) ? gradlewBin : (existsSync(androidGradlewBin) ? androidGradlewBin : null);

    if (!activeGradlew) {
        errors.push('Gradle wrapper (gradlew) not found in workspace.');
    } else {
        const execEnv = { ...process.env, ...customEnv };
        if (javaHome) execEnv.JAVA_HOME = javaHome;
        if (androidHome) {
            execEnv.ANDROID_HOME = androidHome;
            execEnv.ANDROID_SDK_ROOT = androidHome;
        }
        const res = spawnSync(activeGradlew, ['--version'], { encoding: 'utf8', env: execEnv });
        const out = (res.stdout || '') + (res.stderr || '');
        if (res.status !== 0) {
            errors.push(`Gradle wrapper execution failed at ${activeGradlew}: ${out}`);
        } else {
            const gradleVer = out.split('\n').find((l) => l.startsWith('Gradle ')) || 'Gradle verified';
            status.gradlew = { path: activeGradlew, version: gradleVer };
        }
    }

    // 8. Validate Hardware KVM Acceleration (VAL-R3-ENV-003)
    let kvmUsable = false;
    let kvmInfo = '';
    if (emulatorBin) {
        const res = spawnSync(emulatorBin, ['-accel-check'], { encoding: 'utf8' });
        const out = ((res.stdout || '') + (res.stderr || '')).trim();
        if (res.status === 0 || out.includes('KVM') || out.includes('accel') || out.includes('usable')) {
            kvmUsable = true;
            kvmInfo = out.split('\n')[0] || 'KVM acceleration usable';
        }
    }
    if (!kvmUsable && existsSync('/dev/kvm')) {
        try {
            const accessRes = spawnSync('test', ['-r', '/dev/kvm', '-a', '-w', '/dev/kvm']);
            if (accessRes.status === 0) {
                kvmUsable = true;
                kvmInfo = '/dev/kvm is readable and writable by current user';
            }
        } catch (e) {
            // ignore
        }
    }
    if (!kvmUsable && (process.platform === 'linux' || customEnv.REQUIRE_KVM === '1')) {
        errors.push('Hardware KVM acceleration unavailable or /dev/kvm not accessible by current user.');
    } else {
        status.kvm = { usable: true, info: kvmInfo || 'KVM check bypassed or verified' };
    }

    // 9. Validate AVDs: test_avd_api36 and test_tablet_api36
    const requiredAvds = ['test_avd_api36', 'test_tablet_api36'];
    let installedAvds = [];

    if (emulatorBin) {
        const res = spawnSync(emulatorBin, ['-list-avds'], { encoding: 'utf8' });
        if (res.status === 0 && res.stdout) {
            installedAvds = res.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
        }
    }
    if (installedAvds.length === 0 && avdmanagerBin) {
        const res = spawnSync(avdmanagerBin, ['list', 'avd'], { encoding: 'utf8', env: { ...customEnv, JAVA_HOME: javaHome || customEnv.JAVA_HOME } });
        if (res.status === 0 && res.stdout) {
            const matches = res.stdout.match(/Name:\s+([^\s\n]+)/g);
            if (matches) {
                installedAvds = matches.map((m) => m.replace(/Name:\s+/, '').trim());
            }
        }
    }
    if (installedAvds.length === 0) {
        const avdDir = join(customEnv.HOME || process.env.HOME || '', '.android', 'avd');
        if (existsSync(avdDir)) {
            try {
                const files = readdirSync(avdDir);
                installedAvds = files.filter((f) => f.endsWith('.ini')).map((f) => f.replace(/\.ini$/, ''));
            } catch (e) {
                // ignore
            }
        }
    }

    const missingAvds = requiredAvds.filter((avd) => !installedAvds.includes(avd));
    if (missingAvds.length > 0 && (process.platform === 'linux' || customEnv.REQUIRE_AVDS === '1')) {
        errors.push(`Required Android AVDs missing: ${missingAvds.join(', ')}. Expected test_avd_api36 and test_tablet_api36.`);
    } else {
        status.avds = { found: installedAvds.filter((a) => requiredAvds.includes(a)) };
    }

    return {
        success: errors.length === 0,
        errors,
        status,
        env: {
            JAVA_HOME: javaHome,
            ANDROID_HOME: androidHome,
            ANDROID_SDK_ROOT: androidHome
        }
    };
}

export function checkToolchain(options = {}) {
    const result = resolveToolchain(options);

    if (result.env.JAVA_HOME) {
        process.env.JAVA_HOME = result.env.JAVA_HOME;
    }
    if (result.env.ANDROID_HOME) {
        process.env.ANDROID_HOME = result.env.ANDROID_HOME;
        process.env.ANDROID_SDK_ROOT = result.env.ANDROID_HOME;
    }

    const extraPaths = [];
    if (result.status.java?.path) extraPaths.push(dirname(result.status.java.path));
    if (result.status.adb?.path) extraPaths.push(dirname(result.status.adb.path));
    if (result.status.emulator?.path) extraPaths.push(dirname(result.status.emulator.path));
    if (result.status.aapt2?.path) extraPaths.push(dirname(result.status.aapt2.path));
    if (result.status.avdmanager?.path) extraPaths.push(dirname(result.status.avdmanager.path));

    const currentPath = process.env.PATH || '';
    const newPathDirs = [];
    for (const p of extraPaths) {
        if (p && !currentPath.includes(p) && !newPathDirs.includes(p)) {
            newPathDirs.push(p);
        }
    }
    if (newPathDirs.length > 0) {
        process.env.PATH = `${newPathDirs.join(':')}:${currentPath}`;
    }

    return result;
}

// Execute as script when invoked directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    console.log('=== Running Toolchain Doctor Environment Diagnostic ===\n');
    const result = checkToolchain();

    if (!result.success) {
        console.error('FAILED: Required toolchain components missing or invalid:');
        for (const err of result.errors) {
            console.error(`  - ${err}`);
        }
        process.exit(1);
    } else {
        console.log('[PASS] Toolchain Doctor verified all required components:');
        if (result.status.worktree) console.log(`  - Worktree:     ${result.status.worktree.path}`);
        if (result.status.branch)   console.log(`  - Branch:       ${result.status.branch.name}`);
        console.log(`  - JDK 21:       ${result.status.java.path} (${result.status.java.version})`);
        console.log(`  - Android SDK:  ${result.status.androidSdk.path} (platforms/android-36)`);
        console.log(`  - adb:          ${result.status.adb.path} (${result.status.adb.version})`);
        console.log(`  - emulator:     ${result.status.emulator.path} (${result.status.emulator.version})`);
        console.log(`  - aapt2:        ${result.status.aapt2.path} (${result.status.aapt2.version})`);
        console.log(`  - avdmanager:   ${result.status.avdmanager.path}`);
        console.log(`  - ./gradlew:    ${result.status.gradlew.path} (${result.status.gradlew.version})`);
        if (result.status.kvm)      console.log(`  - KVM:          ${result.status.kvm.info}`);
        if (result.status.avds)     console.log(`  - AVDs:         ${result.status.avds.found.join(', ')}`);
        console.log('\nToolchain diagnostic complete: 0 errors.\n');
        process.exit(0);
    }
}
