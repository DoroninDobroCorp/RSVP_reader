import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { checkToolchain } from './toolchain-doctor.mjs';
import { generateSyntheticFixtures } from './synthetic-fixtures.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = 'team.ibet.paceflow';
const activity = `${pkg}/.MainActivity`;
const artifactsDir = join(root, 'artifacts', 'android-r5');
const buildSummaryPath = join(artifactsDir, 'build-summary.json');
const devMode = process.argv.includes('--dev');
const onlyScenarioIds = new Set(String(process.env.ONLY_SCENARIOS || '').split(',').map((value) => value.trim()).filter(Boolean));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

function checked(program, args = [], options = {}) {
    const result = spawnSync(program, args, {
        cwd: options.cwd || root,
        env: { ...process.env, ...options.env },
        encoding: options.encoding === null ? null : 'utf8',
        timeout: options.timeout || 120000,
        input: options.input
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        const stdout = Buffer.isBuffer(result.stdout) ? result.stdout.toString('utf8') : (result.stdout || '');
        const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString('utf8') : (result.stderr || '');
        throw new Error(`${program} ${args.join(' ')} failed (${result.status}): ${stderr || stdout}`);
    }
    return result.stdout;
}

const adbBin = () => process.env.ADB_BIN || '/opt/android-sdk/platform-tools/adb';
const emulatorBin = () => process.env.EMULATOR_BIN || '/opt/android-sdk/emulator/emulator';
const adb = (serial, ...args) => checked(adbBin(), ['-s', serial, ...args]);
const shell = (serial, ...args) => adb(serial, 'shell', ...args);

function gitValue(args) {
    return String(checked('git', args)).trim();
}

function remoteSha(branch) {
    const output = String(checked('git', ['ls-remote', '--heads', 'origin', branch])).trim();
    return output.split(/\s+/u)[0] || '';
}

class WebViewReader {
    constructor(serial, port) {
        this.serial = serial;
        this.port = port;
        this.ws = null;
        this.nextId = 0;
        this.pending = new Map();
    }

    async connect(requireReader = true) {
        const pid = String(shell(this.serial, 'pidof', pkg)).trim().split(/\s+/u)[0];
        if (!/^\d+$/u.test(pid)) {
            throw new Error(`Cannot discover WebView process for ${this.serial}`);
        }
        try { adb(this.serial, 'forward', '--remove', `tcp:${this.port}`); } catch {}
        adb(this.serial, 'forward', `tcp:${this.port}`, `localabstract:webview_devtools_remote_${pid}`);
        let target;
        for (let attempt = 0; attempt < 60; attempt += 1) {
            try {
                const targets = await (await fetch(`http://127.0.0.1:${this.port}/json/list`)).json();
                target = targets.find((item) => item.type === 'page') || targets[0];
                if (target?.webSocketDebuggerUrl) break;
            } catch {}
            await sleep(250);
        }
        if (!target?.webSocketDebuggerUrl) throw new Error(`No WebView target for ${this.serial}`);
        await new Promise((resolve, reject) => {
            this.ws = new WebSocket(target.webSocketDebuggerUrl);
            this.ws.onopen = resolve;
            this.ws.onerror = reject;
            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (!message.id || !this.pending.has(message.id)) return;
                const pending = this.pending.get(message.id);
                this.pending.delete(message.id);
                if (message.error) pending.reject(new Error(message.error.message));
                else pending.resolve(message.result);
            };
        });
        if (requireReader) await this.waitFor('!!window.rsvpReader', 30000);
        return this;
    }

    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = ++this.nextId;
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async evaluate(expression) {
        const response = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'WebView evaluation failed');
        return response.result?.value;
    }

    async waitFor(expression, timeoutMs = 12000) {
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
            try {
                if (await this.evaluate(expression)) return true;
            } catch {}
            await sleep(200);
        }
        throw new Error(`Timed out waiting for WebView state: ${expression}`);
    }

    close() {
        try { this.ws?.close(); } catch {}
        this.ws = null;
        try { adb(this.serial, 'forward', '--remove', `tcp:${this.port}`); } catch {}
    }
}

function parseGeometry(serial) {
    const sizeText = String(shell(serial, 'wm', 'size'));
    const densityText = String(shell(serial, 'wm', 'density'));
    const size = sizeText.match(/Physical size:\s*(\d+)x(\d+)/u);
    const density = densityText.match(/Physical density:\s*(\d+)/u);
    if (!size || !density) throw new Error(`Cannot parse geometry for ${serial}`);
    return { width: Number(size[1]), height: Number(size[2]), density: Number(density[1]) };
}

function webViewBounds(serial) {
    const remote = `/sdcard/r5-bounds-${Date.now()}.xml`;
    try { shell(serial, 'uiautomator', 'dump', remote); } catch {}
    let xml = '';
    try { xml = String(adb(serial, 'exec-out', 'cat', remote)); } catch {}
    const match = xml.match(/class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/u);
    return match ? { left: Number(match[1]), top: Number(match[2]), right: Number(match[3]), bottom: Number(match[4]) } : { left: 0, top: 0 };
}

async function startAvd(profile, serial, port) {
    const connected = String(checked(adbBin(), ['devices'])).includes(`${serial}\tdevice`);
    if (connected) {
        const active = String(shell(serial, 'getprop', 'ro.boot.qemu.avd_name')).trim();
        if (active === profile && String(shell(serial, 'getprop', 'sys.boot_completed')).trim() === '1') return;
        try { adb(serial, 'emu', 'kill'); } catch {}
        await sleep(1500);
    }
    mkdirSync(join(artifactsDir, 'emulator-logs'), { recursive: true });
    const logPath = join(artifactsDir, 'emulator-logs', `${profile}.log`);
    const fd = openSync(logPath, 'a');
    const child = spawn(emulatorBin(), [
        '-avd', profile, '-port', String(port), '-no-window', '-no-audio', '-no-boot-anim',
        '-gpu', 'swiftshader_indirect', '-no-snapshot', '-wipe-data'
    ], { detached: true, stdio: ['ignore', fd, fd], env: process.env });
    child.unref();
    closeSync(fd);
    const started = Date.now();
    while (Date.now() - started < 180000) {
        try {
            if (String(shell(serial, 'getprop', 'sys.boot_completed')).trim() === '1') {
                shell(serial, 'input', 'keyevent', '82');
                shell(serial, 'settings', 'put', 'system', 'screen_off_timeout', '2147483647');
                return;
            }
        } catch {}
        await sleep(1000);
    }
    throw new Error(`AVD ${profile} did not boot on ${serial}`);
}

function stopAvd(serial) {
    try { adb(serial, 'emu', 'kill'); } catch {}
}

