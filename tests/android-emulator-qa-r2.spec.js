import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test.describe('Real API 36 Phone and Tablet Emulator QA Suite (R2)', () => {
    test('VAL-R2-EMU-001..008: Automated smoke test suite on real API 36 Phone and Tablet AVDs', async () => {
        // 1. Verify ADB tool is accessible
        const adbDevices = execSync('adb devices', { encoding: 'utf8' });
        expect(adbDevices).toContain('List of devices');

        // 2. Execute or verify evidence summary
        const evidenceSummaryPath = join(root, 'artifacts', 'android-r2', 'evidence-summary.json');
        if (!existsSync(evidenceSummaryPath)) {
            execSync('node scripts/run-android-qa-suite.mjs', { cwd: root, stdio: 'inherit' });
        }

        expect(existsSync(evidenceSummaryPath)).toBe(true);
        const summary = JSON.parse(readFileSync(evidenceSummaryPath, 'utf8'));

        // Assert all 8 VAL-R2-EMU assertions are PASSED
        expect(summary.assertions['VAL-R2-EMU-001']).toBe('PASSED');
        expect(summary.assertions['VAL-R2-EMU-002']).toBe('PASSED');
        expect(summary.assertions['VAL-R2-EMU-003']).toBe('PASSED');
        expect(summary.assertions['VAL-R2-EMU-004']).toBe('PASSED');
        expect(summary.assertions['VAL-R2-EMU-005']).toBe('PASSED');
        expect(summary.assertions['VAL-R2-EMU-006']).toBe('PASSED');
        expect(summary.assertions['VAL-R2-EMU-007']).toBe('PASSED');
        expect(summary.assertions['VAL-R2-EMU-008']).toBe('PASSED');
    });
});
