import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

test('VAL-R2-ARTIFACT-SCHEMA-001: legacy Android artifact manifest schema contract fixture', async () => {
    const fixtureDir = await mkdtemp(join(tmpdir(), 'hummingread-r2-artifact-contract-'));
    try {
        const apkName = 'HummingRead-R2-debug.fixture.apk';
        const aabName = 'HummingRead-R2-review.fixture.aab';
        const apkPath = join(fixtureDir, apkName);
        const aabPath = join(fixtureDir, aabName);
        const apkBytes = Buffer.from('R2_APK_SCHEMA_FIXTURE_NOT_AN_INSTALLABLE_ARTIFACT');
        const aabBytes = Buffer.from('R2_AAB_SCHEMA_FIXTURE_NOT_AN_UPLOADABLE_ARTIFACT');
        await writeFile(apkPath, apkBytes);
        await writeFile(aabPath, aabBytes);

        const apkSha256 = sha256(apkBytes);
        const aabSha256 = sha256(aabBytes);
        const checksums = `${apkSha256}  ${apkName}\n${aabSha256}  ${aabName}\n`;
        await writeFile(join(fixtureDir, 'checksums.sha256'), checksums, 'utf8');

        const manifest = {
            schemaVersion: 1,
            fixture: true,
            runtimeEvidence: false,
            milestone: 'R2',
            apk: { name: apkName, sha256: apkSha256 },
            aab: { name: aabName, sha256: aabSha256, signingState: 'FIXTURE' }
        };
        await writeFile(join(fixtureDir, 'artifact-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

        const parsed = JSON.parse(await readFile(join(fixtureDir, 'artifact-manifest.json'), 'utf8'));
        const parsedChecksums = await readFile(join(fixtureDir, 'checksums.sha256'), 'utf8');
        assert.equal(parsed.fixture, true);
        assert.equal(parsed.runtimeEvidence, false);
        assert.equal(parsed.apk.sha256, sha256(await readFile(apkPath)));
        assert.equal(parsed.aab.sha256, sha256(await readFile(aabPath)));
        assert.match(parsedChecksums, new RegExp(`^${apkSha256}  ${apkName}`, 'u'));
        assert.match(parsedChecksums, new RegExp(`${aabSha256}  ${aabName}$`, 'mu'));
        assert.equal('emulatorQaStatus' in parsed, false, 'schema fixture must not claim emulator execution');
        assert.equal('masterVerificationStatus' in parsed, false, 'schema fixture must not claim a release gate result');
    } finally {
        await rm(fixtureDir, { recursive: true, force: true });
    }
});
