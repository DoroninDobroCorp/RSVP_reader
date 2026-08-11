#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run as root so the backup and quarantined legacy data remain private." >&2
  exit 1
fi

stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_root="/var/backups/hummingread/${stamp}"
install -d -m 0700 "${backup_root}"

git -C /srv/RSVP_reader rev-parse HEAD > "${backup_root}/commit.txt"
tar -C /srv/RSVP_reader -czf "${backup_root}/dist.tgz" dist

for source in \
  /etc/nginx/sites-enabled/default \
  /etc/nginx/snippets/rsvp.locations.conf \
  /etc/systemd/system/hummingread.service; do
  if [[ -f ${source} ]]; then
    install -m 0600 "${source}" "${backup_root}/$(basename "${source}")"
  fi
done

legacy_store=/srv/RSVP_reader/data/sync-store.json
if [[ -f ${legacy_store} ]]; then
  install -d -m 0700 /var/lib/hummingread/quarantine
  install -m 0600 "${legacy_store}" "${backup_root}/sync-store.json"
  cmp --silent "${legacy_store}" "${backup_root}/sync-store.json"
  mv "${legacy_store}" "/var/lib/hummingread/quarantine/sync-store-${stamp}.json"
  chmod 0600 "/var/lib/hummingread/quarantine/sync-store-${stamp}.json"
  chown root:root "/var/lib/hummingread/quarantine/sync-store-${stamp}.json"
fi

chmod -R go-rwx "${backup_root}"
sha256sum "${backup_root}"/* > "${backup_root}/SHA256SUMS"
echo "${backup_root}"
