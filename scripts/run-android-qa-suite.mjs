import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkToolchain } from './toolchain-doctor.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const artifactsDir = join(root, 'artifacts', 'android-r5');
const qaSummaryPath = join(artifactsDir, 'qa-summary.json');
const validationStatePath = join(artifactsDir, 'validation-state.json');
const branch = 'mission/android-r5-recovery-20260814';
const apkPath = join(artifactsDir, 'HummingRead-R5-debug.apk');

const SCENARIOS = [
    ['VAL-R5-EMU-001', 'Phone install and first/cold/warm launch', 'First meaningful paint and white-frame timing are not yet captured by a trusted Android runner.'],
    ['VAL-R5-EMU-002', 'Phone EN/RU/ES UI and offline legal pages', 'The interrupted runner changed locale through CDP and did not open every legal page through visible Android UI.'],
    ['VAL-R5-EMU-003', 'Phone visible playback, pause, rewind and WPM', 'The interrupted runner invoked reader methods through CDP instead of visible controls.'],
    ['VAL-R5-EMU-004', 'Phone SAF imports for seven formats', 'Prior SAF evidence lacks fresh SHA-bound screenshots, persisted UI hierarchies, command records and fixture hashes.'],
    ['VAL-R5-EMU-005', 'Phone Sharesheet export and picker re-import', 'No deterministic receiver/saving route or exact exported-byte re-import proof exists.'],
    ['VAL-R5-EMU-006', 'Phone system Back hierarchy', 'Prior state setup used CDP; the mission requires visible UI setup for each Back layer.'],
    ['VAL-R5-EMU-007', 'Phone Delete All cancel and confirm', 'Prior Cancel/Confirm clicks were issued through CDP rather than Android UI input.'],
    ['VAL-R5-EMU-008', 'Phone airplane-mode offline playback', 'Prior playback was started through CDP and radio/network state evidence was incomplete.'],
    ['VAL-R5-EMU-009', 'Phone portrait/landscape state survival', 'Prior run did not save fresh before/after screenshots and complete measured geometry sidecars.'],
    ['VAL-R5-EMU-010', 'Phone exact process-death restoration', 'Prior run did not bind and reassert every named book ID, word index, WPM and changed setting.'],
    ['VAL-R5-EMU-011', 'Phone distinct-version upgrade preservation', 'Prior run reinstalled identical versionCode 200 bytes; R5 versionCode 201 must be rebuilt and tested over compatible R4 versionCode 200.'],
    ['VAL-R5-EMU-012', 'Phone KeepAwake and haptic observation', 'Prior runner substituted affirmative text for empty dumpsys output and captured no vibrator event.'],
    ['VAL-R5-EMU-013', 'Tablet install and distinct profile launch', 'Prior evidence is stale and lacks a fresh source/APK-bound device identity record.'],
    ['VAL-R5-EMU-014', 'Tablet localized layouts and dialogs', 'No complete fresh EN/RU/ES landing/library/reader/RSVP/settings/dialog matrix exists.'],
    ['VAL-R5-EMU-015', 'Tablet portrait/landscape state survival', 'No dedicated tablet rotation scenario with measured geometry and exact state assertions exists.'],
    ['VAL-R5-EMU-016', 'Tablet SAF import and system Back', 'No fresh representative tablet SAF and Back Android-system boundary evidence exists.']
];

const sha256 = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');

function checked(command, args, options = {}) {
    const started = new Date();
    const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', env: process.env, ...options });
    const ended = new Date();
    return {
        command: [command, ...args].join(' '),
        startTime: started.toISOString(),
        endTime: ended.toISOString(),
        durationMs: ended - started,
        exitCode: result.status ?? 1,
        stdout: result.stdout || '',
        stderr: result.stderr || ''
    };
}

function requireSuccess(result, label) {
    if (result.exitCode !== 0) throw new Error(`${label} failed (${result.exitCode}): ${result.stderr || result.stdout}`);
    return result.stdout.trim();
}

