import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

async function main() {
    console.log('=== Starting Automated Clean Checkout Verification (VAL-R4-HERMETIC-002) ===');
    
    // 1. Check local source worktree git status
    const currentSha = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
    console.log(`[INFO] Current HEAD SHA: ${currentSha}`);

    const tempDir = await mkdtemp(join(tmpdir(), 'hummingread-clean-checkout-'));
    console.log(`[INFO] Created clean validation clone directory: ${tempDir}`);

    try {
        // 2. Clone fresh copy of repository into tempDir
        console.log(`[INFO] Cloning fresh copy of repository at ${currentSha}...`);
        execSync(`git clone "${root}" "${tempDir}"`, { stdio: 'inherit' });

        // Overlay uncommitted worktree source changes if any exist
        const statusOutput = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' }).trim();
        if (statusOutput) {
            console.log('[INFO] Overlaying worktree changes onto clean clone...');
            const lines = statusOutput.split('\n').filter(Boolean);
            for (const line of lines) {
                const relPath = line.slice(3).trim();
                if (!relPath || relPath.startsWith('node_modules/') || relPath.startsWith('dist/') || relPath.startsWith('dist-native/') || relPath.startsWith('artifacts/')) {
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

        // 4. Run npm run test:unit in clean checkout
        console.log('[INFO] Running npm run test:unit in clean checkout...');
        const testRes = spawnSync('npm', ['run', 'test:unit'], { cwd: tempDir, encoding: 'utf8' });
        
        console.log(testRes.stdout);
        if (testRes.stderr) {
            console.error(testRes.stderr);
        }

        if (testRes.status !== 0) {
            throw new Error(`Unit tests failed in clean checkout with exit code ${testRes.status}`);
        }

        // 5. Verify 98 passed, 0 failed, 0 skipped
        const stdout = testRes.stdout || '';
        const passMatch = stdout.match(/# pass (\d+)/u);
        const failMatch = stdout.match(/# fail (\d+)/u);
        const skipMatch = stdout.match(/# skipped (\d+)/u);

        const passCount = passMatch ? parseInt(passMatch[1], 10) : 0;
        const failCount = failMatch ? parseInt(failMatch[1], 10) : -1;
        const skipCount = skipMatch ? parseInt(skipMatch[1], 10) : -1;

        console.log(`[INFO] Clean checkout test results: ${passCount} passed, ${failCount} failed, ${skipCount} skipped.`);

        if (passCount < 98) {
            throw new Error(`Expected at least 98 unit subtests passed, got ${passCount}`);
        }
        if (failCount !== 0) {
            throw new Error(`Expected 0 unit subtest failures, got ${failCount}`);
        }
        if (skipCount !== 0) {
            throw new Error(`Expected 0 unit subtest skips, got ${skipCount}`);
        }

        console.log('[PASS] VAL-R4-HERMETIC-001: 98/98 unit subtests executed hermetically from clean checkout.');
        console.log('[PASS] VAL-R4-HERMETIC-002: Automated clean checkout validation script completed successfully with 0 errors.');

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
