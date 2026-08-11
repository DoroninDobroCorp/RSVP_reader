# HummingRead existing-server deployment runbook

Status: **prepared, not deployed**. The active mission authorizes preparation and verification on the review branch, not overwriting production from an unreviewed branch.

## Owner approval gate

Approve the exact integration commit, final preview/final-domain configuration, maintenance window, and backup destination before applying these commands. Never push into the checked-out production `main` branch.

## Preflight and backup

```sh
git status --short
git rev-parse HEAD
npm ci
npm run release:check
sudo ./deploy/backup-production.sh
```

Record the returned fresh `/var/backups/hummingread/<UTC stamp>` path. The script stores the current commit, public `dist`, nginx/unit files, checksums, and—if present—moves the verified old ignored sync store recoverably into root-owned mode-0600 quarantine. It never deletes that store.

## Install the reviewed release

Create the dedicated account once with a locked shell, then install only reviewed artifacts:

```sh
sudo useradd --system --home /nonexistent --shell /usr/sbin/nologin paceflow || true
sudo install -m 0644 deploy/hummingread.service /etc/systemd/system/hummingread.service
sudo install -m 0644 deploy/nginx-rsvp.locations.conf /etc/nginx/snippets/rsvp.locations.conf
sudo install -m 0644 deploy/nginx-rsvp.http.conf /etc/nginx/conf.d/hummingread-limits.conf
sudo systemctl daemon-reload
sudo nginx -t
sudo systemctl enable --now hummingread.service
sudo systemctl reload nginx
```

The server process must report `127.0.0.1:8081`; public static content must resolve only from `/srv/RSVP_reader/dist/`.

## Positive and negative smoke probes

Use the approved public origin in `origin`:

```sh
origin=https://FINAL_OWNER_DOMAIN/rsvp
curl --fail --silent --show-error "$origin/" >/dev/null
curl --fail --silent --show-error "$origin/privacy.html" >/dev/null
curl --fail --silent --show-error "$origin/support.html" >/dev/null
curl --fail --silent --show-error "$origin/assets/icons/app-icon-192.png" >/dev/null
curl --fail-with-body -X POST -H 'content-type: application/json' --data '{"url":"https://example.com/"}' "$origin/api/article"
test "$(curl -sS -o /dev/null -w '%{http_code}' "$origin/api/article")" = 405
test "$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$origin/api/sync")" = 404
for path in .git/config server.js package.json data/sync-store.json node_modules tests ios/App/App/Info.plist sample.epub; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$origin/$path")
  test "$code" = 404 || test "$code" = 403
done
```

The article probe may receive a truthful extraction error from `example.com`; it must reach only the POST route, include `Cache-Control: no-store`, and produce no article access-log entry.

## Rollback

```sh
sudo ./deploy/rollback-production.sh /var/backups/hummingread/<UTC stamp>
```

Rollback verifies checksums, restores the previous public build and configuration, preserves the failed public build beside `dist`, validates nginx, and restarts the dedicated service. It does not use `git reset --hard` and does not delete the review branch or quarantined data.