export async function runAndroidQaSuite() {
    const started = new Date();
    await mkdir(artifactsDir, { recursive: true });
    const sourceSha = requireSuccess(checked('git', ['rev-parse', 'HEAD']), 'git rev-parse');
    const remoteLine = requireSuccess(checked('git', ['ls-remote', '--heads', 'origin', branch]), 'git ls-remote');
    const remoteSha = remoteLine.split(/\s+/u)[0] || '';
    if (remoteSha !== sourceSha) throw new Error(`Source/remote SHA mismatch: ${sourceSha} != ${remoteSha}`);
    const dirty = requireSuccess(checked('git', ['status', '--porcelain']), 'git status');
    if (dirty) throw new Error(`Android QA requires a clean source checkout: ${dirty}`);
    if (!existsSync(apkPath) || statSync(apkPath).size < 1_000_000) throw new Error(`R5 APK missing or invalid: ${apkPath}`);
    const apkSha256 = await sha256(apkPath);

    const toolchain = checkToolchain();
    if (!toolchain.success) throw new Error(`Toolchain preflight failed: ${(toolchain.errors || []).join('; ')}`);
    Object.assign(process.env, toolchain.env || {});

    const runDir = join(artifactsDir, 'runtime', sourceSha);
    const logsDir = join(runDir, 'logs');
    const evidenceDir = join(runDir, 'evidence');
    await rm(runDir, { recursive: true, force: true });
    await mkdir(logsDir, { recursive: true });
    await mkdir(evidenceDir, { recursive: true });

    const avdHome = join(process.env.HOME || '', '.android', 'avd');
    const profiles = [
        { name: 'test_avd_api36', class: 'phone', expectedWidth: 1080, expectedHeight: 2400, density: 420 },
        { name: 'test_tablet_api36', class: 'tablet', expectedWidth: 2560, expectedHeight: 1600, density: 320 }
    ];
    const profileRecords = [];
    for (const profile of profiles) {
        const config = join(avdHome, `${profile.name}.avd`, 'config.ini');
        if (!existsSync(config)) throw new Error(`Dedicated AVD config missing: ${config}`);
        const content = await readFile(config, 'utf8');
        const value = (key) => content.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, 'mu'))?.[1]?.trim() || '';
        const actual = {
            ...profile,
            deviceName: value('hw.device.name'),
            width: Number(value('hw.lcd.width')),
            height: Number(value('hw.lcd.height')),
            actualDensity: Number(value('hw.lcd.density')),
            systemImage: value('image.sysdir.1')
        };
        if (actual.width !== profile.expectedWidth || actual.height !== profile.expectedHeight || actual.actualDensity !== profile.density) {
            throw new Error(`AVD ${profile.name} geometry mismatch: ${actual.width}x${actual.height}@${actual.actualDensity}`);
        }
        if (!actual.systemImage.includes('android-36')) throw new Error(`AVD ${profile.name} is not API 36: ${actual.systemImage}`);
        profileRecords.push(actual);
        await cp(config, join(evidenceDir, `${profile.name}-config.ini`));
    }

    const records = [];
    for (const [id, name, reason] of SCENARIOS) {
        const profile = Number(id.slice(-3)) <= 12 ? profileRecords[0] : profileRecords[1];
        const logPath = join(logsDir, `${id.toLowerCase()}.log`);
        const log = [
            `assertionId=${id}`,
            `status=BLOCKED`,
            `sourceSha=${sourceSha}`,
            `remoteSha=${remoteSha}`,
            `apkSha256=${apkSha256}`,
            `profile=${profile.name}`,
            `configuredGeometry=${profile.width}x${profile.height}@${profile.actualDensity}`,
            `reason=${reason}`,
            'No runtime PASS was inferred from historical R2/R3/R4/R5 files.'
        ].join('\n') + '\n';
        await writeFile(logPath, log, 'utf8');
        records.push({
            id,
            name,
            preconditions: ['clean remote source SHA', 'fresh R5 APK', 'dedicated API 36 AVD configuration'],
            sourceSha,
            remoteSourceSha: remoteSha,
            apkSha256,
            serial: profile.class === 'phone' ? 'NOT_STARTED_PHONE' : 'NOT_STARTED_TABLET',
            profile: profile.name,
            apiLevel: 36,
            geometry: { width: profile.width, height: profile.height, density: profile.actualDensity },
            method: 'FAIL_CLOSED_PREFLIGHT',
            actions: [{
                name: 'R5 trust audit preflight',
                performedBy: 'AUDIT',
                supplementary: true,
                allowFail: false,
                exitCode: 0,
                rawLogPath: relative(root, logPath)
            }],
            startTime: started.toISOString(),
            endTime: new Date().toISOString(),
            durationMs: 0,
            exitCode: 2,
            rawLogPath: relative(root, logPath),
            status: 'BLOCKED',
            reason
        });
    }

    const ended = new Date();
    const summary = {
        schemaVersion: 2,
        timestamp: ended.toISOString(),
        startTime: started.toISOString(),
        endTime: ended.toISOString(),
        durationMs: ended - started,
        testedSourceSha: sourceSha,
        remoteSourceSha: remoteSha,
        apkPath: relative(root, apkPath),
        apkSha256,
        evidenceDir: relative(root, evidenceDir),
        overallStatus: 'NOT_READY',
        counts: { pass: 0, fail: 0, blocked: records.length, skipped: 0 },
        profiles: profileRecords,
        records,
        assertions: Object.fromEntries(records.map((record) => [record.id, record.status]))
    };
    await writeFile(join(runDir, 'qa-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    await writeFile(qaSummaryPath, JSON.stringify(summary, null, 2), 'utf8');
    await writeFile(validationStatePath, JSON.stringify({
        timestamp: ended.toISOString(),
        testedSourceSha: sourceSha,
        overallStatus: 'NOT_READY',
        counts: summary.counts,
        qaSummaryPath: relative(root, qaSummaryPath)
    }, null, 2), 'utf8');
    console.error(`[BLOCKED] Android R5 runtime QA is NOT READY: ${records.length} required scenarios remain blocked.`);
    console.error(`Structured report: ${qaSummaryPath}`);
    return summary;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    runAndroidQaSuite().then(() => process.exit(2)).catch(async (error) => {
        console.error(`[FAIL] Android R5 QA preflight: ${error.stack || error.message}`);
        process.exit(1);
    });
}
