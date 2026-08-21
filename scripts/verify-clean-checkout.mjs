import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

async function main() {
    console.log('=== Starting Automated Clean Checkout Verification (VAL-R5-HERMETIC-002) ===');

    // Check if non-release overlay mode is explicitly requested
    const allowDevOverlay = process.argv.includes('--allow-overlay') ||
                           process.argv.includes('--dev-overlay') ||
                           process.env.DEV_NON_RELEASE_OVERLAY === '1';

    // 1. Check local source worktree git status
    const currentSha = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
    console.log(`[INFO] Current HEAD SHA: ${currentSha}`);

    const statusOutput = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' }).trim();
    if (statusOutput && !allowDevOverlay) {
        throw new Error(`Clean checkout release gate requires clean worktree. Uncommitted changes detected:\n${statusOutput}\nCommit or stash changes or pass --dev-overlay for non-release local testing.`);
    }

    const tempDir = await mkdtemp(join(tmpdir(), 'hummingread-clean-checkout-'));
    console.log(`[INFO] Created clean validation clone directory: ${tempDir}`);

    try {
        // 2. Clone fresh copy of repository into tempDir
        console.log(`[INFO] Cloning fresh copy of repository at ${currentSha}...`);
        execSync(`git clone "${root}" "${tempDir}"`, { stdio: 'inherit' });

        // Verify clone contains no copied node_modules, dist, dist-native, or artifacts
        const forbiddenDirs = ['node_modules', 'dist', 'dist-native', 'artifacts'];
        for (const dir of forbiddenDirs) {
            const forbiddenPath = join(tempDir, dir);
            if (existsSync(forbiddenPath)) {
                throw new Error(`Clean checkout clone must not contain pre-existing directory: ${dir}`);
            }
        }

        // Overlay ONLY if explicitly requested in non-release mode
        if (statusOutput && allowDevOverlay) {
            console.log('[INFO] (NON-RELEASE MODE) Overlaying worktree changes onto clone for development testing...');
            const lines = statusOutput.split('\n').filter(Boolean);
            for (const line of lines) {
                const relPath = line.slice(3).trim();
                if (!relPath || relPath.startsWith('node_modules/') || relPath.startsWith('dist/') || relPath.startsWith('dist-native/') || relPath.startsWith('artifacts/') || relPath.startsWith('evidence/')) {
                    continue;
                }
                const srcPath = join(root, relPath);
                const destPath = join(tempDir, relPath);
                if (existsSync(srcPath)) {
                    await mkdir(dirname(destPath), { recursive: true });
                    await cp(srcPath, destPath, { recursive: true });
                }
            }
        }

        // 3. Run npm ci in clean clone
        console.log('[INFO] Running npm ci in clean checkout...');
        execSync('npm ci', { cwd: tempDir, stdio: 'inherit' });

        // 4. Run hermetic unit tests with explicit TAP reporter
        console.log('[INFO] Running unit tests with machine-parseable TAP reporter in clean checkout...');
        const testRes = spawnSync('node', ['--test', '--test-reporter=tap', 'tests/unit/*.test.js'], {
            cwd: tempDir,
            encoding: 'utf8',
            env: { ...process.env, NODE_ENV: 'test' }
        });

        console.log(testRes.stdout);
        if (testRes.stderr) {
            console.error(testRes.stderr);
        }

        if (testRes.status !== 0) {
            throw new Error(`Unit tests failed in clean checkout with exit code ${testRes.status}`);
        }

        // 5. Machine-parse TAP summary lines
        const stdout = testRes.stdout || '';
        const testsMatch = stdout.match(/^# tests\s+(\d+)/mu);
        const passMatch = stdout.match(/^# pass\s+(\d+)/mu);
        const failMatch = stdout.match(/^# fail\s+(\d+)/mu);
        const cancelledMatch = stdout.match(/^# cancelled\s+(\d+)/mu);
        const skipMatch = stdout.match(/^# skipped\s+(\d+)/mu);
        const todoMatch = stdout.match(/^# todo\s+(\d+)/mu);

        const testsCount = testsMatch ? parseInt(testsMatch[1], 10) : 0;
        const passCount = passMatch ? parseInt(passMatch[1], 10) : 0;
        const failCount = failMatch ? parseInt(failMatch[1], 10) : -1;
        const cancelledCount = cancelledMatch ? parseInt(cancelledMatch[1], 10) : 0;
        const skipCount = skipMatch ? parseInt(skipMatch[1], 10) : -1;
        const todoCount = todoMatch ? parseInt(todoMatch[1], 10) : 0;

        console.log(`[INFO] Clean checkout test results: ${testsCount} total, ${passCount} passed, ${failCount} failed, ${cancelledCount} cancelled, ${skipCount} skipped, ${todoCount} todo.`);

        if (passCount < 98) {
            throw new Error(`Expected at least 98 unit subtests passed, got ${passCount}`);
        }
        if (failCount !== 0) {
            throw new Error(`Expected 0 unit subtest failures, got ${failCount}`);
        }
        if (cancelledCount !== 0) {
            throw new Error(`Expected 0 unit subtest cancellations, got ${cancelledCount}`);
        }
        if (skipCount !== 0) {
            throw new Error(`Expected 0 unit subtest skips, got ${skipCount}`);
        }
        if (todoCount !== 0) {
            throw new Error(`Expected 0 unit subtest todos, got ${todoCount}`);
        }
        if (passCount !== testsCount) {
            throw new Error(`Mismatch between total tests (${testsCount}) and passed tests (${passCount})`);
        }

        console.log(`[PASS] VAL-R5-HERMETIC-001: ${passCount}/${testsCount} unit subtests executed hermetically from clean checkout.`);
        console.log('[PASS] VAL-R5-HERMETIC-002: Automated clean checkout validation script completed successfully with 0 errors.');

    } finally {
        console.log(`[INFO] Cleaning up temporary clone directory ${tempDir}...`);
        await rm(tempDir, { recursive: true, force: true });
    }
}

async function mkdtemp(prefix) {
    const { mkdtemp: fsMkdtemp } = await import('node:fs/promises');
    return fsMkdtemp(prefix);
}

main().catch((err) => {
    console.error(`[FAIL] Clean checkout verification failed: ${err.message}`);
    process.exit(1);
});
