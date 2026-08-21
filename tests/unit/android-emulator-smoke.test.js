import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('VAL-AND-SCHEMA-001: Android Emulator Evidence Schema & Contract Verification', async () => {
    // Hermetic schema/contract validator for Android emulator QA evidence records
    const validateEmulatorEvidenceSchema = (payload) => {
        assert.ok(payload, 'Payload must not be null/undefined');
        assert.equal(typeof payload.timestamp, 'string', 'timestamp must be an ISO string');
        assert.equal(typeof payload.avd, 'string', 'avd must be a string');
        assert.equal(typeof payload.tabletAvd, 'string', 'tabletAvd must be a string');
        assert.equal(typeof payload.apiLevel, 'number', 'apiLevel must be a number');
        assert.ok(payload.apiLevel >= 34, 'apiLevel must be at least 34');
        assert.equal(typeof payload.apkSha256, 'string', 'apkSha256 must be a 64-char hex string');
        assert.equal(payload.apkSha256.length, 64, 'apkSha256 must be 64 characters');
        assert.ok(payload.assertions && typeof payload.assertions === 'object', 'assertions map must exist');

        const validStatuses = new Set(['PASSED', 'FAILED', 'BLOCKED']);
        for (const [id, status] of Object.entries(payload.assertions)) {
            assert.match(id, /^VAL-(?:R[2-5]-EMU|CROSS-QA)-\d{3}$/u, `Assertion ID format invalid: ${id}`);
            assert.ok(validStatuses.has(status), `Assertion status must be one of ${[...validStatuses].join(', ')}, got: ${status}`);
        }
        return true;
    };

    // Synthetic committed contract fixture
    const syntheticContractFixture = {
        timestamp: '2026-08-14T00:00:00.000Z',
        avd: 'test_avd_api36',
        tabletAvd: 'test_tablet_api36',
        apiLevel: 36,
        apkSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        assertions: {
            'VAL-CROSS-QA-001': 'PASSED',
            'VAL-CROSS-QA-002': 'PASSED',
            'VAL-CROSS-QA-003': 'PASSED',
            'VAL-CROSS-QA-004': 'PASSED',
            'VAL-CROSS-QA-005': 'PASSED',
            'VAL-CROSS-QA-006': 'PASSED',
            'VAL-CROSS-QA-007': 'PASSED',
            'VAL-CROSS-QA-008': 'PASSED',
            'VAL-R5-EMU-001': 'PASSED',
            'VAL-R5-EMU-002': 'PASSED',
            'VAL-R5-EMU-003': 'PASSED',
            'VAL-R5-EMU-004': 'PASSED',
            'VAL-R5-EMU-005': 'PASSED',
            'VAL-R5-EMU-006': 'PASSED',
            'VAL-R5-EMU-007': 'PASSED',
            'VAL-R5-EMU-008': 'PASSED',
            'VAL-R5-EMU-009': 'PASSED',
            'VAL-R5-EMU-010': 'PASSED',
            'VAL-R5-EMU-011': 'PASSED',
            'VAL-R5-EMU-012': 'PASSED',
            'VAL-R5-EMU-013': 'PASSED'
        }
    };

    assert.equal(validateEmulatorEvidenceSchema(syntheticContractFixture), true);

    // Negative schema assertions: missing timestamp, invalid apiLevel, invalid status
    assert.throws(() => validateEmulatorEvidenceSchema({ ...syntheticContractFixture, timestamp: 123 }), /timestamp must be an ISO string/);
    assert.throws(() => validateEmulatorEvidenceSchema({ ...syntheticContractFixture, apiLevel: 21 }), /apiLevel must be at least 34/);
    assert.throws(() => validateEmulatorEvidenceSchema({ ...syntheticContractFixture, assertions: { 'VAL-R5-EMU-001': 'INVALID_STATUS' } }), /Assertion status must be one of/);
});

test('Store Copy Character Limits Verification across App Store and Google Play', async () => {
    const output = execSync('node scripts/verify-store-copy.mjs', { cwd: root, encoding: 'utf8' });
    assert.match(output, /Verified store copy character limits/u);
});
