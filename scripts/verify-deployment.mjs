import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const nginx = await readFile(join(root, 'deploy', 'nginx-rsvp.locations.conf'), 'utf8');
const nginxHttp = await readFile(join(root, 'deploy', 'nginx-rsvp.http.conf'), 'utf8');
const unit = await readFile(join(root, 'deploy', 'hummingread.service'), 'utf8');
const backup = await readFile(join(root, 'deploy', 'backup-production.sh'), 'utf8');
const rollback = await readFile(join(root, 'deploy', 'rollback-production.sh'), 'utf8');

for (const token of [
    'if ($request_method != POST) { return 405; }',
    'access_log off;',
    'limit_req zone=hummingread_article_rate',
    'limit_conn hummingread_article_conn',
    'proxy_pass http://127.0.0.1:8081/api/article;',
    'location = /rsvp/api/sync { return 404; }',
    'alias /srv/RSVP_reader/dist/;',
    "object-src 'none'",
    "frame-ancestors 'none'"
]) {
    if (!nginx.includes(token)) throw new Error(`nginx deployment policy is missing: ${token}`);
}
if (/alias\s+\/srv\/RSVP_reader\/\s*;/u.test(nginx)) {
    throw new Error('nginx must never expose the repository root.');
}
for (const token of ['limit_req_zone', 'limit_conn_zone', 'gzip on;', 'gzip_vary on;']) {
    if (!nginxHttp.includes(token)) throw new Error(`nginx HTTP policy is missing: ${token}`);
}

for (const token of [
    'User=paceflow',
    'Environment=HOST=127.0.0.1',
    'ExecStart=/usr/bin/node /srv/RSVP_reader/server.js',
    'NoNewPrivileges=true',
    'ProtectSystem=strict',
    'ReadOnlyPaths=/srv/RSVP_reader'
]) {
    if (!unit.includes(token)) throw new Error(`systemd sandbox is missing: ${token}`);
}
if (unit.includes('/usr/bin/npm')) throw new Error('Production service must run the pinned Node entrypoint directly.');

for (const [name, source] of [['backup', backup], ['rollback', rollback]]) {
    if (!source.includes('set -euo pipefail')) throw new Error(`${name} script must propagate the first failure.`);
    if (/reset\s+--hard/u.test(source)) throw new Error(`${name} script must not use git reset --hard.`);
}
for (const token of ['cmp --silent', 'mode 0600', 'quarantine']) {
    if (token === 'mode 0600') {
        if (!backup.includes('install -m 0600')) throw new Error('Legacy sync backup must be mode 0600.');
    } else if (!backup.includes(token)) throw new Error(`Backup/quarantine flow is missing ${token}.`);
}

console.log('Verified loopback Node service, least-privilege systemd sandbox, POST-only unlogged article proxy, static-root isolation, backup, quarantine, and non-destructive rollback.');
