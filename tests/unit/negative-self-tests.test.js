import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm, mkdir, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolveToolchain } from '../../scripts/toolchain-doctor.mjs';
import {
    verifyApkFreshness,
    verifyApkChecksum,
    verifyManifestPermissions,
    verifyFileProviderPaths,
    verifyGitShaMatch,
    fetchRemoteGitSha,
    verifyLogProvenance,
    verifyScreenshotDeduplication,
    verifySidecarDimensions,
    verifySidecarCommitSha,
    verifyQaResults,
    verifyExecutionRecord,
    verifyExecutedAssertions,
    verifyNoCdpSubstitution,
    verifyCleanCloneNoPreexisting,
    verifyUnitTestSummary,
    verifyDistinctUpgradeApks,
    verifyDeviceClassGeometry,
    verifyR5NamespaceIsolation,
    verifyMandatoryChildCommands
} from '../../scripts/verify-all.mjs';
import { verifyScenarioRecord } from '../../scripts/verify-android-r5-evidence.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// 1. Missing JDK (VAL-R5-NEG-002 / Requirement 1)
test('VAL-R5-NEG-002 / NEG-01: missing JDK fails closed', () => {
    const res = resolveToolchain({
        env: {
            JAVA_HOME: '/nonexistent/jdk/path',
            PATH: '/empty_path_dir'
        }
    });
    assert.equal(res.success, false, 'Toolchain resolution must fail when JDK is missing');
    assert.ok(res.errors.some(e => e.includes('Java') || e.includes('JDK')), 'Error message must identify missing Java/JDK');
});

// 2. Wrong JDK Major Version (VAL-R5-NEG-002 / Requirement 1)
test('VAL-R5-NEG-002 / NEG-02: wrong JDK major version fails closed', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'neg-jdk-'));
    try {
        const binDir = join(tempDir, 'bin');
        await mkdir(binDir, { recursive: true });
        const mockJava = join(binDir, 'java');
        await writeFile(mockJava, '#!/bin/sh\necho "openjdk version \\"17.0.1\\" 2021-10-19"\n', { mode: 0o755 });

        const res = resolveToolchain({
            env: {
                JAVA_HOME: tempDir,
                PATH: `${binDir}:${process.env.PATH}`
            }
        });
        assert.equal(res.success, false, 'Toolchain resolution must fail when JDK version is not 21');
        assert.ok(res.errors.some(e => e.includes('does not report JDK 21')), 'Error must report non-JDK 21 version');
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});

// 3. Missing SDK 36 Platform (VAL-R5-NEG-002 / Requirement 2)
test('VAL-R5-NEG-002 / NEG-03: missing SDK 36 platform fails closed', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'neg-sdk-'));
    try {
        const res = resolveToolchain({
            env: {
                ANDROID_HOME: tempDir,
                ANDROID_SDK_ROOT: tempDir,
                PATH: process.env.PATH
            }
        });
        assert.equal(res.success, false, 'Toolchain resolution must fail when SDK 36 platform is missing');
        assert.ok(res.errors.some(e => e.includes('platforms/android-36') || e.includes('SDK')), 'Error must report missing SDK 36 platform');
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});

// 4. Missing APK (VAL-R5-NEG-002 / Requirement 6)
test('VAL-R5-NEG-002 / NEG-04: missing APK fails closed', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'neg-apk-missing-'));
    try {
        assert.throws(() => {
            verifyApkFreshness(join(tempDir, 'nonexistent.apk'), Date.now());
        }, /APK file missing/);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});

// 5. Stale APK Created Before Build Run (VAL-R5-NEG-002 / Requirement 6)
test('VAL-R5-NEG-002 / NEG-05: stale APK created before build run fails closed', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'neg-apk-stale-'));
    try {
        const apkPath = join(tempDir, 'HummingRead-R5-debug.apk');
        await writeFile(apkPath, 'DUMMY_STALE_APK', 'utf8');
        const pastTime = new Date(Date.now() - 3600000);
        await utimes(apkPath, pastTime, pastTime);

        const buildStartTime = Date.now();
        assert.throws(() => {
            verifyApkFreshness(apkPath, buildStartTime);
        }, /Stale APK detected/);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});

