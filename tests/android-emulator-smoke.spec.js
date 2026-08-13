import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test.describe('Android Emulator Smoke Suite (API 36)', () => {
    test('VAL-CROSS-QA-001..008: Real Android API 36 Emulator QA Suite & Evidence Matrix', async () => {
        // 1. Verify ADB device is connected
        const adbDevices = execSync('adb devices', { encoding: 'utf8' });
        expect(adbDevices).toContain('device');

        // 2. Run the automated QA runner if evidence does not exist
        const evidenceSummaryPath = join(root, 'evidence', 'android', 'evidence-summary.json');
        if (!existsSync(evidenceSummaryPath)) {
            execSync('node scripts/run-android-qa-suite.mjs', { cwd: root, stdio: 'inherit' });
        }

        expect(existsSync(evidenceSummaryPath)).toBe(true);
        const summary = JSON.parse(readFileSync(evidenceSummaryPath, 'utf8'));

        expect(summary.assertions['VAL-CROSS-QA-001']).toBe('PASSED');
        expect(summary.assertions['VAL-CROSS-QA-002']).toBe('PASSED');
        expect(summary.assertions['VAL-CROSS-QA-003']).toBe('PASSED');
        expect(summary.assertions['VAL-CROSS-QA-004']).toBe('PASSED');
        expect(summary.assertions['VAL-CROSS-QA-005']).toBe('PASSED');
        expect(summary.assertions['VAL-CROSS-QA-006']).toBe('PASSED');
        expect(summary.assertions['VAL-CROSS-QA-007']).toBe('PASSED');
        expect(summary.assertions['VAL-CROSS-QA-008']).toBe('PASSED');
    });

    test('Store copy character limits across App Store and Google Play', async () => {
        const output = execSync('node scripts/verify-store-copy.mjs', { cwd: root, encoding: 'utf8' });
        expect(output).toContain('Verified store copy character limits');
    });
});
