import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
export const EXPECTED_UNIT_TESTS = 105;

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
    const branch = options.branch || 'mission/android-r5-recovery-20260814';
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

export function verifyCleanCloneNoPreexisting(clonePath) {
    const forbidden = ['node_modules', 'dist', 'dist-native', 'artifacts', 'evidence'];
    for (const dir of forbidden) {
        if (existsSync(join(clonePath, dir))) {
            throw new Error(`Clean checkout clone contains pre-existing forbidden directory: ${dir}`);
        }
    }
}

export function verifyUnitTestSummary({ testsCount, passCount, failCount, skipCount, cancelledCount = 0, todoCount = 0 }, expectedCount = EXPECTED_UNIT_TESTS) {
    if (failCount > 0) throw new Error(`Unit test failures detected: ${failCount} failed`);
    if (skipCount > 0) throw new Error(`Unit test skips detected: ${skipCount} skipped`);
    if (cancelledCount > 0) throw new Error(`Unit test cancellations detected: ${cancelledCount} cancelled`);
    if (todoCount > 0) throw new Error(`Unit test todos detected: ${todoCount} todo`);
    if (testsCount !== expectedCount || passCount !== expectedCount) {
        throw new Error(`Unit test count mismatch: expected exactly ${expectedCount}, got ${testsCount} total / ${passCount} passed`);
    }
    if (passCount !== testsCount) throw new Error(`Total tests count (${testsCount}) does not match pass count (${passCount})`);
}

export function verifyDistinctUpgradeApks(oldApkHash, newApkHash, oldVersionCode, newVersionCode) {
    if (!oldApkHash || !newApkHash || oldApkHash === newApkHash) {
        throw new Error(`Upgrade test requires distinct APK hashes: old=${oldApkHash}, new=${newApkHash}`);
    }
    if (typeof oldVersionCode === 'number' && typeof newVersionCode === 'number' && oldVersionCode >= newVersionCode) {
        throw new Error(`Upgrade test requires higher new versionCode: old=${oldVersionCode}, new=${newVersionCode}`);
    }
}

export function verifyDeviceClassGeometry(profile, width, height) {
    if (profile === 'tablet' || profile === 'pixel_tablet' || profile === 'test_tablet_api36') {
        const minDim = Math.min(width, height);
        const maxDim = Math.max(width, height);
        if (minDim < 1200 || maxDim < 1920) {
            throw new Error(`Tablet profile ${profile} has invalid phone-like geometry: ${width}x${height}`);
        }
    }
}

export function verifyR5NamespaceIsolation(targetDir) {
    const normalized = targetDir.replace(/\\/g, '/');
    if (normalized.includes('/android-r2') || normalized.includes('/android-r3') || normalized.includes('/android-r4')) {
        throw new Error(`Cross-milestone write violation: R5 pipeline must not write into prior milestone directories: ${targetDir}`);
    }
}

export function verifyMandatoryChildCommands(executedStepIds, requiredStepIds) {
    for (const req of requiredStepIds) {
        if (!executedStepIds.includes(req)) {
            throw new Error(`Mandatory verification step omitted from master gate: ${req}`);
        }
    }
}