function recordTemplate(id, name, ctx) {
    const now = new Date().toISOString();
    const rawLogPath = relative(root, join(ctx.logsDir, `${id.toLowerCase()}.log`));
    return {
        id, name, preconditions: ['clean remote source SHA', 'fresh R5 APK', 'dedicated API 36 AVD'],
        sourceSha: ctx.sourceSha, remoteSourceSha: ctx.remoteSha, apkSha256: ctx.apkSha256,
        serial: ctx.serial, profile: ctx.profile, apiLevel: 36, geometry: ctx.geometry,
        method: 'ADB_VISIBLE_UI_WITH_READ_ONLY_STATE_ASSERTIONS', actions: [], screenshots: [],
        startTime: now, endTime: now, durationMs: 0, exitCode: 1, rawLogPath, status: 'FAIL', reason: 'not executed'
    };
}

function appendLog(record, line) {
    const path = join(root, record.rawLogPath);
    mkdirSync(dirname(path), { recursive: true });
    const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
    writeFileSync(path, `${current}${new Date().toISOString()} ${line}\n`);
}

function action(record, name, performedBy, output = '') {
    appendLog(record, `ACTION ${performedBy} ${name}: ${String(output).trim() || 'ok'}`);
    record.actions.push({ name, performedBy, supplementary: false, allowFail: false, exitCode: 0, rawLogPath: record.rawLogPath });
}

function state(record, name, value) {
    appendLog(record, `STATE ${name}: ${JSON.stringify(value)}`);
}

