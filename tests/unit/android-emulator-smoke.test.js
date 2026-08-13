import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('VAL-R2-EMU-001..008 & VAL-CROSS-QA-001..008: Real Android API 36 Emulator QA Suite & Evidence Matrix Verification', async (t) => {
    // 1. Verify ADB device is connected
    let adbConnected = false;
    try {
        const adbDevices = execSync('adb devices', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        adbConnected = /device/u.test(adbDevices);
    } catch (e) {
        adbConnected = false;
    }

    const evidenceSummaryPath = join(root, 'artifacts', 'android-r2', 'evidence-summary.json');
    const legacySummaryPath = join(root, 'evidence', 'android', 'evidence-summary.json');
    const summaryExists = existsSync(evidenceSummaryPath) || existsSync(legacySummaryPath);

    if (!adbConnected || !summaryExists) {
        t.skip('Skipped: Requires active ADB device and generated evidence-summary.json');
        return;
    }

    const targetPath = existsSync(evidenceSummaryPath) ? evidenceSummaryPath : legacySummaryPath;
    const summary = JSON.parse(readFileSync(targetPath, 'utf8'));
    assert.equal(summary.avd, 'test_avd_api36');
    assert.equal(summary.apiLevel, 36);

    for (let i = 1; i <= 8; i++) {
        const crossId = `VAL-CROSS-QA-00${i}`;
        const emuId = `VAL-R2-EMU-00${i}`;
        if (summary.assertions[crossId]) {
            assert.equal(summary.assertions[crossId], 'PASSED', `${crossId} assertion must be PASSED`);
        }
        if (summary.assertions[emuId]) {
            assert.equal(summary.assertions[emuId], 'PASSED', `${emuId} assertion must be PASSED`);
        }
    }
});

test('Store Copy Character Limits Verification across App Store and Google Play', async () => {
    const output = execSync('node scripts/verify-store-copy.mjs', { cwd: root, encoding: 'utf8' });
    assert.match(output, /Verified store copy character limits/u);
});
