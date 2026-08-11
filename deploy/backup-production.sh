#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run as root so configuration, build, and legacy data backups stay private." >&2
  exit 1
fi

stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_root="/var/backups/hummingread/${stamp}"
install -d -m 0700 "${backup_root}"

git -C /srv/RSVP_reader rev-parse HEAD > "${backup_root}/production-commit.txt"
git -C /srv/RSVP_reader status --short > "${backup_root}/production-status.txt"
tar -C /srv/RSVP_reader -czf "${backup_root}/dist.tgz" dist

install -m 0600 /etc/systemd/system/rsvp-reader.service "${backup_root}/rsvp-reader.service"
install -m 0600 /etc/nginx/conf.d/00-ip-access.conf "${backup_root}/00-ip-access.conf"
install -m 0600 /etc/nginx/sites-enabled/spanish-sslip "${backup_root}/spanish-sslip"
if [[ -f /etc/nginx/conf.d/hummingread-limits.conf ]]; then
  install -m 0600 /etc/nginx/conf.d/hummingread-limits.conf "${backup_root}/hummingread-limits.conf"
fi

if [[ -L /srv/hummingread/current ]]; then
  readlink -f /srv/hummingread/current > "${backup_root}/previous-release-target.txt"
else
  : > "${backup_root}/previous-release-target.txt"
fi

legacy_store=/srv/RSVP_reader/data/sync-store.json
if [[ -f ${legacy_store} ]]; then
  install -m 0600 "${legacy_store}" "${backup_root}/sync-store.json"
  cmp --silent "${legacy_store}" "${backup_root}/sync-store.json"
fi

chmod -R go-rwx "${backup_root}"
(
  cd "${backup_root}"
  find . -maxdepth 1 -type f ! -name SHA256SUMS -printf '%P\0' \
    | sort -z \
    | xargs -0 sha256sum > SHA256SUMS
)
echo "${backup_root}"