async function tapSelector(ctx, record, selector) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const info = await ctx.client.evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); if(!e) return null; const r=e.getBoundingClientRect(); const points=[[.5,.5],[.25,.5],[.75,.5],[.5,.25],[.5,.75]]; const point=points.map(([px,py])=>({x:r.x+r.width*px,y:r.y+r.height*py})).find((p)=>{const hit=document.elementFromPoint(p.x,p.y);return hit===e||e.contains(hit)}); const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return { x:r.x, y:r.y, width:r.width, height:r.height, tapX:point?.x, tapY:point?.y, actionable:!!point, hitId:hit?.id||hit?.className||hit?.tagName||'', innerHeight, dpr:devicePixelRatio, hidden:!!e.hidden }; })()`);
        if (!info) throw new Error(`${selector} not found`);
        if (info.width > 0 && info.height > 0 && info.y >= 4 && info.y + info.height <= info.innerHeight - 4) {
            const bounds = ctx.webBounds || (ctx.webBounds = webViewBounds(ctx.serial));
            if (!info.actionable) throw new Error(`${selector} is covered by ${info.hitId || 'another layer'}`);
            const x = Math.round(bounds.left + info.tapX * info.dpr);
            const y = Math.round(bounds.top + info.tapY * info.dpr);
            const output = shell(ctx.serial, 'input', 'tap', String(x), String(y));
            action(record, `tap ${selector} at ${x},${y}`, 'ADB', output);
            await sleep(500);
            return { x, y };
        }
        const geometry = ctx.geometry;
        const scrollRect = await ctx.client.evaluate(`(() => { let e=document.querySelector(${JSON.stringify(selector)})?.parentElement; while(e&&e!==document.documentElement){const style=getComputedStyle(e);if(e.scrollHeight>e.clientHeight+4&&/(?:auto|scroll)/u.test(style.overflowY)){const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,dpr:devicePixelRatio};}e=e.parentElement;}return null;})()`);
        const bounds = ctx.webBounds || (ctx.webBounds = webViewBounds(ctx.serial));
        const swipeX = scrollRect ? Math.round(bounds.left + (scrollRect.x + scrollRect.width * 0.1) * scrollRect.dpr) : Math.round(geometry.width * 0.94);
        const swipeTop = scrollRect ? Math.round(bounds.top + (scrollRect.y + scrollRect.height * 0.25) * scrollRect.dpr) : Math.round(geometry.height * 0.34);
        const swipeBottom = scrollRect ? Math.round(bounds.top + (scrollRect.y + scrollRect.height * 0.75) * scrollRect.dpr) : Math.round(geometry.height * 0.78);
        if (info.y + info.height > info.innerHeight) {
            shell(ctx.serial, 'input', 'swipe', String(swipeX), String(swipeBottom), String(swipeX), String(swipeTop), '350');
            action(record, `swipe up to reveal ${selector}`, 'ADB');
        } else {
            shell(ctx.serial, 'input', 'swipe', String(swipeX), String(swipeTop), String(swipeX), String(swipeBottom), '350');
            action(record, `swipe down to reveal ${selector}`, 'ADB');
        }
        await sleep(500);
    }
    throw new Error(`Could not make ${selector} visible via ADB swipes`);
}

async function capture(ctx, record, name) {
    const scope = ctx.profile.includes('tablet') ? 'tablet' : 'phone';
    const dir = join(ctx.evidenceDir, 'screenshots', scope);
    const accessDir = join(ctx.evidenceDir, 'accessibility');
    mkdirSync(dir, { recursive: true });
    mkdirSync(accessDir, { recursive: true });
    const png = join(dir, `${record.id.toLowerCase()}-${name}.png`);
    const shot = spawnSync(adbBin(), ['-s', ctx.serial, 'exec-out', 'screencap', '-p'], { encoding: null, timeout: 30000, maxBuffer: 64 * 1024 * 1024 });
    if (shot.status !== 0 || !shot.stdout?.length) throw new Error(`screencap failed for ${record.id}: ${shot.error?.message || shot.stderr?.toString('utf8') || `status ${shot.status}`}`);
    writeFileSync(png, shot.stdout);
    const meta = await sharp(shot.stdout).metadata();
    const sidecar = {
        scenarioId: record.id, testedSourceSha: ctx.sourceSha, apkSha256: ctx.apkSha256,
        serial: ctx.serial, avdName: ctx.profile, apiLevel: 36,
        measuredDimensions: { width: meta.width, height: meta.height },
        captureCommand: `${adbBin()} -s ${ctx.serial} exec-out screencap -p`,
        timestamp: new Date().toISOString()
    };
    writeFileSync(png.replace(/\.png$/u, '.json'), `${JSON.stringify(sidecar, null, 2)}\n`);
    record.screenshots.push(relative(root, png));
    const remoteXml = `/sdcard/${record.id.toLowerCase()}-${Date.now()}.xml`;
    try { shell(ctx.serial, 'uiautomator', 'dump', remoteXml); } catch {}
    let xml = '';
    try { xml = String(adb(ctx.serial, 'exec-out', 'cat', remoteXml)); } catch {}
    if (!xml.trim()) xml = `<hierarchy scenario="${record.id}" serial="${ctx.serial}" unavailable="true"/>`;
    writeFileSync(join(accessDir, `${record.id.toLowerCase()}.xml`), xml);
    action(record, `capture screenshot and UI hierarchy ${name}`, 'ADB', relative(root, png));
}

function findUiNode(xml, wanted) {
    const nodes = [...xml.matchAll(/<node\b([^>]*)\/>/gu)].map((match) => {
        const attrs = {};
        for (const attr of match[1].matchAll(/([\w-]+)="([^"]*)"/gu)) attrs[attr[1]] = attr[2];
        const bounds = attrs.bounds?.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/u);
        return { ...attrs, centerX: bounds ? Math.round((Number(bounds[1]) + Number(bounds[3])) / 2) : 0, centerY: bounds ? Math.round((Number(bounds[2]) + Number(bounds[4])) / 2) : 0 };
    });
    return nodes.find((node) => wanted(node));
}

async function dumpUi(serial) {
    const remote = `/sdcard/r5-ui-${Date.now()}.xml`;
    shell(serial, 'uiautomator', 'dump', remote);
    return String(adb(serial, 'exec-out', 'cat', remote));
}

async function selectDocument(ctx, record, fileName) {
    await sleep(800);
    let focus = String(shell(ctx.serial, 'dumpsys', 'window'));
    if (!/documentsui|picker/iu.test(focus)) throw new Error(`DocumentsUI not focused for ${fileName}`);
    let xml = '';
    let node;
    let search;
    for (let attempt = 0; attempt < 24; attempt += 1) {
        xml = await dumpUi(ctx.serial);
        node = findUiNode(xml, (item) => (item.text === fileName || item.text?.startsWith(`${fileName}.`)) && item['resource-id'] === 'android:id/title');
        search = findUiNode(xml, (item) => /Search/iu.test(item['content-desc'] || ''));
        if (node || search) break;
        await sleep(250);
    }
    if (!node && search) {
        shell(ctx.serial, 'input', 'tap', String(search.centerX), String(search.centerY));
        action(record, 'open DocumentsUI search', 'ADB');
        await sleep(400);
        shell(ctx.serial, 'input', 'text', fileName);
        action(record, `type ${fileName} in DocumentsUI search`, 'ADB');
        await sleep(1200);
    }
    for (let attempt = 0; attempt < 8; attempt += 1) {
        xml = await dumpUi(ctx.serial);
        node = findUiNode(xml, (item) => (item.text === fileName || item.text?.startsWith(`${fileName}.`)) && item['resource-id'] === 'android:id/title');
        if (node) break;
        shell(ctx.serial, 'input', 'swipe', '540', '1800', '540', '700', '300');
        action(record, `scroll DocumentsUI for ${fileName}`, 'ADB');
        await sleep(500);
    }
    if (!node) throw new Error(`${fileName} not found in DocumentsUI`);
    shell(ctx.serial, 'input', 'tap', String(node.centerX), String(node.centerY));
    action(record, `select ${node.text} in DocumentsUI (requested ${fileName})`, 'ADB');
    for (let attempt = 0; attempt < 30; attempt += 1) {
        focus = String(shell(ctx.serial, 'dumpsys', 'window'));
        const currentFocus = focus.match(/mCurrentFocus=.*$/mu)?.[0] || '';
        if (currentFocus.includes(pkg)) return;
        await sleep(300);
    }
    throw new Error(`Did not return from DocumentsUI after selecting ${fileName}`);
}

async function reconnect(ctx, requireReader = true) {
    ctx.client?.close();
    ctx.client = await new WebViewReader(ctx.serial, ctx.cdpPort).connect(requireReader);
    if (requireReader) await ctx.client.evaluate('(async()=>{if(window.rsvpReader?.ready) await window.rsvpReader.ready; return true})()');
}

async function launch(ctx, mode = 'start') {
    if (mode === 'force-stop') shell(ctx.serial, 'am', 'force-stop', pkg);
    const output = shell(ctx.serial, 'am', 'start', '-W', '-n', activity);
    await sleep(1200);
    await reconnect(ctx);
    return String(output);
}

async function importViaSaf(ctx, record, fileName, selector = '#heroImportBtn') {
    if (selector === '#heroImportBtn') await tapSelector(ctx, record, '#homeBtn');
    await tapSelector(ctx, record, selector);
    await selectDocument(ctx, record, fileName);
    await reconnect(ctx);
    const needle = fileName.replace(/\.[^.]+$/u, '').toLowerCase();
    await ctx.client.waitFor(`window.rsvpReader.library.some(b => String(b.name||b.title||'').toLowerCase().includes(${JSON.stringify(needle)})) || !!document.querySelector("#toastContainer .toast.error")`, 8000);
    const result = await ctx.client.evaluate(`(()=>{const b=window.rsvpReader.library.find(b=>String(b.name||b.title||'').toLowerCase().includes(${JSON.stringify(needle)}));return {name:b?.name||b?.title,wordCount:b?.wordCount,libraryCount:window.rsvpReader.library.length,error:document.querySelector("#toastContainer .toast.error")?.textContent||""}})()`);
    if (!result.name) throw new Error(`SAF import ${fileName} failed: ${result.error || 'book not persisted'}`);
    state(record, `SAF imported ${fileName}`, result);
    return result;
}
async function openDemo(ctx, record) {
    await tapSelector(ctx, record, '#homeBtn');
    await tapSelector(ctx, record, '#tryDemoBtn');
    await ctx.client.waitFor('window.rsvpReader.mode==="rsvp" || document.getElementById("actionDialog")?.classList.contains("active")');
    if (await ctx.client.evaluate('document.getElementById("actionDialog")?.classList.contains("active")')) {
        await tapSelector(ctx, record, '#actionDialogConfirmBtn');
    }
    await ctx.client.waitFor('window.rsvpReader.mode==="rsvp"');
    if (!(await ctx.client.evaluate('document.getElementById("demoCoach")?.hidden ?? true'))) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            await tapSelector(ctx, record, '#demoCoachSkipBtn');
            if (await ctx.client.evaluate('document.getElementById("demoCoach")?.hidden === true')) break;
        }
        if (!(await ctx.client.evaluate('document.getElementById("demoCoach")?.hidden === true'))) {
            throw new Error('Visible Skip guide button did not dismiss demo coach after three ADB taps');
        }
    }
    if (!(await ctx.client.evaluate('window.rsvpReader.isPlaying'))) {
        await tapSelector(ctx, record, '#playPauseBtn');
    }
    await ctx.client.waitFor('window.rsvpReader.mode==="rsvp" && window.rsvpReader.isPlaying');
}


async function runScenario(ctx, id, name, body) {
    if (onlyScenarioIds.size > 0 && !onlyScenarioIds.has(id)) return;
    const record = recordTemplate(id, name, ctx);
    const started = Date.now();
    writeFileSync(join(root, record.rawLogPath), `${record.startTime} START ${id} ${name}\n`);
    try {
        await body(record);
        record.status = 'PASS'; record.exitCode = 0; delete record.reason;
        console.log(`[PASS] ${id} ${name}`);
    } catch (error) {
        record.status = 'FAIL'; record.exitCode = 1; record.reason = error.message;
        appendLog(record, `ERROR ${error.stack || error.message}`);
        throw Object.assign(error, { record });
    } finally {
        record.endTime = new Date().toISOString(); record.durationMs = Date.now() - started;
        ctx.records.push(record);
    }
    return record;
}

function pushToDownloads(serial, localPath, fileName) {
    const extension = fileName.split('.').at(-1).toLowerCase();
    // Real Android document providers frequently classify .fb2 as a generic
    // binary. Keep the fixture generic so the native picker regression proves
    // file visibility instead of relying on a friendly XML MIME registration.
    const mimeTypes = { txt: 'text/plain', md: 'text/markdown', html: 'text/html', rtf: 'application/rtf', fb2: 'application/octet-stream', epub: 'application/epub+zip', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', json: 'application/json' };
    const mimeType = mimeTypes[extension] || 'application/octet-stream';
    shell(serial, 'content', 'insert',
        '--uri', 'content://media/external/file',
        '--bind', `_display_name:s:${fileName}`,
        '--bind', `mime_type:s:${mimeType}`,
        '--bind', 'relative_path:s:Download/');
    const rows = String(shell(serial, 'content', 'query',
        '--uri', 'content://media/external/file',
        '--projection', '_id:_display_name'));
    const row = rows.split('\n').reverse().find((line) => line.includes(`_display_name=${fileName}`));
    const id = row?.match(/_id=(\d+)/u)?.[1];
    if (!id) throw new Error(`MediaStore query failed for ${fileName}: ${rows}`);
    const uri = `content://media/external_primary/file/${id}`;
    checked(adbBin(), ['-s', serial, 'shell', 'content', 'write', '--uri', uri], { input: readFileSync(localPath), encoding: null });
    return { uri };
}