// 6. APK Checksum Mismatch (VAL-R5-NEG-002 / Requirement 7)
test('VAL-R5-NEG-002 / NEG-06: APK checksum mismatch fails closed', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'neg-checksum-'));
    try {
        const apkPath = join(tempDir, 'test.apk');
        await writeFile(apkPath, 'FIXTURE_CONTENT', 'utf8');
        const wrongHash = '0000000000000000000000000000000000000000000000000000000000000000';

        assert.throws(() => {
            verifyApkChecksum(apkPath, wrongHash);
        }, /APK SHA-256 mismatch/);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});

// 7. Unexpected INTERNET Permission (VAL-R5-NEG-002 / Requirement 8)
test('VAL-R5-NEG-002 / NEG-07: unexpected INTERNET permission fails closed', () => {
    const badManifest = `
        <manifest xmlns:android="http://schemas.android.com/apk/res/android">
            <uses-permission android:name="android.permission.INTERNET" />
            <application android:allowBackup="false" />
        </manifest>
    `;
    assert.throws(() => {
        verifyManifestPermissions(badManifest);
    }, /contains forbidden permission android\.permission\.INTERNET/);
});

// 8. Broad FileProvider Path (VAL-R5-NEG-002 / Requirement 9)
test('VAL-R5-NEG-002 / NEG-08: broad FileProvider path fails closed', () => {
    const badFilePaths = `
        <paths xmlns:android="http://schemas.android.com/apk/res/android">
            <external-path name="external_files" path="." />
        </paths>
    `;
    assert.throws(() => {
        verifyFileProviderPaths(badFilePaths);
    }, /contains broad external-path/);
});

// 9. Dirty Source Worktree Check (VAL-R5-NEG-002 / Requirement 3)
test('VAL-R5-NEG-002 / NEG-09: dirty source worktree fails closed', async () => {
    const tempFile = join(root, '.tmp-negative-test-dirty.tmp');
    await writeFile(tempFile, 'dirty_test_content', 'utf8');
    try {
        const res = spawnSync(process.execPath, [join(root, 'scripts', 'verify-all.mjs')], {
            cwd: root,
            encoding: 'utf8'
        });
        assert.equal(res.status, 1, 'verify-all.mjs must exit non-zero when working tree is dirty');
        assert.ok(
            res.stderr.includes('Dirty working tree detected') || res.stdout.includes('Dirty working tree detected'),
            'Output must explain dirty working tree failure'
        );
    } finally {
        await rm(tempFile, { force: true });
    }
});

// 10. Local/Remote SHA Mismatch (VAL-R5-NEG-002 / Requirement 4)
test('VAL-R5-NEG-002 / NEG-10: local/remote SHA mismatch fails closed', () => {
    const localSha = '1111111111111111111111111111111111111111';
    const remoteSha = '2222222222222222222222222222222222222222';
    assert.throws(() => {
        verifyGitShaMatch(localSha, remoteSha);
    }, /Git SHA mismatch/);
});

// 11. Unavailable git ls-remote with No Local-Ref Fallback (VAL-R5-NEG-002 / Requirement 4)
test('VAL-R5-NEG-002 / NEG-11: unavailable git ls-remote with no local-ref fallback fails closed', () => {
    assert.throws(() => {
        fetchRemoteGitSha({ remoteUrl: 'https://invalid-nonexistent-domain.test/repo.git', branch: 'mission' });
    }, /Failed to fetch remote Git SHA/);
});

// 12. Absent Validation Log for Claimed Assertion (VAL-R5-NEG-002 / Requirement 11)
test('VAL-R5-NEG-002 / NEG-12: absent validation log for claimed assertion fails closed', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'neg-log-'));
    try {
        const assertions = { 'VAL-R5-ENV-001': 'PASSED' };
        assert.throws(() => {
            verifyLogProvenance(assertions, tempDir);
        }, /Claimed assertion VAL-R5-ENV-001 has no matching validation log/);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});

