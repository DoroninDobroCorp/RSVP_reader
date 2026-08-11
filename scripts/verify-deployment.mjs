import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, readlink, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderNginxConfig } from '../deploy/render-nginx-config.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const deploy = join(root, 'deploy');
const read = (file) => readFile(join(deploy, file), 'utf8');
const [ipFragment, tlsFragment, nginxHttp, unit, backup, activate, rollback, runbook] = await Promise.all([
    read('nginx-rsvp.ip-access.locations.conf'),
    read('nginx-rsvp.tls.locations.conf'),
    read('nginx-rsvp.http.conf'),
    read('rsvp-reader.service'),
    read('backup-production.sh'),
    read('activate-production.sh'),
    read('rollback-production.sh'),
    readFile(join(root, 'docs', 'DEPLOYMENT_RUNBOOK.md'), 'utf8')
]);

const ipFixture = `events {}\nhttp {\n  server {\n    location = /before { return 200; }\n    location = /rsvp { return 301 /rsvp/; }\n    location = /rsvp/api/sync { return 404; }\n    location /rsvp/ { alias /srv/RSVP_reader/dist/; try_files $uri $uri/ =404; }\n    location /after/ { return 204; }\n  }\n}\n`;
const tlsFixture = `events {}\nhttp {\n  server {\n    location = /rsvp { return 301 /rsvp/; }\n    location = /rsvp/api/sync { return 404; }\n    location = /rsvp/api/article { proxy_pass http://127.0.0.1:8081/api/article; }\n    location /rsvp/ { alias /srv/RSVP_reader/dist/; try_files $uri $uri/ =404; }\n    location /after/ { return 204; }\n  }\n}\n`;
const renderedIp = renderNginxConfig(ipFixture, ipFragment, 'ip-access');
const renderedTls = renderNginxConfig(tlsFixture, tlsFragment, 'tls');
if (!renderedIp.includes('location /after/') || !renderedTls.includes('location /after/')) {
    throw new Error('RSVP renderer changed an unrelated nginx location.');
}
if (renderNginxConfig(renderedTls, tlsFragment, 'tls') !== renderedTls) {
    throw new Error('RSVP renderer is not idempotent after adding managed markers.');
}

for (const token of [
    'if ($request_method != POST) { return 405; }',
    'access_log off;',
    'limit_req zone=hummingread_article_rate',
    'limit_conn hummingread_article_conn',
    'proxy_pass http://127.0.0.1:8081/api/article;',
    'location = /rsvp/api/sync',
    'alias /srv/hummingread/current/dist/;',
    "object-src 'none'",
    "frame-ancestors 'none'"
]) {
    if (!tlsFragment.includes(token)) throw new Error(`TLS nginx policy is missing: ${token}`);
}
if (!ipFragment.includes('location = /rsvp/api/article') || !ipFragment.includes('return 404;')) {
    throw new Error('IP-access server must keep the article endpoint unavailable.');
}
if (/alias\s+\/srv\/RSVP_reader\//u.test(`${ipFragment}\n${tlsFragment}`)) {
    throw new Error('New nginx fragments must not serve from the mutable production checkout.');
}
for (const token of ['limit_req_zone', 'limit_conn_zone']) {
    if (!nginxHttp.includes(token)) throw new Error(`nginx HTTP policy is missing: ${token}`);
}
if (/^\s*gzip(?:_|\s)/mu.test(nginxHttp)) {
    throw new Error('RSVP HTTP fragment must not redeclare server-global gzip policy.');
}

for (const token of [
    'User=paceflow',
    'Environment=HOST=127.0.0.1',
    'ExecStart=/usr/bin/node /srv/hummingread/current/server.js',
    'NoNewPrivileges=true',
    'ProtectSystem=strict',
    'ReadOnlyPaths=/srv/hummingread'
]) {
    if (!unit.includes(token)) throw new Error(`systemd sandbox is missing: ${token}`);
}
if (unit.includes('/usr/bin/npm') || unit.includes('hummingread.service')) {
    throw new Error('The service must replace the real rsvp-reader.service and run Node directly.');
}