async function prepareFixtures(ctx) {
    const fixtures = await generateSyntheticFixtures();
    const localDir = join(ctx.runtimeDir, 'fixtures');
    let storageReady = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
        try { shell(ctx.serial, 'test', '-d', '/sdcard/Download'); storageReady = true; break; } catch {}
        await sleep(500);
    }
    if (!storageReady) throw new Error(`MediaStore Download volume did not become ready on ${ctx.serial}`);
    mkdirSync(localDir, { recursive: true });
    ctx.fixtureFiles = [];
    for (const fixture of Object.values(fixtures)) {
        const local = join(localDir, fixture.name);
        writeFileSync(local, fixture.base64 ? Buffer.from(fixture.base64, 'base64') : fixture.content);
        pushToDownloads(ctx.serial, local, fixture.name);
        ctx.fixtureFiles.push({ ...fixture, local, byteSize: readFileSync(local).length, sha256: sha256(local) });
    }
}

async function phoneSuite(base) {
    const ctx = { ...base, serial: 'emulator-5556', profile: 'test_avd_api36', cdpPort: 9222, records: base.records };
    await startAvd(ctx.profile, ctx.serial, 5556);
    ctx.geometry = parseGeometry(ctx.serial);
    await prepareFixtures(ctx);

    await runScenario(ctx, 'VAL-R5-EMU-011', 'Phone distinct-version upgrade preservation', async (record) => {
        try { adb(ctx.serial, 'uninstall', pkg); } catch {}
        const r4 = process.env.R4_APK_PATH || '/srv/hummingread/artifacts/android-r4/HummingRead-R4-debug.apk';
        if (!existsSync(r4)) throw new Error(`R4 upgrade APK missing: ${r4}`);
        action(record, 'install R4 versionCode 200', 'ADB', adb(ctx.serial, 'install', r4));
        action(record, 'launch R4', 'ADB', await launch(ctx));
        await tapSelector(ctx, record, '#textInput');
        const upgradeText = 'R4 preservation test book with enough words to verify a genuine database upgrade on Android';
        // Android's `input text` can silently truncate longer payloads on a freshly
        // booted emulator. Send two bounded key-injection operations and prove the
        // composer received the exact text before saving the R4 database fixture.
        shell(ctx.serial, 'input', 'text', 'R4%spreservation%stest%sbook%swith%s');
        await sleep(150);
        shell(ctx.serial, 'input', 'text', 'enough%swords%sto%sverify%sa%sgenuine%sdatabase%supgrade%son%sAndroid');
        action(record, 'type R4 book text into composer', 'ADB');
        await ctx.client.waitFor(`document.querySelector('#textInput').value.split(/\\s+/u).filter(Boolean).length >= 10`);
        const typedUpgradeText = await ctx.client.evaluate(`document.querySelector('#textInput').value`);
        if (typedUpgradeText !== upgradeText) throw new Error(`R4 composer text mismatch: ${JSON.stringify(typedUpgradeText)}`);
        shell(ctx.serial, 'input', 'keyevent', '4'); action(record, 'dismiss Android keyboard after text', 'ADB');
        await sleep(400);
        await tapSelector(ctx, record, '#addToLibraryBtn');
        await ctx.client.waitFor('Boolean(window.rsvpReader.currentBookId) && window.rsvpReader.library.some(b=>b.id===window.rsvpReader.currentBookId)');
        const before = await ctx.client.evaluate(`(()=>{const id=window.rsvpReader.currentBookId;const book=window.rsvpReader.library.find(b=>b.id===id);return {version:'R4-200',id:book.id,name:book.name,wordCount:book.wordCount};})()`);
        if (!before.id || !before.name || before.wordCount < 10) {
            throw new Error(`R4 saved-book state is incomplete: ${JSON.stringify(before)}`);
        }
        state(record, 'before upgrade', before);
        action(record, 'install R5 versionCode 201 with -r', 'ADB', adb(ctx.serial, 'install', '-r', base.apkPath));
        action(record, 'launch upgraded R5', 'ADB', await launch(ctx, 'force-stop'));
        const after = await ctx.client.evaluate(`((id)=>{const book=window.rsvpReader.library.find(b=>b.id===id);return {count:window.rsvpReader.library.length,book:book?{id:book.id,name:book.name,wordCount:book.wordCount}:null};})(${JSON.stringify(before.id)})`);
        if (!after.book || after.book.id !== before.id || after.book.name !== before.name || after.book.wordCount !== before.wordCount) {
            throw new Error(`R4 book changed or missing after R5 upgrade: ${JSON.stringify({ before, after })}`);
        }
        const packageDump = String(shell(ctx.serial, 'dumpsys', 'package', pkg));
        if (!packageDump.includes('versionCode=201')) throw new Error('Installed package is not versionCode 201');
        state(record, 'after upgrade', after);
        await capture(ctx, record, 'upgrade-preserved');
    });

    await runScenario(ctx, 'VAL-R5-EMU-001', 'Phone install and first/cold/warm launch', async (record) => {
        adb(ctx.serial, 'logcat', '-b', 'crash', '-c'); action(record, 'clear crash buffer before launch', 'ADB');
        const cold = await launch(ctx, 'force-stop'); action(record, 'cold launch R5', 'ADB', cold);
        const pid = String(shell(ctx.serial, 'pidof', pkg)).trim(); if (!/^\d+$/u.test(pid)) throw new Error('R5 PID missing after cold launch');
        shell(ctx.serial, 'input', 'keyevent', '3'); action(record, 'send HOME for warm launch', 'ADB');
        const warm = await launch(ctx); action(record, 'warm launch R5', 'ADB', warm);
        const crashes = String(adb(ctx.serial, 'logcat', '-d', '-b', 'crash', '-t', '200'));
        const appCrash = crashes.includes(`PID: ${pid}`) || /Process:\s*team\.ibet\.paceflow|ANR in team\.ibet\.paceflow/iu.test(crashes);
        if (appCrash) throw new Error(`HummingRead crash/ANR detected: ${crashes}`);
        state(record, 'launch metrics', { cold, warm, pid });
        await capture(ctx, record, 'cold-warm-launch');
    });

    await runScenario(ctx, 'VAL-R5-EMU-002', 'Phone EN/RU/ES UI and offline legal pages', async (record) => {
        await tapSelector(ctx, record, '#settingsBtn');
        for (const locale of ['en', 'ru', 'es']) {
            await tapSelector(ctx, record, `#language${locale[0].toUpperCase()}${locale.slice(1)}Btn`);
            const lang = await ctx.client.evaluate('document.documentElement.lang');
            if (lang !== locale) throw new Error(`Visible locale tap did not set ${locale}: ${lang}`);
            state(record, `locale ${locale}`, lang);
        }
        await capture(ctx, record, 'spanish-settings');
        await tapSelector(ctx, record, 'a.settings-link[data-i18n="privacyPolicy"]');
        await sleep(1000);
        await reconnect(ctx, false);
        await ctx.client.waitFor('location.pathname.endsWith("privacy.html")');
        const legal = await ctx.client.evaluate('({lang:document.documentElement.lang,title:document.title,offline:!document.querySelector("script[src^=http]")})');
        if (legal.lang !== 'es' || !legal.offline) throw new Error(`Spanish privacy page invalid: ${JSON.stringify(legal)}`);
        state(record, 'Spanish privacy page', legal);
        shell(ctx.serial, 'input', 'keyevent', '4'); action(record, 'system Back from legal page', 'ADB');
        await sleep(700); await reconnect(ctx);
        await tapSelector(ctx, record, '#closeSettingsBtn');
    });

    await runScenario(ctx, 'VAL-R5-EMU-003', 'Phone visible playback, pause, rewind and WPM', async (record) => {
        await openDemo(ctx, record);
        const before = await ctx.client.evaluate('({index:window.rsvpReader.currentIndex,wpm:window.rsvpReader.settings.wpm,playing:window.rsvpReader.isPlaying})');
        await sleep(900);
        await tapSelector(ctx, record, '#playPauseBtn');
        const paused = await ctx.client.evaluate('({index:window.rsvpReader.currentIndex,wpm:window.rsvpReader.settings.wpm,playing:window.rsvpReader.isPlaying})');
        await tapSelector(ctx, record, '#nextWordBtn');
        await tapSelector(ctx, record, '#rewindWordsBtn');
        const after = await ctx.client.evaluate('({index:window.rsvpReader.currentIndex,wpm:window.rsvpReader.settings.wpm,playing:window.rsvpReader.isPlaying})');
        if (paused.playing || after.wpm <= paused.wpm) throw new Error(`Playback controls failed: ${JSON.stringify({ before, paused, after })}`);
        state(record, 'playback visible control results', { before, paused, after });
        await capture(ctx, record, 'paused-controls');
        await tapSelector(ctx, record, '#stopRSVPBtn');
    });

    await runScenario(ctx, 'VAL-R5-EMU-004', 'Phone SAF imports for seven formats', async (record) => {
        for (const fixture of ctx.fixtureFiles) {
            const mediaRows = String(shell(ctx.serial, 'content', 'query', '--uri', 'content://media/external/file', '--projection', '_display_name:_size'));
            const storedRow = mediaRows.split('\n').find((line) => new RegExp(`(?:^|, )_size=${fixture.byteSize}(?:,|$)`, 'u').test(line));
            const pickerName = storedRow?.match(/_display_name=([^,\n]+)/u)?.[1]?.trim();
            if (!pickerName) throw new Error(`Current MediaStore name missing for ${fixture.name}: ${mediaRows}`);
            state(record, `MediaStore name ${fixture.name}`, { requested: fixture.name, pickerName, byteSize: fixture.byteSize });
            await importViaSaf(ctx, record, pickerName);
            state(record, `fixture hash ${fixture.name}`, fixture.sha256);
        }
        await tapSelector(ctx, record, '#heroImportBtn');
        let pickerFocus = '';
        let currentFocus = '';
        for (let attempt = 0; attempt < 20; attempt += 1) {
            pickerFocus = String(shell(ctx.serial, 'dumpsys', 'window'));
            currentFocus = pickerFocus.match(/mCurrentFocus=.*$/mu)?.[0] || '';
            if (/com\.google\.android\.documentsui|DocumentsActivity/iu.test(currentFocus)) break;
            await sleep(300);
        }
        if (!/com\.google\.android\.documentsui|DocumentsActivity/iu.test(currentFocus)) {
            throw new Error(`DocumentsUI did not remain visible for format-picker evidence: ${currentFocus}`);
        }
        state(record, 'DocumentsUI focus after generic-MIME imports', currentFocus);
        await capture(ctx, record, 'documentsui-seven-formats');
        shell(ctx.serial, 'input', 'keyevent', '4'); action(record, 'Back from DocumentsUI after evidence capture', 'ADB');
        await sleep(400); await reconnect(ctx);
    });

    await runScenario(ctx, 'VAL-R5-EMU-005', 'Phone Sharesheet export and picker re-import', async (record) => {
        await tapSelector(ctx, record, '#settingsBtn');
        await tapSelector(ctx, record, '#settingsExportBtn');
        await sleep(1000);
        const focus = String(shell(ctx.serial, 'dumpsys', 'window'));
        if (!/ChooserActivity|ResolverActivity|intentresolver/iu.test(focus)) throw new Error('Native sharesheet did not open');
        state(record, 'sharesheet focus', focus.match(/mCurrentFocus=.*$/mu)?.[0]);
        const files = String(shell(ctx.serial, 'run-as', pkg, 'find', 'cache/backups', '-type', 'f'));
        const backup = files.trim().split('\n').filter(Boolean).at(-1); if (!backup) throw new Error('Exported backup missing from private cache');
        const bytes = checked(adbBin(), ['-s', ctx.serial, 'exec-out', 'run-as', pkg, 'cat', backup], { encoding: null });
        const localBackup = join(ctx.runtimeDir, 'fixtures', 'exported-backup.json'); writeFileSync(localBackup, bytes);
        const exportedHash = sha256(localBackup); pushToDownloads(ctx.serial, localBackup, 'exported-backup.json');
        await capture(ctx, record, 'native-sharesheet');
        shell(ctx.serial, 'input', 'keyevent', '4'); action(record, 'Back closes sharesheet', 'ADB'); await sleep(500); await reconnect(ctx);
        shell(ctx.serial, 'input', 'keyevent', '4'); action(record, 'Back closes settings', 'ADB'); await sleep(300);
        await tapSelector(ctx, record, '#libraryBtn');
        await tapSelector(ctx, record, '#importLibraryBtn');
        await selectDocument(ctx, record, 'exported-backup.json'); await reconnect(ctx);
        state(record, 'exported and re-imported byte hash', exportedHash);
    });

    await runScenario(ctx, 'VAL-R5-EMU-006', 'Phone system Back hierarchy', async (record) => {
        await tapSelector(ctx, record, '#settingsBtn');
        shell(ctx.serial, 'input', 'keyevent', '4'); action(record, 'Back closes settings modal', 'ADB'); await sleep(300);
        if (await ctx.client.evaluate('!!window.rsvpReader.activeModal')) throw new Error('Back did not close settings');
        await openDemo(ctx, record);
        shell(ctx.serial, 'input', 'keyevent', '4'); action(record, 'Back pauses RSVP', 'ADB'); await sleep(300);
        const paused = await ctx.client.evaluate('!window.rsvpReader.isPlaying'); if (!paused) throw new Error('Back did not pause RSVP');
        shell(ctx.serial, 'input', 'keyevent', '4'); action(record, 'Back exits reader', 'ADB'); await sleep(500);
        const mode = await ctx.client.evaluate('window.rsvpReader.mode'); if (!['input','library','normal'].includes(mode)) throw new Error(`Unexpected mode after Back: ${mode}`);
        state(record, 'Back hierarchy final mode', mode); await capture(ctx, record, 'back-hierarchy');
    });

    await runScenario(ctx, 'VAL-R5-EMU-007', 'Phone Delete All cancel and confirm', async (record) => {
        const before = await ctx.client.evaluate('window.rsvpReader.library.length'); if (!before) throw new Error('Library empty before Delete All');
        await tapSelector(ctx, record, '#settingsBtn'); await tapSelector(ctx, record, '#deleteAllDataBtn');
        await ctx.client.waitFor('document.getElementById("actionDialog")?.classList.contains("active")'); await capture(ctx, record, 'delete-confirmation');
        await tapSelector(ctx, record, '#actionDialogCancelBtn');
        const afterCancel = await ctx.client.evaluate('window.rsvpReader.library.length'); if (afterCancel !== before) throw new Error('Cancel changed library');
        await tapSelector(ctx, record, '#deleteAllDataBtn'); await tapSelector(ctx, record, '#actionDialogConfirmBtn'); await sleep(1200);
        await reconnect(ctx);
        await ctx.client.waitFor('!!window.rsvpReader');
        const afterConfirm = await ctx.client.evaluate('window.rsvpReader.library.length'); if (afterConfirm !== 0) throw new Error(`Delete All left ${afterConfirm} books`);
        state(record, 'Delete All counts', { before, afterCancel, afterConfirm });
        if (await ctx.client.evaluate('document.getElementById("settingsModal")?.classList.contains("active")')) {
            await tapSelector(ctx, record, '#closeSettingsBtn');
        }
    });

    await runScenario(ctx, 'VAL-R5-EMU-008', 'Phone airplane-mode offline playback', async (record) => {
        await openDemo(ctx, record);
        shell(ctx.serial, 'cmd', 'connectivity', 'airplane-mode', 'enable'); action(record, 'enable airplane mode', 'ADB');
        try {
            const radio = String(shell(ctx.serial, 'settings', 'get', 'global', 'airplane_mode_on')).trim(); if (radio !== '1') throw new Error(`airplane_mode_on=${radio}`);
            const before = await ctx.client.evaluate('window.rsvpReader.currentIndex'); await sleep(1300);
            const after = await ctx.client.evaluate('window.rsvpReader.currentIndex'); if (after <= before) throw new Error(`Offline playback did not advance ${before}->${after}`);
            state(record, 'offline advance', { before, after, airplaneMode: radio }); await capture(ctx, record, 'airplane-playback');
        } finally {
            shell(ctx.serial, 'cmd', 'connectivity', 'airplane-mode', 'disable'); action(record, 'restore airplane mode', 'ADB');
        }
        await tapSelector(ctx, record, '#playPauseBtn'); await tapSelector(ctx, record, '#stopRSVPBtn');
    });

    await runScenario(ctx, 'VAL-R5-EMU-009', 'Phone portrait/landscape state survival', async (record) => {
        await openDemo(ctx, record); await tapSelector(ctx, record, '#playPauseBtn');
        await tapSelector(ctx, record, '#nextWordBtn'); const before = await ctx.client.evaluate('({index:window.rsvpReader.currentIndex,wpm:window.rsvpReader.settings.wpm})');
        shell(ctx.serial, 'settings', 'put', 'system', 'accelerometer_rotation', '0'); shell(ctx.serial, 'settings', 'put', 'system', 'user_rotation', '1'); action(record, 'rotate phone landscape', 'ADB'); await sleep(900);
        const landscape = await ctx.client.evaluate('({index:window.rsvpReader.currentIndex,wpm:window.rsvpReader.settings.wpm,orientation:screen.orientation.type})');
        if (landscape.wpm !== before.wpm) throw new Error('WPM changed on phone rotation'); await capture(ctx, record, 'landscape-state');
        shell(ctx.serial, 'settings', 'put', 'system', 'user_rotation', '0'); action(record, 'rotate phone portrait', 'ADB'); await sleep(700);
        await tapSelector(ctx, record, '#stopRSVPBtn'); state(record, 'phone rotation states', { before, landscape });
    });

    await runScenario(ctx, 'VAL-R5-EMU-010', 'Phone exact process-death restoration', async (record) => {
        await tapSelector(ctx, record, '#homeBtn');
        await tapSelector(ctx, record, '#addToLibraryBtn');
        await ctx.client.waitFor('!!window.rsvpReader.currentBookId && window.rsvpReader.library.some((book)=>book.id===window.rsvpReader.currentBookId)');
        await tapSelector(ctx, record, '#libraryBtn');
        await ctx.client.waitFor('!!document.querySelector(".library-item .book-actions .book-btn")');
        await tapSelector(ctx, record, '.library-item .book-actions .book-btn');
        await ctx.client.waitFor('window.rsvpReader.mode==="normal" && !!window.rsvpReader.currentBookId');
        await tapSelector(ctx, record, '#startRSVPBtn');
        await tapSelector(ctx, record, '#playPauseBtn');
        await ctx.client.waitFor('window.rsvpReader.isPlaying');
        await sleep(900); await tapSelector(ctx, record, '#playPauseBtn');
        await ctx.client.waitFor('!window.rsvpReader.isPlaying');
        await tapSelector(ctx, record, '#nextWordBtn');
        await sleep(500);
        const before = await ctx.client.evaluate('({bookId:window.rsvpReader.currentBookId,index:window.rsvpReader.currentIndex,wpm:window.rsvpReader.settings.wpm,name:window.rsvpReader.currentBookName})');
        if (!before.bookId || before.index < 1 || !before.name) {
            throw new Error(`State was not durable before process death: ${JSON.stringify(before)}`);
        }
        shell(ctx.serial, 'input', 'keyevent', '3'); action(record, 'HOME backgrounds app', 'ADB'); await sleep(800);
        shell(ctx.serial, 'am', 'force-stop', pkg); action(record, 'force-stop app process', 'ADB');
        let pid = '';
        try { pid = String(shell(ctx.serial, 'pidof', pkg)).trim(); } catch {}
        if (pid) throw new Error(`PID survived force-stop: ${pid}`);
        action(record, 'relaunch after process death', 'ADB', await launch(ctx)); await sleep(1200);
        const restored = await ctx.client.evaluate('(async()=>{if(window.rsvpReader.ready)await window.rsvpReader.ready;return {bookId:window.rsvpReader.currentBookId,index:window.rsvpReader.currentIndex,wpm:window.rsvpReader.settings.wpm,name:window.rsvpReader.currentBookName,library:window.rsvpReader.library.length}})()');
        if (restored.bookId !== before.bookId || restored.index !== before.index || restored.wpm !== before.wpm || restored.name !== before.name || restored.library < 1) {
            throw new Error(`Restore mismatch ${JSON.stringify({ before, restored })}`);
        }
        state(record, 'process death restore', { before, restored }); await capture(ctx, record, 'process-restored');
    });

    await runScenario(ctx, 'VAL-R5-EMU-012', 'Phone KeepAwake and haptic observation', async (record) => {
        await openDemo(ctx, record); await sleep(500);
        const power = String(shell(ctx.serial, 'dumpsys', 'power')) + String(shell(ctx.serial, 'dumpsys', 'window'));
        if (!/Wake Locks: size=[1-9]|mStayOn=true|KEEP_SCREEN_ON|mHoldingDisplaySuspendBlocker=true/iu.test(power)) throw new Error('No affirmative keep-awake platform state');
        adb(ctx.serial, 'logcat', '-c');
        const beforeVibrator = String(shell(ctx.serial, 'dumpsys', 'vibrator_manager'));
        await tapSelector(ctx, record, '#nextWordBtn'); await sleep(300);
        const afterVibrator = String(shell(ctx.serial, 'dumpsys', 'vibrator_manager'));
        const hapticLog = String(adb(ctx.serial, 'logcat', '-d', '-v', 'brief')).split('\n')
            .filter((line) => /haptic|vibrat|Haptics/iu.test(line)).slice(-30);
        const nativeCall = hapticLog.some((line) => /To native.*pluginId: Haptics.*methodName: selectionChanged/iu.test(line));
        const nativeCallback = hapticLog.some((line) => /callback:.*pluginId: Haptics.*methodName: selectionChanged/iu.test(line));
        if (beforeVibrator === afterVibrator && !(nativeCall && nativeCallback)) throw new Error('No completed native Haptics call after visible speed tap');
        state(record, 'keep awake excerpt', power.match(/.{0,40}(?:KEEP_SCREEN_ON|mStayOn=true|mHoldingDisplaySuspendBlocker=true).{0,80}/iu)?.[0]);
        state(record, 'vibrator observation', { serviceChanged: beforeVibrator !== afterVibrator, logcat: hapticLog });
        await capture(ctx, record, 'keepawake-haptic');
        await tapSelector(ctx, record, '#playPauseBtn'); await tapSelector(ctx, record, '#stopRSVPBtn');
    });

    ctx.client.close(); stopAvd(ctx.serial); await sleep(1500);
}

