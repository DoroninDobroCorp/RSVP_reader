import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('VAL-CROSS-QA-001..008: Real Android API 36 Emulator QA Suite & Evidence Matrix Verification', async (t) => {
    // 1. Verify ADB device is connected
    let adbConnected = false;
    try {
        const adbDevices = execSync('adb devices', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        adbConnected = /device/u.test(adbDevices);
    } catch (e) {
        adbConnected = false;
    }

    const evidenceSummaryPath = join(root, 'evidence', 'android', 'evidence-summary.json');
    const summaryExists = existsSync(evidenceSummaryPath);

    if (!adbConnected || !summaryExists) {
        t.skip('Skipped: Requires active ADB device and generated evidence-summary.json');
        return;
    }

    const summary = JSON.parse(readFileSync(evidenceSummaryPath, 'utf8'));
    assert.equal(summary.avd, 'test_avd_api36');
    assert.equal(summary.apiLevel, 36);

    for (let i = 1; i <= 8; i++) {
        const id = `VAL-CROSS-QA-00${i}`;
        assert.equal(summary.assertions[id], 'PASSED', `${id} assertion must be PASSED`);
    }
});

test('Store Copy Character Limits Verification across App Store and Google Play', async () => {
    const output = execSync('node scripts/verify-store-copy.mjs', { cwd: root, encoding: 'utf8' });
    assert.match(output, /Verified store copy character limits/u);
});