export function verifyLogProvenance(assertionsMap, logsDir) {
    for (const [assertion, status] of Object.entries(assertionsMap)) {
        if (status === 'PASSED') {
            const logFileName = `${assertion.toLowerCase()}.log`;
            const logPath = join(logsDir, logFileName);
            const existsDirect = existsSync(logPath);
            if (!existsDirect) {
                const files = existsSync(logsDir) ? readdirSync(logsDir) : [];
                const hasLog = files.some(f => {
                    const content = readFileSync(join(logsDir, f), 'utf8');
                    return content.includes(assertion);
                });
                if (!hasLog) {
                    throw new Error(`Claimed assertion ${assertion} has no matching validation log at ${logPath}`);
                }
            } else {
                const logContent = readFileSync(logPath, 'utf8');
                if (!logContent.trim()) {
                    throw new Error(`Validation log for claimed assertion ${assertion} is empty at ${logPath}`);
                }
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

export function verifyNoCdpSubstitution(scenario) {
    if (!scenario) return;
    if (scenario.cdpSubstituted || scenario.usedCdp || scenario.cdp === true || (scenario.method && String(scenario.method).toUpperCase().includes('CDP'))) {
        throw new Error(`CDP substitution detected for native QA scenario: ${scenario.id || scenario.name || 'unnamed'}`);
    }
}

export function verifyQaResults(scenarios) {
    for (const scenario of scenarios) {
        if (scenario.status === 'SKIPPED' || scenario.status === 'FAILED') {
            throw new Error(`Required QA scenario failed or skipped: ${scenario.id || scenario.name} (${scenario.status})`);
        }
        verifyNoCdpSubstitution(scenario);
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
            if (assertion === 'VAL-R5-NEG-001' || assertion === 'VAL-R4-NEG-001') continue;
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
    const status = exitCode === 0 ? 'PASS' : (exitCode === 2 ? 'BLOCKED' : 'FAIL');

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
        logPath: `artifacts/android-r5/logs/${logFileName}`,
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
    console.log('=== Starting Android R5 fail-closed master gate ===\n');
    const allowDirty = options.allowDirty || process.argv.includes('--allow-dirty');
    const logsDir = join(root, 'artifacts', 'android-r5', 'master-logs');
    const artifactsDir = join(root, 'artifacts', 'android-r5');
    mkdirSync(logsDir, { recursive: true });
    mkdirSync(artifactsDir, { recursive: true });
    const masterLogPath = join(logsDir, 'verify-all.log');
    writeFileSync(masterLogPath, `=== Android R5 master gate ===\nStart: ${new Date().toISOString()}\n`, 'utf8');

    const statusRes = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
    if (statusRes.status !== 0) throw new Error(`git status failed: ${statusRes.stderr}`);
    const dirtyOutput = (statusRes.stdout || '').trim();
    if (dirtyOutput && !allowDirty) {
        console.error(`[FAIL] Dirty working tree detected:\n${dirtyOutput}`);
        process.exit(1);
    }
    const currentGitSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
    const remoteGitSha = fetchRemoteGitSha();
    if (!allowDirty) verifyGitShaMatch(currentGitSha, remoteGitSha);
    process.env.TESTED_SOURCE_SHA = currentGitSha;

    const nodeBin = process.execPath;
    const npm = (id, name, script, assertions = []) => ({ id, name, cmd: 'npm', args: ['run', script], assertions });
    const steps = [
        { id: 'step-01-toolchain-doctor', name: 'Toolchain doctor', cmd: nodeBin, args: ['scripts/toolchain-doctor.mjs'], assertions: ['VAL-R5-ENV-001'] },
        { id: 'step-02-clean-checkout', name: 'Remote-SHA clean checkout and exact unit gate', cmd: nodeBin, args: ['scripts/verify-clean-checkout.mjs', ...(allowDirty ? ['--dev-overlay'] : [])], assertions: ['VAL-R5-HERMETIC-001', 'VAL-R5-HERMETIC-002'] },
        npm('step-03-lint', 'JavaScript syntax gate', 'lint'),
        npm('step-04-build-native', 'Web and native asset build', 'build:native', ['VAL-R5-BUILD-001']),
        npm('step-05-build-extension', 'Chrome extension build', 'build:extension', ['VAL-R5-EXT-001']),
        npm('step-06-verify-brand', 'Brand and placeholder verification', 'verify:brand'),
        npm('step-07-verify-notices', 'Third-party notices verification', 'verify:notices'),
        npm('step-08-verify-package', 'Packaged asset verification', 'verify:package'),
        npm('step-09-verify-extension', 'Extension manifest verification', 'verify:extension'),
        npm('step-10-verify-precache', 'Service-worker precache verification', 'verify:precache'),
        npm('step-11-verify-deployment', 'Deployment topology dry verification', 'verify:deployment'),
        npm('step-12-verify-store-copy', 'Store-copy verification', 'verify:store-copy'),
        npm('step-13-test-web-built', 'Built-output web/native tests', 'test:web-built', ['VAL-R5-PWA-001']),
        npm('step-14-browser-chromium', 'Chromium production regression', 'test:production'),
        npm('step-15-browser-webkit-mobile', 'WebKit and Mobile Safari regression', 'test:cross-browser'),
        npm('step-16-extension-e2e', 'Real extension E2E', 'test:extension', ['VAL-R5-EXT-002']),
        npm('step-17-lighthouse', 'Lighthouse checks', 'test:lighthouse'),
        npm('step-18-deterministic-gradle-package', 'Deterministic build plus Gradle clean/test/lint/APK/AAB package', 'verify:determinism', ['VAL-R5-BUILD-002', 'VAL-R5-BUILD-003', 'VAL-R5-BUILD-004']),
        { id: 'step-19-android-privacy', name: 'Android privacy and permissions', cmd: nodeBin, args: ['scripts/verify-android-privacy.mjs'], assertions: ['VAL-R5-SEC-001'] },
        { id: 'step-20-android-package', name: 'Android artifact checksum and signing-state verification', cmd: nodeBin, args: ['scripts/verify-android-package.mjs'], assertions: ['VAL-R5-SEC-002'] },
        { id: 'step-21-negative-self-tests', name: 'R5 production-verifier negative demonstrations', cmd: nodeBin, args: ['--test', '--test-reporter=tap', 'tests/unit/negative-self-tests.test.js'], assertions: ['VAL-R5-NEG-002'] },
        { id: 'step-22-android-qa-suite', name: 'Android API 36 phone and tablet runtime QA', cmd: nodeBin, args: ['scripts/run-android-qa-suite.mjs'], assertions: ['VAL-R5-ANDROID-RUNTIME'] },
        { id: 'step-23-android-visual-matrix', name: 'Android visual and accessibility capture', cmd: nodeBin, args: ['scripts/run-visual-qa-matrix.mjs'], assertions: ['VAL-R5-ANDROID-VISUAL'] },
        { id: 'step-24-android-evidence', name: 'Fresh Android evidence provenance verification', cmd: nodeBin, args: ['scripts/verify-android-r5-evidence.mjs'], assertions: ['VAL-R5-ANDROID-EVIDENCE'] }
    ];

    verifyMandatoryChildCommands(steps.map((step) => step.id), [
        'step-02-clean-checkout', 'step-14-browser-chromium', 'step-15-browser-webkit-mobile',
        'step-16-extension-e2e', 'step-17-lighthouse', 'step-18-deterministic-gradle-package',
        'step-21-negative-self-tests', 'step-22-android-qa-suite', 'step-23-android-visual-matrix',
        'step-24-android-evidence'
    ]);

    const executedChecks = [];
    for (const step of steps) {
        const record = executeCheckStep(step.id, step.name, step.cmd, step.args, logsDir, masterLogPath, options);
        record.assertions = step.assertions;
        executedChecks.push(record);
        if (record.status !== 'PASS') break;
    }

    const passCount = executedChecks.filter((item) => item.status === 'PASS').length;
    const failCount = executedChecks.filter((item) => item.status === 'FAIL').length;
    const blockedCount = executedChecks.filter((item) => item.status === 'BLOCKED').length;
    const skippedCount = steps.length - executedChecks.length;
    const overallStatus = failCount ? 'FAILED' : (blockedCount ? 'NOT_READY' : (skippedCount ? 'FAILED' : 'PASSED'));
    const assertionsMap = {};
    for (const check of executedChecks) {
        for (const assertion of check.assertions || []) {
            assertionsMap[assertion] = check.status === 'PASS' ? 'PASSED' : check.status;
        }
    }
    verifyExecutedAssertions(assertionsMap, executedChecks);

    let build = null;
    const buildSummaryPath = join(artifactsDir, 'build-summary.json');
    if (existsSync(buildSummaryPath)) {
        try { build = JSON.parse(readFileSync(buildSummaryPath, 'utf8')); } catch {}
    }
    const payload = {
        schemaVersion: 2,
        timestamp: new Date().toISOString(),
        reviewBranch: 'mission/android-r5-recovery-20260814',
        testedSourceSha: currentGitSha,
        remoteSourceSha: remoteGitSha,
        cleanWorkingTree: !dirtyOutput,
        masterVerificationStatus: overallStatus,
        counts: { planned: steps.length, executed: executedChecks.length, passed: passCount, failed: failCount, blocked: blockedCount, skipped: skippedCount },
        artifact: build ? { apkPath: build.apkPath, apkSha256: build.apkSha256, aabPath: build.aabPath, aabSha256: build.aabSha256 } : null,
        executedChecks,
        assertions: assertionsMap
    };
    writeFileSync(join(artifactsDir, 'validation-state.json'), JSON.stringify(payload, null, 2), 'utf8');
    writeFileSync(join(artifactsDir, 'evidence-summary.json'), JSON.stringify(payload, null, 2), 'utf8');
    console.log(`\nAndroid R5 master gate: ${overallStatus}`);
    console.log(`Passed ${passCount}; failed ${failCount}; blocked ${blockedCount}; skipped ${skippedCount}.`);
    if (overallStatus !== 'PASSED') process.exit(blockedCount && !failCount ? 2 : 1);
    return payload;
}

// Execute as script when invoked directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    runMasterVerificationPipeline().catch((err) => {
        console.error(`[FAIL] Unhandled master verifier error: ${err.message}`);
        process.exit(1);
    });
}
