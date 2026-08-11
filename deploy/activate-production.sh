#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 || $# -ne 2 ]]; then
  echo "Usage: sudo $0 /srv/hummingread/releases/RELEASE_ID /var/backups/hummingread/YYYYMMDDTHHMMSSZ" >&2
  exit 1
fi

release_root=$1
backup_root=$2
case "${release_root}" in /srv/hummingread/releases/*) ;; *) echo "Unexpected release path." >&2; exit 1;; esac
case "${backup_root}" in /var/backups/hummingread/20??????T??????Z) ;; *) echo "Unexpected backup path." >&2; exit 1;; esac

for required in server.js package.json package-lock.json dist/index.html node_modules; do
  [[ -e ${release_root}/${required} ]] || { echo "Incomplete release: ${required}" >&2; exit 1; }
done
for required in rsvp-reader.service 00-ip-access.conf spanish-sslip SHA256SUMS; do
  [[ -f ${backup_root}/${required} ]] || { echo "Incomplete backup: ${required}" >&2; exit 1; }
done

id paceflow >/dev/null 2>&1 || useradd --system --home /nonexistent --shell /usr/sbin/nologin paceflow
chown -R root:paceflow "${release_root}"
chmod -R go-w "${release_root}"
install -d -m 0755 -o root -g root /srv/hummingread

stage=$(mktemp -d /var/tmp/hummingread-config.XXXXXX)
trap 'rm -rf "${stage}"' EXIT
mutation_started=0
rollback_on_error() {
  status=$?
  trap - ERR
  if [[ ${mutation_started} -eq 1 ]]; then
    echo "Activation failed after mutation; restoring the verified backup." >&2
    "${release_root}/deploy/rollback-production.sh" "${backup_root}" || true
  fi
  exit "${status}"
}
trap rollback_on_error ERR
node "${release_root}/deploy/render-nginx-config.mjs" ip-access \
  /etc/nginx/conf.d/00-ip-access.conf \
  "${release_root}/deploy/nginx-rsvp.ip-access.locations.conf" \
  "${stage}/00-ip-access.conf"
node "${release_root}/deploy/render-nginx-config.mjs" tls \
  /etc/nginx/sites-enabled/spanish-sslip \
  "${release_root}/deploy/nginx-rsvp.tls.locations.conf" \
  "${stage}/spanish-sslip"

mutation_started=1
install -m 0644 "${release_root}/deploy/rsvp-reader.service" /etc/systemd/system/rsvp-reader.service
install -m 0644 "${release_root}/deploy/nginx-rsvp.http.conf" /etc/nginx/conf.d/hummingread-limits.conf
install -m 0644 "${stage}/00-ip-access.conf" /etc/nginx/conf.d/00-ip-access.conf
install -m 0644 "${stage}/spanish-sslip" /etc/nginx/sites-enabled/spanish-sslip
nginx -t

ln -s "${release_root}" /srv/hummingread/current.next
mv -Tf /srv/hummingread/current.next /srv/hummingread/current
systemctl daemon-reload
systemctl restart rsvp-reader.service
curl --fail --silent --show-error http://127.0.0.1:8081/ >/dev/null
systemctl reload nginx

legacy_store=/srv/RSVP_reader/data/sync-store.json
if [[ -f ${legacy_store} ]]; then
  install -d -m 0700 -o root -g root /var/lib/hummingread/legacy
  destination="/var/lib/hummingread/legacy/sync-store-$(basename "${backup_root}").json"
  mv "${legacy_store}" "${destination}"
  chmod 0600 "${destination}"
  chown root:root "${destination}"
fi

mutation_started=0
echo "Activated ${release_root}. Production main was not modified; rollback with ${release_root}/deploy/rollback-production.sh ${backup_root}."