async function tabletSuite(base) {
    const ctx = { ...base, serial: 'emulator-5558', profile: 'test_tablet_api36', cdpPort: 9223, records: base.records };
    await startAvd(ctx.profile, ctx.serial, 5558); ctx.geometry = parseGeometry(ctx.serial); await prepareFixtures(ctx);
    action({ actions: [], rawLogPath: relative(root, join(ctx.logsDir, 'tablet-bootstrap.log')) }, 'tablet bootstrap', 'ADB', adb(ctx.serial, 'install', base.apkPath));
    await launch(ctx, 'force-stop');

    await runScenario(ctx, 'VAL-R5-EMU-013', 'Tablet install and distinct profile launch', async (record) => {
        const avd = String(shell(ctx.serial, 'getprop', 'ro.boot.qemu.avd_name')).trim(); if (avd !== ctx.profile) throw new Error(`Wrong tablet AVD: ${avd}`);
        if (ctx.geometry.width !== 2560 || ctx.geometry.height !== 1600) throw new Error(`Wrong tablet geometry: ${JSON.stringify(ctx.geometry)}`);
        state(record, 'tablet identity', { avd, geometry: ctx.geometry, serial: ctx.serial }); await capture(ctx, record, 'distinct-tablet-launch');
    });

    await runScenario(ctx, 'VAL-R5-EMU-014', 'Tablet localized layouts and dialogs', async (record) => {
        await tapSelector(ctx, record, '#settingsBtn');
        for (const locale of ['en','ru','es']) {
            await tapSelector(ctx, record, `#language${locale[0].toUpperCase()}${locale.slice(1)}Btn`);
            const layout = await ctx.client.evaluate('({lang:document.documentElement.lang,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth})');
            if (layout.lang !== locale || layout.scrollWidth > layout.clientWidth + 1) throw new Error(`Tablet ${locale} layout invalid: ${JSON.stringify(layout)}`);
            state(record, `tablet locale ${locale}`, layout);
        }
        await tapSelector(ctx, record, '#deleteAllDataBtn'); await ctx.client.waitFor('document.getElementById("actionDialog")?.classList.contains("active")');
        await capture(ctx, record, 'spanish-dialog'); await tapSelector(ctx, record, '#actionDialogCancelBtn'); await tapSelector(ctx, record, '#closeSettingsBtn');
    });

    await runScenario(ctx, 'VAL-R5-EMU-015', 'Tablet portrait/landscape state survival', async (record) => {
        await openDemo(ctx, record); await tapSelector(ctx, record, '#playPauseBtn');
        const before = await ctx.client.evaluate('({index:window.rsvpReader.currentIndex,wpm:window.rsvpReader.settings.wpm})');
        shell(ctx.serial, 'cmd', 'window', 'user-rotation', 'lock', '1'); ctx.webBounds = null; action(record, 'lock tablet portrait rotation', 'ADB'); await sleep(2200);
        const portrait = await ctx.client.evaluate('(()=>{const selectors=[".rsvp-container",".rsvp-word-wrapper",".rsvp-pause-context",".rsvp-controls","#playPauseBtn","#rewindWordsBtn",".rsvp-speed-group","#addBookmarkBtn","#stopRSVPBtn",".rsvp-progress","#rsvpBottomTapZone"];return {index:window.rsvpReader.currentIndex,wpm:window.rsvpReader.settings.wpm,orientation:screen.orientation.type,width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,rects:Object.fromEntries(selectors.map(s=>[s,document.querySelector(s)?.getBoundingClientRect().toJSON()]))};})()');
        if (portrait.wpm !== before.wpm || !portrait.orientation.startsWith('portrait') || portrait.width >= portrait.height || portrait.scrollWidth > portrait.width + 1 || Object.values(portrait.rects).filter(Boolean).some((rect)=>rect.left < -1 || rect.right > portrait.width + 1)) throw new Error(`Tablet portrait state invalid: ${JSON.stringify({ before, portrait })}`);
        await capture(ctx, record, 'portrait-state');
        shell(ctx.serial, 'cmd', 'window', 'user-rotation', 'lock', '0'); ctx.webBounds = null; action(record, 'restore tablet landscape rotation', 'ADB'); await sleep(1500);
        const landscape = await ctx.client.evaluate('({index:window.rsvpReader.currentIndex,wpm:window.rsvpReader.settings.wpm,orientation:screen.orientation.type,width:innerWidth,height:innerHeight})');
        if (landscape.wpm !== before.wpm || !landscape.orientation.startsWith('landscape') || landscape.width <= landscape.height) throw new Error(`Tablet landscape restore invalid: ${JSON.stringify({ before, landscape })}`);
        await tapSelector(ctx, record, '#stopRSVPBtn'); state(record, 'tablet rotation states', { before, portrait, landscape });
    });

    await runScenario(ctx, 'VAL-R5-EMU-016', 'Tablet SAF import and system Back', async (record) => {
        await tapSelector(ctx, record, '#homeBtn');
        await tapSelector(ctx, record, '#heroImportBtn'); await sleep(700); await capture(ctx, record, 'tablet-documentsui');
        await selectDocument(ctx, record, 'sample.txt'); await reconnect(ctx);
        await ctx.client.waitFor('window.rsvpReader.library.some(b=>/sample/i.test(b.name||b.title||""))');
        shell(ctx.serial, 'input', 'keyevent', '4'); action(record, 'tablet system Back', 'ADB'); await sleep(500);
        state(record, 'tablet SAF library count', await ctx.client.evaluate('window.rsvpReader.library.length'));
    });

    ctx.client.close(); stopAvd(ctx.serial);
}

