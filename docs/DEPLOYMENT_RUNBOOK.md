# HummingRead existing-server deployment runbook

Status: **prepared and fixture-tested, not deployed**. Production remains the checked-out `main` at `/srv/RSVP_reader`; these commands require a separate owner approval and maintenance window.

## Observed production topology (2026-08-11)

- systemd: `/etc/systemd/system/rsvp-reader.service` (currently broad `User=ubuntu`, `npm start`, port `0.0.0.0:8081`);
- restricted/IP server: `/etc/nginx/conf.d/00-ip-access.conf`;
- public TLS server: `/etc/nginx/sites-enabled/spanish-sslip`;
- static build: `/srv/RSVP_reader/dist/`;
- ignored legacy store: `/srv/RSVP_reader/data/sync-store.json` (must be backed up before recoverable quarantine);
- absent and therefore deliberately not used: `hummingread.service`, `/etc/nginx/snippets/rsvp.locations.conf`, and `/etc/nginx/sites-enabled/default`.

The prepared layout installs immutable/versioned releases below `/srv/hummingread/releases/` and atomically changes `/srv/hummingread/current`. It does not merge, pull, or overwrite production `main`.

## Owner approval and release staging

Approve the exact review commit, preview/final-domain configuration, backup location, and maintenance window. From a clean reviewed checkout, build and copy a release without Git metadata or private/generated reports:

```sh
npm ci
npm run release:check
release_id="$(git rev-parse --short=12 HEAD)"
release_root="/srv/hummingread/releases/${release_id}"
test ! -e "$release_root"
sudo install -d -m 0755 -o root -g root "$release_root"
sudo rsync -a --delete \
  --exclude=.git --exclude=data --exclude=node_modules --exclude=dist-native \
  --exclude=playwright-report --exclude=test-results \
  ./ "$release_root/"
sudo npm ci --omit=dev --ignore-scripts --prefix "$release_root"
sudo chown -R root:root "$release_root"
sudo chmod -R go-w "$release_root"
```

The preceding `test ! -e` makes reuse of an existing release fail closed. `--delete` is scoped only to that newly created version directory. Never point it at `/srv/RSVP_reader`, `/srv/hummingread`, or an existing release.

## Fresh exact-topology backup

```sh
sudo "$release_root/deploy/backup-production.sh"
```

Record the returned `/var/backups/hummingread/<UTC stamp>`. It contains checksums, the exact current files:

- `/etc/systemd/system/rsvp-reader.service`;
- `/etc/nginx/conf.d/00-ip-access.conf`;
- `/etc/nginx/sites-enabled/spanish-sslip`;
- `/srv/RSVP_reader/dist`;
- the production commit/status;
- a mode-0600 copy of the legacy store when present.

The backup step copies but does not move the legacy store. Activation moves it only after the new service and nginx reload succeed.

## Atomic activation

```sh
sudo "$release_root/deploy/activate-production.sh" \
  "$release_root" "/var/backups/hummingread/<UTC stamp>"
```

The script creates the locked `paceflow` account if needed, renders only the contiguous RSVP location blocks inside the two observed nginx files, installs the hardened `rsvp-reader.service`, validates nginx before switching traffic, atomically updates `/srv/hummingread/current`, starts Node on `127.0.0.1:8081`, and reloads nginx. It never touches Git refs or production `main`.

## Positive and negative probes

Use the approved public origin:

```sh
origin=https://FINAL_OWNER_DOMAIN/rsvp
curl --fail --silent --show-error "$origin/" >/dev/null
curl --fail --silent --show-error "$origin/privacy.html" >/dev/null
curl --fail --silent --show-error "$origin/support.html" >/dev/null
curl --fail --silent --show-error "$origin/assets/icons/app-icon-192.png" >/dev/null
test "$(curl -sS -o /dev/null -w '%{http_code}' "$origin/api/article")" = 405
test "$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$origin/api/sync")" = 404
curl -sS -D - -o /dev/null -X POST -H 'content-type: application/json' \
  --data '{"url":"https://example.com/"}' "$origin/api/article" | grep -i '^cache-control: no-store'
for path in .git/config server.js package.json data/sync-store.json node_modules tests ios/App/App/Info.plist sample.epub; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$origin/$path")
  test "$code" = 404 || test "$code" = 403
done
systemctl show rsvp-reader.service -p User -p Group -p ExecStart
ss -ltnp | grep '127.0.0.1:8081'
```

Confirm the article request produced no endpoint access-log line and that `/srv/RSVP_reader/data/sync-store.json` was moved, without deletion, to root-only `/var/lib/hummingread/legacy/`.

## Fixture-verified rollback

```sh
sudo "$release_root/deploy/rollback-production.sh" \
  "/var/backups/hummingread/<UTC stamp>"
```

Rollback validates `SHA256SUMS`, restores the exact prior unit and both nginx files, restores the public `dist`, preserves the replaced build as `dist.failed.<stamp>`, restores the prior release symlink when one existed, and restores the backed-up legacy store if activation moved it. It runs `nginx -t` before restart/reload and never uses `git reset --hard`.
