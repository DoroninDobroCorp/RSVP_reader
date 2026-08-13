import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function runStep(name, command, args, options = {}) {
    console.log(`\n====================================================`);
    console.log(`>>> Running Verification Step: ${name}`);
    console.log(`====================================================\n`);

    const result = spawnSync(command, args, {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, ...options.env }
    });

    if (result.status !== 0) {
        console.error(`\n[FAIL] Verification step "${name}" failed with exit code ${result.status}. Aborting master pipeline.`);
        process.exit(result.status || 1);
    }
    console.log(`\n[PASS] Verification step "${name}" completed successfully.`);
}

async function verifyAll() {
    console.log('=== Starting Fail-Closed Master Verifier Pipeline (verify-all.mjs) ===\n');

    const allowDirty = process.argv.includes('--allow-dirty');

    // 1. VAL-R2-VERIFY-003: Fresh Git SHA and Clean Working Tree Pre-Verification Check
    console.log('1. Checking VAL-R2-VERIFY-003: Fresh Git SHA & Clean Working Tree Invariant...');
    const statusRes = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
    if (statusRes.status !== 0) {
        console.error('[FAIL] Failed to execute git status --porcelain');
        process.exit(1);
    }

    const dirtyOutput = statusRes.stdout ? statusRes.stdout.trim() : '';
    if (dirtyOutput && !allowDirty) {
        console.error('[FAIL] VAL-R2-VERIFY-003 Failed: Dirty working tree detected! Uncommitted changes are present:');
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

    // 2. Sequential fail-closed verification pipeline (VAL-R2-VERIFY-006 & VAL-R2-TEST-005)
    const nodeBin = process.execPath;

    runStep('01 Toolchain Doctor Diagnostic', nodeBin, ['scripts/toolchain-doctor.mjs']);
    runStep('02 Brand & Placeholder Integrity', nodeBin, ['scripts/verify-brand.mjs']);
    runStep('03 Third-Party Notices & License Integrity', nodeBin, ['scripts/verify-notices.mjs']);
    runStep('04 Packaged Asset Stripping & Security', nodeBin, ['scripts/verify-packaged-assets.mjs']);
    runStep('05 Android Local Privacy & Permissions Audit', nodeBin, ['scripts/verify-android-privacy.mjs']);
    runStep('06 Android Package & SHA-256 Checksum Gate', nodeBin, ['scripts/verify-android-package.mjs']);
    runStep('07 Chrome Extension Manifest & Catalog Verification', nodeBin, ['scripts/verify-chrome-extension.mjs']);
    runStep('08 Service Worker App Shell Precache Audit', nodeBin, ['scripts/verify-service-worker-precache.mjs']);
    runStep('09 Deployment & Security Gate', nodeBin, ['scripts/verify-deployment.mjs']);
    runStep('10 Deterministic Build Output Audit', nodeBin, ['scripts/verify-deterministic-build.mjs']);
    runStep('11 Store Metadata Copy & Localization Gate', nodeBin, ['scripts/verify-store-copy.mjs']);
    runStep('12 Hermetic Unit Tests', nodeBin, ['--test', 'tests/unit/*.test.js']);

    console.log('\n====================================================');
    console.log('MASTER VERIFICATION SUITE PASSED (0 errors, 0 warnings)');
    console.log('====================================================\n');
}

verifyAll().catch((err) => {
    console.error(`[FAIL] Unhandled master verifier error: ${err.message}`);
    process.exit(1);
});