// 13. Duplicate Workflow Screenshots (VAL-R5-NEG-002 / Requirement 19)
test('VAL-R5-NEG-002 / NEG-13: duplicate workflow screenshots fail closed', () => {
    const hashes = {
        'step_1_landing.png': 'abc123hash',
        'step_3_rsvp_playing.png': 'abc123hash'
    };
    assert.throws(() => {
        verifyScreenshotDeduplication(hashes);
    }, /Duplicate workflow screenshot detected/);
});

// 14. PNG/Sidecar Dimension Mismatch (VAL-R5-NEG-002 / Requirement 17)
test('VAL-R5-NEG-002 / NEG-14: PNG/sidecar dimension mismatch fails closed', () => {
    assert.throws(() => {
        verifySidecarDimensions(320, 640, 390, 844);
    }, /PNG\/sidecar dimension mismatch/);
});

// 15. Sidecar Source SHA Mismatch (VAL-R5-NEG-002 / Requirement 18)
test('VAL-R5-NEG-002 / NEG-15: sidecar source SHA mismatch fails closed', () => {
    assert.throws(() => {
        verifySidecarCommitSha('old_commit_sha_123', 'current_commit_sha_456');
    }, /Sidecar source SHA mismatch/);
});

// 16. CDP Substitution for Native QA (VAL-R5-NEG-002 / Requirement 12)
test('VAL-R5-NEG-002 / NEG-16: CDP substitution for native QA fails closed', () => {
    const cdpScenario = {
        id: 'VAL-R5-EMU-004',
        name: 'Real SAF document import',
        status: 'PASS',
        startTime: '2026-08-22T00:00:00.000Z',
        endTime: '2026-08-22T00:01:00.000Z',
        rawLogPath: 'artifacts/android-r5/logs/saf.log',
        serial: 'emulator-5554',
        profile: 'test_avd_api36',
        sourceSha: 'a'.repeat(40),
        apkSha256: 'b'.repeat(64),
        apiLevel: 36,
        geometry: { width: 1080, height: 2400 },
        exitCode: 0,
        actions: [{ performedBy: 'CDP', exitCode: 0, rawLogPath: 'artifacts/android-r5/logs/cdp.log' }]
    };
    assert.throws(() => {
        verifyScenarioRecord(cdpScenario, 'a'.repeat(40), 'b'.repeat(64));
    }, /CDP performed a native boundary action/);
});

// 17. An allowFail Platform Command Used as Proof (VAL-R5-NEG-002 / Requirement 13)
test('VAL-R5-NEG-002 / NEG-17: allowFail platform command used as proof fails closed', () => {
    const record = {
        id: 'VAL-R5-EMU-008',
        name: 'Airplane mode playback',
        status: 'PASS',
        startTime: '2026-08-22T00:00:00.000Z',
        endTime: '2026-08-22T00:01:00.000Z',
        rawLogPath: 'artifacts/android-r5/logs/airplane.log',
        serial: 'emulator-5554',
        profile: 'test_avd_api36',
        sourceSha: 'a'.repeat(40),
        apkSha256: 'b'.repeat(64),
        apiLevel: 36,
        geometry: { width: 1080, height: 2400 },
        exitCode: 0,
        actions: [{ performedBy: 'ADB', allowFail: true, exitCode: 0, rawLogPath: 'artifacts/android-r5/logs/airplane-command.log' }]
    };
    assert.throws(() => {
        verifyScenarioRecord(record, 'a'.repeat(40), 'b'.repeat(64));
    }, /proof action uses allowFail/);
});

// 18. Hard-Coded PASSED Assertion Without an Executed Check Record (VAL-R5-NEG-002 / Requirement 14)
test('VAL-R5-NEG-002 / NEG-18: hard-coded PASSED assertion without executed check record fails closed', () => {
    const assertions = { 'VAL-R5-EMU-001': 'PASSED' };
    const executedChecks = [
        { id: 'step-01-toolchain-doctor', status: 'PASS', assertions: ['VAL-R5-ENV-001'] }
    ];
    assert.throws(() => {
        verifyExecutedAssertions(assertions, executedChecks);
    }, /Hard-coded PASSED assertion without an executed check record: VAL-R5-EMU-001/);
});