for (const [name, source] of [['backup', backup], ['activate', activate], ['rollback', rollback]]) {
    if (!source.includes('set -euo pipefail')) throw new Error(`${name} script must propagate the first failure.`);
    if (/reset\s+--hard/u.test(source)) throw new Error(`${name} script must not rewrite Git history.`);
}
for (const realPath of [
    '/etc/systemd/system/rsvp-reader.service',
    '/etc/nginx/conf.d/00-ip-access.conf',
    '/etc/nginx/sites-enabled/spanish-sslip'
]) {
    if (!backup.includes(realPath) || !runbook.includes(realPath)) {
        throw new Error(`Backup/runbook does not name the observed production file ${realPath}.`);
    }
}
for (const token of [
    '/srv/hummingread/releases/',
    '/srv/hummingread/current',
    'mv -Tf',
    'rsvp-reader.service',
    'nginx -t',
    '/var/lib/hummingread/legacy'
]) {
    if (!activate.includes(token) && !runbook.includes(token)) {
        throw new Error(`Atomic activation/runbook is missing ${token}.`);
    }
}
for (const token of ['health_ready=0', '{1..50}', 'sleep 0.2', 'systemctl is-active --quiet']) {
    if (!activate.includes(token)) throw new Error(`Activation health wait is missing ${token}.`);
}
if (!rollback.includes('sha256sum --check')
    || !rollback.includes('dist.failed.')
    || !rollback.includes('rsvp-reader.service')) {
    throw new Error('Rollback must verify the fixture and preserve the replaced public build.');
}

for (const script of ['backup-production.sh', 'activate-production.sh', 'rollback-production.sh']) {
    execFileSync('bash', ['-n', join(deploy, script)], { stdio: 'inherit' });
}
execFileSync(process.execPath, ['--check', join(deploy, 'render-nginx-config.mjs')], { stdio: 'inherit' });