export async function runAndroidQa() {
    const toolchain = checkToolchain({ validationClone: process.env.VALIDATION_CLONE === '1' });
    if (!toolchain.success) throw new Error(`Toolchain failed: ${toolchain.errors.join('; ')}`);
    Object.assign(process.env, toolchain.env, { ADB_BIN: toolchain.status.adb.path, EMULATOR_BIN: toolchain.status.emulator.path });
    if (!existsSync(buildSummaryPath)) throw new Error('R5 build-summary.json missing; run deterministic package step first');
    const build = JSON.parse(readFileSync(buildSummaryPath, 'utf8'));
    const sourceSha = build.testedSourceSha;
    const branch = 'mission/android-r5-recovery-20260814';
    const actualRemoteSha = remoteSha(branch);
    if (!devMode && (gitValue(['rev-parse', 'HEAD']) !== sourceSha || actualRemoteSha !== sourceSha || gitValue(['status', '--porcelain']))) {
        throw new Error('Runtime QA requires a clean exact remote tested source SHA');
    }
    const apkPath = join(root, build.apkPath);
    if (!existsSync(apkPath) || sha256(apkPath) !== build.apkSha256) throw new Error('Fresh R5 APK/hash mismatch');
    const runtimeDir = join(artifactsDir, 'runtime', sourceSha);
    const evidenceDir = join(runtimeDir, 'evidence');
    const logsDir = join(runtimeDir, 'logs');
    rmSync(runtimeDir, { recursive: true, force: true });
    mkdirSync(logsDir, { recursive: true }); mkdirSync(evidenceDir, { recursive: true });
    const base = { sourceSha, remoteSha: actualRemoteSha, apkPath, apkSha256: build.apkSha256, runtimeDir, evidenceDir, logsDir, records: [] };
    const started = new Date();
    try {
        const selected = [...onlyScenarioIds];
        if (onlyScenarioIds.size === 0 || selected.some((id) => !/^VAL-R5-EMU-01[3-6]$/u.test(id))) await phoneSuite(base);
        if (onlyScenarioIds.size === 0 || selected.some((id) => /^VAL-R5-EMU-01[3-6]$/u.test(id))) await tabletSuite(base);
    } catch (error) {
        console.error(`[FAIL] ${error.stack || error.message}`);
    } finally {
        try { stopAvd('emulator-5556'); } catch {}
        try { stopAvd('emulator-5558'); } catch {}
    }
    const counts = base.records.reduce((acc, item) => { acc[item.status.toLowerCase()] += 1; return acc; }, { pass: 0, fail: 0, blocked: 0, skipped: 16 - base.records.length });
    const status = counts.pass === 16 ? 'PASSED' : 'NOT_READY';
    const summary = {
        schemaVersion: 3, timestamp: new Date().toISOString(), startTime: started.toISOString(), endTime: new Date().toISOString(),
        durationMs: Date.now() - started.getTime(), testedSourceSha: sourceSha, remoteSourceSha: actualRemoteSha,
        apkPath: build.apkPath, apkSha256: build.apkSha256, evidenceDir: relative(root, evidenceDir), overallStatus: status,
        counts, profiles: [
            { name: 'test_avd_api36', class: 'phone', expectedWidth: 1080, expectedHeight: 2400, density: 420 },
            { name: 'test_tablet_api36', class: 'tablet', expectedWidth: 2560, expectedHeight: 1600, density: 320 }
        ], records: base.records, assertions: Object.fromEntries(base.records.map((item) => [item.id, item.status === 'PASS' ? 'PASSED' : item.status]))
    };
    writeFileSync(join(artifactsDir, 'qa-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`[${status === 'PASSED' ? 'PASS' : 'BLOCKED'}] Android R5 UI QA: ${counts.pass} PASS, ${counts.fail} FAIL, ${counts.skipped} SKIPPED`);
    if (status !== 'PASSED') process.exitCode = 2;
    return summary;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    runAndroidQa().catch((error) => { console.error(error); process.exit(1); });
}