// 19. Same APK Hash / Version Used for Upgrade (VAL-R5-NEG-002 / Requirement 15)
test('VAL-R5-NEG-002 / NEG-19: same APK hash or version used for upgrade fails closed', () => {
    const sameHash = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    assert.throws(() => {
        verifyDistinctUpgradeApks(sameHash, sameHash, 2, 2);
    }, /Upgrade test requires distinct APK hashes/);

    assert.throws(() => {
        verifyDistinctUpgradeApks('hash1', 'hash2', 2, 1);
    }, /Upgrade test requires higher new versionCode/);
});

// 20. Phone Profile Geometry Used as Tablet (VAL-R5-NEG-002 / Requirement 16)
test('VAL-R5-NEG-002 / NEG-20: phone profile geometry used as tablet fails closed', () => {
    assert.throws(() => {
        verifyDeviceClassGeometry('pixel_tablet', 1080, 2400);
    }, /Tablet profile pixel_tablet has invalid phone-like geometry: 1080x2400/);
});

// 21. Copied / Pre-existing generated output in Validation Clone (VAL-R5-NEG-002 / Requirement 5)
test('VAL-R5-NEG-002 / NEG-21: copied/pre-existing generated output in validation clone fails closed', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'neg-clone-'));
    try {
        await mkdir(join(tempDir, 'evidence'), { recursive: true });
        assert.throws(() => {
            verifyCleanCloneNoPreexisting(tempDir);
        }, /Clean checkout clone contains pre-existing forbidden directory: evidence/);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});

// 22. Unit Test Count Mismatch, Failure, or Skip (VAL-R5-NEG-002 / Requirement 10)
test('VAL-R5-NEG-002 / NEG-22: unit test count mismatch, failure, or skip fails closed', () => {
    assert.throws(() => {
        verifyUnitTestSummary({ testsCount: 98, passCount: 97, failCount: 1, skipCount: 0 });
    }, /Unit test failures detected/);

    assert.throws(() => {
        verifyUnitTestSummary({ testsCount: 98, passCount: 97, failCount: 0, skipCount: 1 });
    }, /Unit test skips detected/);

    assert.throws(() => {
        verifyUnitTestSummary({ testsCount: 104, passCount: 104, failCount: 0, skipCount: 0 });
    }, /Unit test count mismatch: expected exactly 105/);
});

// 23. Cross-Writing R5 Results into R2/R3/R4 Directories (VAL-R5-NEG-002 / Requirement 20)
test('VAL-R5-NEG-002 / NEG-23: cross-writing R5 results into R2/R3/R4 directories fails closed', () => {
    assert.throws(() => {
        verifyR5NamespaceIsolation('/srv/RSVP_reader-r2/artifacts/android-r2');
    }, /Cross-milestone write violation/);

    assert.throws(() => {
        verifyR5NamespaceIsolation('/srv/RSVP_reader-r2/artifacts/android-r4');
    }, /Cross-milestone write violation/);
});

// 24. Empty Log or Orphan Assertion (VAL-R5-NEG-002 / Requirement 21)
test('VAL-R5-NEG-002 / NEG-24: empty log for claimed assertion fails closed', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'neg-empty-log-'));
    try {
        const logFile = join(tempDir, 'val-r5-emu-001.log');
        await writeFile(logFile, '   \n\n', 'utf8');
        assert.throws(() => {
            verifyLogProvenance({ 'VAL-R5-EMU-001': 'PASSED' }, tempDir);
        }, /Validation log for claimed assertion VAL-R5-EMU-001 is empty/);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});

// 25. Android QA Child Command Omitted from Master Gate (VAL-R5-NEG-002 / Requirement 22)
test('VAL-R5-NEG-002 / NEG-25: Android QA child command omitted from master gate fails closed', () => {
    const executed = ['step-01-toolchain-doctor', 'step-02-verify-brand'];
    const required = ['step-01-toolchain-doctor', 'step-02-verify-brand', 'step-22-android-qa-suite'];
    assert.throws(() => {
        verifyMandatoryChildCommands(executed, required);
    }, /Mandatory verification step omitted from master gate: step-22-android-qa-suite/);
});