const rollbackFixture = await mkdtemp('/tmp/hummingread-rollback-fixture.');
try {
    const fixtureRepo = join(rollbackFixture, 'srv', 'RSVP_reader');
    const fixtureRuntime = join(rollbackFixture, 'srv', 'hummingread');
    const fixtureBackup = join(rollbackFixture, 'var', 'backups', 'hummingread', '20260811T220000Z');
    const fixturePaths = [
        join(fixtureRepo, 'dist'),
        join(fixtureRepo, 'data'),
        join(fixtureRuntime, 'releases', 'old'),
        join(fixtureRuntime, 'releases', 'new'),
        join(rollbackFixture, 'etc', 'systemd', 'system'),
        join(rollbackFixture, 'etc', 'nginx', 'conf.d'),
        join(rollbackFixture, 'etc', 'nginx', 'sites-enabled'),
        join(fixtureBackup, 'source', 'dist')
    ];
    await Promise.all(fixturePaths.map((path) => mkdir(path, { recursive: true })));
    await Promise.all([
        writeFile(join(fixtureRepo, 'dist', 'index.html'), 'FAILED_NEW_DIST'),
        writeFile(join(fixtureBackup, 'source', 'dist', 'index.html'), 'KNOWN_OLD_DIST'),
        writeFile(join(fixtureBackup, 'rsvp-reader.service'), 'OLD_UNIT'),
        writeFile(join(fixtureBackup, '00-ip-access.conf'), 'OLD_IP_CONFIG'),
        writeFile(join(fixtureBackup, 'spanish-sslip'), 'OLD_TLS_CONFIG'),
        writeFile(join(fixtureBackup, 'production-commit.txt'), '29b65d7\n'),
        writeFile(join(fixtureBackup, 'previous-release-target.txt'), `${join(fixtureRuntime, 'releases', 'old')}\n`),
        writeFile(join(fixtureBackup, 'sync-store.json'), 'LEGACY_PRIVATE_STATE'),
        writeFile(join(rollbackFixture, 'etc', 'systemd', 'system', 'rsvp-reader.service'), 'NEW_UNIT'),
        writeFile(join(rollbackFixture, 'etc', 'nginx', 'conf.d', '00-ip-access.conf'), 'NEW_IP_CONFIG'),
        writeFile(join(rollbackFixture, 'etc', 'nginx', 'conf.d', 'hummingread-limits.conf'), 'NEW_LIMITS'),
        writeFile(join(rollbackFixture, 'etc', 'nginx', 'sites-enabled', 'spanish-sslip'), 'NEW_TLS_CONFIG')
    ]);
    execFileSync('tar', ['-C', join(fixtureBackup, 'source'), '-czf', join(fixtureBackup, 'dist.tgz'), 'dist']);
    await rm(join(fixtureBackup, 'source'), { recursive: true, force: true });
    await writeFile(join(fixtureRuntime, 'current.placeholder'), '');
    execFileSync('ln', ['-s', join(fixtureRuntime, 'releases', 'new'), join(fixtureRuntime, 'current')]);

    const checksumFiles = (await readdir(fixtureBackup)).filter((name) => name !== 'SHA256SUMS').sort();
    const checksumLines = [];
    for (const file of checksumFiles) {
        const hash = createHash('sha256').update(await readFile(join(fixtureBackup, file))).digest('hex');
        checksumLines.push(`${hash}  ${file}`);
    }
    await writeFile(join(fixtureBackup, 'SHA256SUMS'), `${checksumLines.join('\n')}\n`);
    execFileSync('bash', [join(deploy, 'rollback-production.sh'), fixtureBackup], {
        env: { ...process.env, HUMMINGREAD_DEPLOY_FIXTURE_ROOT: rollbackFixture },
        stdio: 'inherit'
    });

    const failedBuilds = (await readdir(fixtureRepo)).filter((name) => name.startsWith('dist.failed.'));
    if (await readFile(join(fixtureRepo, 'dist', 'index.html'), 'utf8') !== 'KNOWN_OLD_DIST'
        || failedBuilds.length !== 1
        || await readFile(join(fixtureRepo, failedBuilds[0], 'index.html'), 'utf8') !== 'FAILED_NEW_DIST'
        || await readFile(join(rollbackFixture, 'etc', 'systemd', 'system', 'rsvp-reader.service'), 'utf8') !== 'OLD_UNIT'
        || await readFile(join(rollbackFixture, 'etc', 'nginx', 'conf.d', '00-ip-access.conf'), 'utf8') !== 'OLD_IP_CONFIG'
        || await readFile(join(rollbackFixture, 'etc', 'nginx', 'sites-enabled', 'spanish-sslip'), 'utf8') !== 'OLD_TLS_CONFIG'
        || await readFile(join(fixtureRepo, 'data', 'sync-store.json'), 'utf8') !== 'LEGACY_PRIVATE_STATE'
        || await readlink(join(fixtureRuntime, 'current')) !== join(fixtureRuntime, 'releases', 'old')) {
        throw new Error('Executed rollback fixture did not restore the exact previous state.');
    }
    try {
        await readFile(join(rollbackFixture, 'etc', 'nginx', 'conf.d', 'hummingread-limits.conf'));
        throw new Error('Rollback fixture retained a limits file that did not exist in the backup.');
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
} finally {
    await rm(rollbackFixture, { recursive: true, force: true });
}

let nginxValidated = false;
try {
    execFileSync('nginx', ['-v'], { stdio: 'ignore' });
    const scratch = await mkdtemp(join(tmpdir(), 'hummingread-nginx-'));
    try {
        const config = `pid ${scratch}/nginx.pid;\nerror_log ${scratch}/error.log;\nevents {}\nhttp {\naccess_log ${scratch}/access.log;\ngzip on;\n${nginxHttp}\nserver { listen 127.0.0.1:18080;\n${ipFragment}\n}\nserver { listen 127.0.0.1:18081;\n${tlsFragment}\n}\n}\n`;
        const configPath = join(scratch, 'nginx.conf');
        await writeFile(configPath, config);
        execFileSync('nginx', ['-t', '-c', configPath, '-p', `${scratch}/`], { stdio: 'inherit' });
        nginxValidated = true;
    } finally {
        await rm(scratch, { recursive: true, force: true });
    }
} catch (error) {
    if (error.code !== 'ENOENT') throw error;
}

console.log(`Verified actual rsvp-reader topology, atomic versioned activation, exact-file backup/rollback, and nginx fragments${nginxValidated ? ' with nginx -t' : ' (nginx binary unavailable)'}.`);
