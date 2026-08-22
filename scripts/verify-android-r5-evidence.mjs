import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const artifactsDir = join(root, 'artifacts', 'android-r5');
const evidenceDir = join(root, 'evidence', 'android-r5');
const REQUIRED_SCENARIOS = Array.from({ length: 16 }, (_, i) => `VAL-R5-EMU-${String(i + 1).padStart(3, '0')}`);
const NATIVE_BOUNDARIES = new Set([
    'VAL-R5-EMU-004', 'VAL-R5-EMU-005', 'VAL-R5-EMU-006', 'VAL-R5-EMU-007',
    'VAL-R5-EMU-008', 'VAL-R5-EMU-009', 'VAL-R5-EMU-010', 'VAL-R5-EMU-011',
    'VAL-R5-EMU-012', 'VAL-R5-EMU-015', 'VAL-R5-EMU-016'
]);

const fail = (message) => { throw new Error(message); };
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

export function readPngDimensions(path) {
    const bytes = readFileSync(path);
    if (bytes.length < 24 || bytes.subarray(1, 4).toString('ascii') !== 'PNG') fail(`Invalid PNG: ${path}`);
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

export function verifyScenarioRecord(record, expectedSha, expectedApkHash) {
    if (!record || !REQUIRED_SCENARIOS.includes(record.id)) fail(`Unknown or missing Android scenario id: ${record?.id || 'missing'}`);
    for (const field of ['name', 'startTime', 'endTime', 'rawLogPath', 'serial', 'profile']) {
        if (!record[field] || typeof record[field] !== 'string') fail(`${record.id}: missing ${field}`);
    }
    if (!['PASS', 'FAIL', 'BLOCKED'].includes(record.status)) fail(`${record.id}: invalid status ${record.status}`);
    if (record.sourceSha !== expectedSha || record.apkSha256 !== expectedApkHash) fail(`${record.id}: stale source SHA or APK hash`);
    if (!Number.isInteger(record.apiLevel) || record.apiLevel !== 36) fail(`${record.id}: API level must be 36`);
    if (!record.geometry || !Number.isInteger(record.geometry.width) || !Number.isInteger(record.geometry.height)) fail(`${record.id}: missing measured geometry`);
    if (!Array.isArray(record.actions) || record.actions.length === 0) fail(`${record.id}: no executed actions`);
    if (record.status === 'PASS' && record.exitCode !== 0) fail(`${record.id}: PASS with non-zero exit code`);
    if (record.status !== 'PASS' && !record.reason) fail(`${record.id}: ${record.status} requires a reason`);
    for (const action of record.actions) {
        if (action.allowFail === true) fail(`${record.id}: proof action uses allowFail`);
        if (!Number.isInteger(action.exitCode)) fail(`${record.id}: action missing checked exitCode`);
        if (!action.rawLogPath) fail(`${record.id}: action missing rawLogPath`);
        if (NATIVE_BOUNDARIES.has(record.id) && String(action.performedBy || '').toUpperCase() === 'CDP' && !action.supplementary) {
            fail(`${record.id}: CDP performed a native boundary action`);
        }
    }
    return true;
}

export function verifyScreenshotTree(baseDir, expectedSha, expectedApkHash) {
    if (!existsSync(baseDir)) fail(`Screenshot directory missing: ${baseDir}`);
    const pngs = [];
    const walk = (dir) => {
        for (const name of readdirSync(dir)) {
            const path = join(dir, name);
            if (statSync(path).isDirectory()) walk(path);
            else if (name.endsWith('.png')) pngs.push(path);
        }
    };
    walk(baseDir);
    if (pngs.length === 0) fail(`No Android screenshots in ${baseDir}`);
    const seen = new Map();
    for (const png of pngs) {
        const canonicalSidecar = png.replace(/\.png$/u, '.json');
        const duplicateSidecar = `${png}.json`;
        if (!existsSync(canonicalSidecar)) fail(`Missing canonical sidecar for ${relative(root, png)}`);
        if (existsSync(duplicateSidecar)) fail(`Duplicate sidecar namespace for ${relative(root, png)}`);
        const sidecar = json(canonicalSidecar);
        const measured = readPngDimensions(png);
        const claimed = sidecar.measuredDimensions || sidecar.geometry;
        if (!claimed || measured.width !== claimed.width || measured.height !== claimed.height) fail(`PNG/sidecar dimensions mismatch for ${relative(root, png)}`);
        const sidecarSha = sidecar.testedSourceSha || sidecar.gitCommitSha || sidecar.commitSha;
        if (sidecarSha !== expectedSha || sidecar.apkSha256 !== expectedApkHash) fail(`Stale screenshot provenance for ${relative(root, png)}`);
        if (!sidecar.captureCommand || !String(sidecar.captureCommand).includes('adb')) fail(`Non-ADB screenshot capture for ${relative(root, png)}`);
        const hash = sha256(png);
        const scope = relative(baseDir, png).split('/')[0];
        const key = `${scope}:${hash}`;
        if (seen.has(key)) fail(`Duplicate workflow/state screenshot: ${relative(root, png)} equals ${seen.get(key)}`);
        seen.set(key, relative(root, png));
    }
    return pngs.length;
}

export function verifyAndroidR5Evidence(options = {}) {
    const testedSourceSha = options.testedSourceSha || process.env.TESTED_SOURCE_SHA;
    if (!testedSourceSha || !/^[0-9a-f]{40}$/u.test(testedSourceSha)) fail('TESTED_SOURCE_SHA must be an exact 40-character commit SHA');
    const buildPath = join(artifactsDir, 'build-summary.json');
    const qaPath = join(artifactsDir, 'qa-summary.json');
    if (!existsSync(buildPath)) fail('Missing R5 build-summary.json');
    if (!existsSync(qaPath)) fail('Missing R5 qa-summary.json');
    const build = json(buildPath);
    const qa = json(qaPath);
    if (build.testedSourceSha !== testedSourceSha || build.remoteSha !== testedSourceSha || !build.gitShaSynced) fail('Build summary is not bound to the verified remote tested source SHA');
    const apkPath = join(root, build.apkPath || '');
    const aabPath = join(root, build.aabPath || '');
    if (!existsSync(apkPath) || !existsSync(aabPath)) fail('APK/AAB referenced by build summary is missing');
    if (sha256(apkPath) !== build.apkSha256 || sha256(aabPath) !== build.aabSha256) fail('APK/AAB checksum mismatch against build summary');
    if (qa.testedSourceSha !== testedSourceSha && qa.commitSha !== testedSourceSha) fail('QA summary source SHA mismatch');
    if (qa.apkSha256 !== build.apkSha256) fail('QA summary APK hash mismatch');
    if (!Array.isArray(qa.records)) fail('QA summary records must be an array');
    const ids = qa.records.map((record) => record.id);
    if (new Set(ids).size !== ids.length) fail('Duplicate Android QA scenario id');
    for (const id of REQUIRED_SCENARIOS) if (!ids.includes(id)) fail(`Missing Android QA scenario: ${id}`);
    for (const record of qa.records) {
        verifyScenarioRecord(record, testedSourceSha, build.apkSha256);
        const raw = join(root, record.rawLogPath);
        if (!existsSync(raw) || statSync(raw).size === 0) fail(`${record.id}: missing or empty raw log`);
        for (const action of record.actions) {
            const actionRaw = join(root, action.rawLogPath);
            if (!existsSync(actionRaw) || statSync(actionRaw).size === 0) fail(`${record.id}: missing or empty action log ${action.rawLogPath}`);
        }
    }
    const counts = qa.records.reduce((acc, record) => { acc[record.status] = (acc[record.status] || 0) + 1; return acc; }, { PASS: 0, FAIL: 0, BLOCKED: 0 });
    if (counts.FAIL || counts.BLOCKED || counts.PASS !== REQUIRED_SCENARIOS.length) fail(`Android QA is NOT READY: ${counts.PASS} PASS, ${counts.FAIL} FAIL, ${counts.BLOCKED} BLOCKED`);
    const runtimeEvidenceDir = qa.evidenceDir ? join(root, qa.evidenceDir) : evidenceDir;
    const screenshotCount = verifyScreenshotTree(join(runtimeEvidenceDir, 'screenshots'), testedSourceSha, build.apkSha256);
    const accessibilityDir = join(runtimeEvidenceDir, 'accessibility');
    const hierarchies = existsSync(accessibilityDir) ? readdirSync(accessibilityDir).filter((name) => name.endsWith('.xml')) : [];
    if (hierarchies.length < 12) fail(`Insufficient Android UIAutomator accessibility hierarchies: ${hierarchies.length}, require at least 12`);
    return { testedSourceSha, apkSha256: build.apkSha256, scenarios: counts, screenshotCount, accessibilityHierarchies: hierarchies.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    try {
        const result = verifyAndroidR5Evidence();
        console.log(JSON.stringify({ status: 'PASS', ...result }, null, 2));
    } catch (error) {
        console.error(`[FAIL] Android R5 evidence verification: ${error.message}`);
        process.exit(1);
    }
}
