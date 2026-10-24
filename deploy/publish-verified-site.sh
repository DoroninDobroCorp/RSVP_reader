#!/usr/bin/env bash
# Stage only a verified source/web candidate; this does not sign or publish iOS.
set -Eeuo pipefail
if [ "$#" != 1 ]; then echo "Usage: bash deploy/publish-verified-site.sh VALIDATED_CHECKOUT" >&2; exit 1; fi
validated_root="$1"
cd "$validated_root"
candidate_sha="$(git rev-parse HEAD)"
test -z "$(git status --porcelain)"
node --input-type=commonjs -e 'const f=require("fs");const s=JSON.parse(f.readFileSync("artifacts/ios-candidate/summary.json"));if(!s.webChecksPassed||s.sourceSha!==process.argv[1])process.exit(1)' "$candidate_sha"
test -f dist/about/index.html
test -L /srv/hummingread/current
release_root="/srv/hummingread/releases/$candidate_sha"
test ! -e "$release_root"
backup_root="/var/backups/hummingread/ios-launch-$(date -u +%Y%m%dT%H%M%SZ)"
sudo -n install -d -m 700 "$backup_root"
previous_target="$(readlink /srv/hummingread/current)"
printf '%s\n' "$previous_target" | sudo -n tee "$backup_root/current-target.txt" >/dev/null
if [ "$previous_target" = "." ]; then
  previous_runtime="/srv/hummingread/releases/prelaunch-$(date -u +%Y%m%dT%H%M%SZ)"
  sudo -n install -d -m 755 "$previous_runtime"
  sudo -n cp -a /srv/hummingread/dist /srv/hummingread/node_modules "$previous_runtime/"
  sudo -n cp /srv/hummingread/server.js /srv/hummingread/package.json /srv/hummingread/package-lock.json "$previous_runtime/"
  sudo -n chown -R root:root "$previous_runtime"
  sudo -n chmod -R go-w "$previous_runtime"
  previous_target="$previous_runtime"
fi
printf '%s\n' "$previous_target" | sudo -n tee "$backup_root/rollback-target.txt" >/dev/null
sudo -n cp /etc/nginx/sites-available/hummingread-marketing "$backup_root/marketing.conf"
sudo -n cp /etc/nginx/snippets/hummingread-rsvp.conf "$backup_root/rsvp.conf"
sudo -n systemctl cat rsvp-reader.service | sudo -n tee "$backup_root/service.txt" >/dev/null

sudo -n install -d -m 755 "$release_root"
sudo -n cp -a dist "$release_root/dist"
sudo -n cp server.js package.json package-lock.json "$release_root/"
printf '%s\n' "$candidate_sha" | sudo -n tee "$release_root/SOURCE_SHA" >/dev/null
sudo -n cp artifacts/ios-candidate/summary.json "$release_root/validation-summary.json"
sudo -n npm ci --omit=dev --ignore-scripts --prefix "$release_root"
sudo -n chown -R root:root "$release_root"
sudo -n chmod -R go-w "$release_root"

current_changed=0
config_changed=0
rollback() {
  code=$?
  trap - ERR
  if [ "$config_changed" = 1 ]; then
    sudo -n cp "$backup_root/marketing.conf" /etc/nginx/sites-available/hummingread-marketing
    sudo -n cp "$backup_root/rsvp.conf" /etc/nginx/snippets/hummingread-rsvp.conf
  fi
  if [ "$current_changed" = 1 ]; then
    sudo -n ln -s "$previous_target" /srv/hummingread/.current-rollback
    sudo -n mv -Tf /srv/hummingread/.current-rollback /srv/hummingread/current
    sudo -n systemctl restart rsvp-reader.service
  fi
  sudo -n nginx -t && sudo -n systemctl reload nginx
  echo "Deployment failed; restored prior target/configuration. Backup: $backup_root" >&2
  exit "$code"
}
trap rollback ERR
config_changed=1
cat deploy/nginx-marketing.http.conf deploy/nginx-marketing.tls.conf | sudo -n tee /etc/nginx/sites-available/hummingread-marketing >/dev/null
sudo -n python3 - <<'PY'
from pathlib import Path
p=Path('/etc/nginx/snippets/hummingread-rsvp.conf')
s=p.read_text()
marker='location = /rsvp/api/article {\n'
assert marker in s
block=s.split(marker,1)[1].split('\n}',1)[0]
if 'access_log off;' not in block:
    s=s.replace(marker,marker+'    access_log off;\n',1)
p.write_text(s)
PY
sudo -n nginx -t
sudo -n ln -s "$release_root" /srv/hummingread/.current-next
sudo -n mv -Tf /srv/hummingread/.current-next /srv/hummingread/current
current_changed=1
sudo -n systemctl restart rsvp-reader.service
sudo -n systemctl reload nginx
for attempt in 1 2 3 4 5; do
  if curl --fail --silent --show-error http://127.0.0.1:8081/ >/dev/null; then break; fi
  sleep 1
done
probe_root="artifacts/ios-candidate/deploy-probes"
mkdir -p "$probe_root"
curl --fail --silent --show-error --output "$probe_root/en.html" https://hummingread.145.239.82.124.sslip.io/
grep -q 'Your books.' "$probe_root/en.html"
curl --fail --silent --show-error --output "$probe_root/ru.html" https://hummingread.145.239.82.124.sslip.io/ru/
grep -q 'Ваши книги.' "$probe_root/ru.html"
curl --fail --silent --show-error --output "$probe_root/es.html" https://hummingread.145.239.82.124.sslip.io/es/
grep -q 'Tus libros.' "$probe_root/es.html"
curl --fail --silent --show-error --output "$probe_root/support.html" https://145.239.82.124.sslip.io/rsvp/support.html
grep -q 'mailto:vladimir_doronin@icloud.com' "$probe_root/support.html"
test "$(curl --silent --output /dev/null --write-out '%{http_code}' https://145.239.82.124.sslip.io/rsvp/.git/config)" = 404
test "$(curl --silent --output /dev/null --write-out '%{http_code}' https://hummingread.145.239.82.124.sslip.io/package.json)" = 404
trap - ERR
printf 'Published source %s\nRelease %s\nPrevious target %s\nBackup %s\n' "$candidate_sha" "$release_root" "$previous_target" "$backup_root"
