import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// ============================================================================
// Verification Audit Helpers (Exported for fail-closed validation & self-tests)
// ============================================================================

export function verifyApkFreshness(apkPath, buildStartTime) {
    if (!existsSync(apkPath)) {
        throw new Error(`APK file missing: ${apkPath}`);
    }
    const stat = statSync(apkPath);
    const mtime = stat.mtimeMs || stat.mtime;
    if (mtime < buildStartTime) {
        throw new Error(`Stale APK detected: mtime (${new Date(mtime).toISOString()}) is older than build start time (${new Date(buildStartTime).toISOString()}).`);
    }
}

export function verifyApkChecksum(apkPath, expectedSha256) {
    if (!existsSync(apkPath)) {
        throw new Error(`APK file missing: ${apkPath}`);
    }
    const apkBuffer = readFileSync(apkPath);
    const actualSha256 = createHash('sha256').update(apkBuffer).digest('hex');
    if (actualSha256 !== expectedSha256) {
        throw new Error(`APK SHA-256 mismatch: expected ${expectedSha256}, got ${actualSha256}`);
    }
    return actualSha256;
}

export function verifyManifestPermissions(manifestContent) {
    const forbidden = ['android.permission.INTERNET', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE'];
    for (const perm of forbidden) {
        if (manifestContent.includes(perm)) {
            throw new Error(`Manifest permission audit failed: contains forbidden permission ${perm}`);
        }
    }
}

export function verifyFileProviderPaths(filePathsXmlContent) {
    if (filePathsXmlContent.includes('external-path') || filePathsXmlContent.includes('root-path')) {
        throw new Error('FileProvider audit failed: contains broad external-path or root-path');
    }
    if (!filePathsXmlContent.includes('cache-path name="backup_share" path="backups/"')) {
        throw new Error('FileProvider audit failed: missing restricted <cache-path name="backup_share" path="backups/" />');
    }
}

export function verifyGitShaMatch(localSha, remoteSha) {
    if (!localSha || !remoteSha || localSha !== remoteSha) {
        throw new Error(`Git SHA mismatch: local HEAD (${localSha || 'none'}) does not match remote SHA (${remoteSha || 'none'})`);
    }
}

export function fetchRemoteGitSha(options = {}) {
    const remoteUrl = options.remoteUrl || 'origin';
    const branch = options.branch || 'mission/android-r3-server-proof-20260813';
    const res = spawnSync('git', ['ls-remote', '--heads', remoteUrl, branch], { cwd: root, encoding: 'utf8' });
    if (res.status !== 0 || !res.stdout) {
        throw new Error(`Failed to fetch remote Git SHA from ${remoteUrl} ${branch}: ${res.stderr || 'Network or remote unreachable'}`);
    }
    const parts = res.stdout.trim().split(/\s+/);
    if (!parts[0] || parts[0].length < 40) {
        throw new Error(`Invalid remote SHA returned from ${remoteUrl} ${branch}: ${res.stdout}`);
    }
    return parts[0];
}

export function verifyLogProvenance(assertionsMap, logsDir) {
    for (const [assertion, status] of Object.entries(assertionsMap)) {
        if (status === 'PASSED') {
            const logFileName = `${assertion.toLowerCase()}.log`;
            const logPath = join(logsDir, logFileName);
            if (!existsSync(logPath)) {
                throw new Error(`Claimed assertion ${assertion} has no matching validation log at ${logPath}`);
            }
            const logContent = readFileSync(logPath, 'utf8');
            if (!logContent.trim()) {
                throw new Error(`Validation log for claimed assertion ${assertion} is empty at ${logPath}`);
            }
        }
    }
}

export function verifyScreenshotDeduplication(fileHashesMap) {
    const seenHashes = new Map();
    for (const [filename, hash] of Object.entries(fileHashesMap)) {
        if (seenHashes.has(hash)) {
            throw new Error(`Duplicate workflow screenshot detected: ${filename} has same SHA-256 as ${seenHashes.get(hash)}`);
        }
        seenHashes.set(hash, filename);
    }
}

export function verifySidecarDimensions(measuredWidth, measuredHeight, sidecarWidth, sidecarHeight) {
    if (measuredWidth !== sidecarWidth || measuredHeight !== sidecarHeight) {
        throw new Error(`PNG/sidecar dimension mismatch: measured ${measuredWidth}x${measuredHeight}, sidecar declared ${sidecarWidth}x${sidecarHeight}`);
    }
}

export function verifySidecarCommitSha(sidecarSha, expectedSha) {
    if (!sidecarSha || sidecarSha !== expectedSha) {
        throw new Error(`Sidecar source SHA mismatch: sidecar claims ${sidecarSha}, expected ${expectedSha}`);
    }
}

export function verifyQaResults(scenarios) {
    for (const scenario of scenarios) {
        if (scenario.status === 'SKIPPED' || scenario.status === 'FAILED') {
            throw new Error(`Required QA scenario failed or skipped: ${scenario.id || scenario.name} (${scenario.status})`);
        }
    }
}

export function verifyExecutionRecord(record) {
    if (record.allowFail) {
        throw new Error(`Execution record uses allowFail: true for proof: ${record.name || record.id}`);
    }
    if (record.exitCode !== 0 || record.status !== 'PASS') {
        throw new Error(`Execution record failed: ${record.name || record.id} (exitCode: ${record.exitCode})`);
    }
}

export function verifyExecutedAssertions(assertionsMap, executedChecks) {
    for (const [assertion, status] of Object.entries(assertionsMap)) {
        if (status === 'PASSED') {
            const hasCheck = executedChecks.some(c =>
                c.status === 'PASS' && (
                    (c.assertions && c.assertions.includes(assertion)) ||
                    (c.id && c.id.toLowerCase().includes(assertion.toLowerCase()))
                )
            );
            if (!hasCheck) {
                throw new Error(`Hard-coded PASSED assertion without an executed check record: ${assertion}`);
            }
        }
    }
}

// ============================================================================
// Master Verification Pipeline Runner
// ============================================================================

function executeCheckStep(stepId, name, command, args, logsDir, masterLogPath, options = {}) {
    console.log(`\n====================================================`);
    console.log(`>>> Running Verification Step: ${name}`);
    console.log(`====================================================\n`);

    const startTime = new Date();
    const logFileName = `${stepId}.log`;
    const stepLogPath = join(logsDir, logFileName);

    const result = spawnSync(command, args, {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, ...options.env }
    });

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const exitCode = result.status ?? (result.signal ? 128 : 1);
    const status = exitCode === 0 ? 'PASS' : 'FAIL';

    const stdoutText = result.stdout || '';
    const stderrText = result.stderr || '';
    const fullLog = `=== Step: ${name} ===\nCommand: ${command} ${args.join(' ')}\nStart: ${startTime.toISOString()}\nEnd: ${endTime.toISOString()}\nDuration: ${durationMs}ms\nExit Code: ${exitCode}\nStatus: ${status}\n\n--- STDOUT ---\n${stdoutText}\n--- STDERR ---\n${stderrText}\n`;

    writeFileSync(stepLogPath, fullLog, 'utf8');
    appendFileSync(masterLogPath, fullLog + '\n========================================\n', 'utf8');

    if (stdoutText) process.stdout.write(stdoutText);
    if (stderrText) process.stderr.write(stderrText);

    const record = {
        id: stepId,
        name,
        command: `${command} ${args.join(' ')}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMs,
        exitCode,
        status,
        logPath: `artifacts/android-r3/logs/${logFileName}`,
        stdoutSnippet: stdoutText.slice(0, 300).trim(),
        stderrSnippet: stderrText.slice(0, 300).trim()
    };

    if (exitCode !== 0) {
        console.error(`\n[FAIL] Verification step "${name}" failed with exit code ${exitCode}. Aborting master pipeline.`);
    } else {
        console.log(`\n[PASS] Verification step "${name}" completed successfully (${durationMs}ms).`);
    }

    return record;
}

export async function runMasterVerificationPipeline(options = {}) {
    console.log('=== Starting Fail-Closed Master Verifier Pipeline (verify-all.mjs) ===\n');

    const allowDirty = options.allowDirty || process.argv.includes('--allow-dirty');
    const logsDir = join(root, 'artifacts', 'android-r3', 'logs');
    const artifactsDir = join(root, 'artifacts', 'android-r3');

    mkdirSync(logsDir, { recursive: true });
    mkdirSync(artifactsDir, { recursive: true });

    const masterLogPath = join(logsDir, 'verify-all.log');
    writeFileSync(masterLogPath, `=== Master Verification Pipeline Log ===\nStart: ${new Date().toISOString()}\n\n`, 'utf8');

    // 1. Clean Working Tree and Git Commit SHA Pre-Check (VAL-R3-VERIFY-003)
    console.log('1. Checking VAL-R3-VERIFY-003: Fresh Git SHA & Clean Working Tree Invariant...');
    const statusRes = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
    if (statusRes.status !== 0) {
        console.error('[FAIL] Failed to execute git status --porcelain');
        process.exit(1);
    }

    const dirtyOutput = statusRes.stdout ? statusRes.stdout.trim() : '';
    if (dirtyOutput && !allowDirty) {
        console.error('[FAIL] VAL-R3-VERIFY-003 Failed: Dirty working tree detected! Uncommitted changes are present:');
        console.error(dirtyOutput);
        console.error('\nVerifier pipeline fails if working tree is dirty. Commit or stash changes before running verify:all.');
        process.exit(1);
    }

    const shaRes = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
    if (shaRes.status !== 0) {
        console.error('[FAIL] Failed to execute git rev-parse HEAD');
        process.exit(1);
    }
    const currentGitSha = shaRes.stdout ? shaRes.stdout.trim() : '';
    console.log(`   Git commit SHA: ${currentGitSha}`);
    console.log(`   Working tree status: ${dirtyOutput ? 'DIRTY (bypassed with --allow-dirty)' : 'CLEAN'}\n`);

    // 2. Sequential Execution of 13 Verification Steps
    const nodeBin = process.execPath;
    const executedChecks = [];

    const steps = [
        { id: 'step-01-toolchain-doctor', name: '01 Toolchain Doctor Diagnostic', cmd: nodeBin, args: ['scripts/toolchain-doctor.mjs'], assertions: ['VAL-R3-ENV-001', 'VAL-R3-ENV-002', 'VAL-R3-ENV-003'] },
        { id: 'step-02-verify-brand', name: '02 Brand & Placeholder Integrity', cmd: nodeBin, args: ['scripts/verify-brand.mjs'], assertions: ['VAL-R3-BRAND-001'] },
        { id: 'step-03-verify-notices', name: '03 Third-Party Notices & License Integrity', cmd: nodeBin, args: ['scripts/verify-notices.mjs'], assertions: ['VAL-R3-NOTICES-001'] },
        { id: 'step-04-verify-packaged-assets', name: '04 Packaged Asset Stripping & Security', cmd: nodeBin, args: ['scripts/verify-packaged-assets.mjs'], assertions: ['VAL-R3-SEC-001'] },
        { id: 'step-05-verify-android-privacy', name: '05 Android Local Privacy & Permissions Audit', cmd: nodeBin, args: ['scripts/verify-android-privacy.mjs'], assertions: ['VAL-R3-SEC-001', 'VAL-R3-SEC-002'] },
        { id: 'step-06-verify-android-package', name: '06 Android Package & SHA-256 Checksum Gate', cmd: nodeBin, args: ['scripts/verify-android-package.mjs'], assertions: ['VAL-R3-SEC-003', 'VAL-R3-BUILD-004'] },
        { id: 'step-07-verify-chrome-extension', name: '07 Chrome Extension Manifest & Catalog Verification', cmd: nodeBin, args: ['scripts/verify-chrome-extension.mjs'], assertions: ['VAL-R3-EXT-001'] },
        { id: 'step-08-verify-service-worker-precache', name: '08 Service Worker App Shell Precache Audit', cmd: nodeBin, args: ['scripts/verify-service-worker-precache.mjs'], assertions: ['VAL-R3-PWA-002'] },
        { id: 'step-09-verify-deployment', name: '09 Deployment & Security Gate', cmd: nodeBin, args: ['scripts/verify-deployment.mjs'], assertions: ['VAL-R3-PWA-001'] },
        { id: 'step-10-verify-deterministic-build', name: '10 Deterministic Build Output Audit', cmd: nodeBin, args: ['scripts/verify-deterministic-build.mjs'], assertions: ['VAL-R3-BUILD-001'] },
        { id: 'step-11-verify-store-copy', name: '11 Store Metadata Copy & Localization Gate', cmd: nodeBin, args: ['scripts/verify-store-copy.mjs'], assertions: ['VAL-R3-STORE-001'] },
        { id: 'step-12-hermetic-unit-tests', name: '12 Hermetic Unit Tests', cmd: nodeBin, args: ['--test', 'tests/unit/*.test.js'], assertions: ['VAL-R3-HERMETIC-001'] },
        { id: 'step-13-test-web-built', name: '13 Built-Output Web Tests', cmd: nodeBin, args: ['scripts/test-web-built.mjs'], assertions: ['VAL-R3-PWA-001', 'VAL-R3-PWA-003'] }
    ];

    let overallPassed = true;
    for (const step of steps) {
        const record = executeCheckStep(step.id, step.name, step.cmd, step.args, logsDir, masterLogPath, options);
        record.assertions = step.assertions;
        executedChecks.push(record);

        if (record.status !== 'PASS') {
            overallPassed = false;
            break;
        }
    }

    // Write validation-state.json and evidence-summary.json based strictly on executed checks
    const passedCount = executedChecks.filter(c => c.status === 'PASS').length;
    const failedCount = executedChecks.filter(c => c.status === 'FAIL').length;
    const overallStatus = overallPassed && failedCount === 0 ? 'PASSED' : 'FAILED';

    const assertionsMap = { 'VAL-R3-NEG-001': overallStatus };
    for (const check of executedChecks) {
        if (check.assertions && check.status === 'PASS') {
            for (const ass of check.assertions) {
                assertionsMap[ass] = 'PASSED';
            }
        }
    }

    const validationState = {
        timestamp: new Date().toISOString(),
        commitSha: currentGitSha,
        gitSha: currentGitSha,
        cleanWorkingTree: !dirtyOutput,
        overallStatus,
        totalExecutedSteps: executedChecks.length,
        passedSteps: passedCount,
        failedSteps: failedCount,
        executedChecks,
        assertions: assertionsMap
    };

    writeFileSync(join(artifactsDir, 'validation-state.json'), JSON.stringify(validationState, null, 2), 'utf8');

    const summaryPayload = {
        timestamp: new Date().toISOString(),
        commitSha: currentGitSha,
        gitSha: currentGitSha,
        cleanWorkingTree: !dirtyOutput,
        masterVerificationStatus: overallStatus,
        totalStepsCompleted: executedChecks.length,
        executedChecks,
        assertions: assertionsMap
    };

    writeFileSync(join(artifactsDir, 'evidence-summary.json'), JSON.stringify(summaryPayload, null, 2), 'utf8');

    // Also update artifacts/android-r2 for backward compatibility if present
    const r2Dir = join(root, 'artifacts', 'android-r2');
    if (existsSync(r2Dir)) {
        writeFileSync(join(r2Dir, 'evidence-summary.json'), JSON.stringify(summaryPayload, null, 2), 'utf8');
        writeFileSync(join(r2Dir, 'validation-state.json'), JSON.stringify(validationState, null, 2), 'utf8');
    }

    if (!overallPassed) {
        console.error('\n====================================================');
        console.error(`MASTER VERIFICATION PIPELINE FAILED (${failedCount} step(s) failed)`);
        console.error('====================================================\n');
        process.exit(1);
    }

    console.log('\n====================================================');
    console.log('MASTER VERIFICATION SUITE PASSED (0 errors, 13 executed steps)');
    console.log('====================================================\n');
}

// Execute as script when invoked directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    runMasterVerificationPipeline().catch((err) => {
        console.error(`[FAIL] Unhandled master verifier error: ${err.message}`);
        process.exit(1);
    });
}
