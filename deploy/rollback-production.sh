#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 || $# -ne 1 ]]; then
  echo "Usage: sudo $0 /var/backups/hummingread/YYYYMMDDTHHMMSSZ" >&2
  exit 1
fi

backup_root=$1
case "${backup_root}" in
  /var/backups/hummingread/*) ;;
  *) echo "Refusing rollback from an unexpected path." >&2; exit 1 ;;
esac

[[ -f ${backup_root}/dist.tgz && -f ${backup_root}/commit.txt ]]
sha256sum --check "${backup_root}/SHA256SUMS"

restore_stage=$(mktemp -d /srv/RSVP_reader/.rollback-dist.XXXXXX)
trap 'rm -rf "${restore_stage}"' EXIT
tar -C "${restore_stage}" -xzf "${backup_root}/dist.tgz"
mv /srv/RSVP_reader/dist "/srv/RSVP_reader/dist.failed.$(date -u +%Y%m%dT%H%M%SZ)"
mv "${restore_stage}/dist" /srv/RSVP_reader/dist

if [[ -f ${backup_root}/hummingread.service ]]; then
  install -m 0644 "${backup_root}/hummingread.service" /etc/systemd/system/hummingread.service
fi
if [[ -f ${backup_root}/rsvp.locations.conf ]]; then
  install -m 0644 "${backup_root}/rsvp.locations.conf" /etc/nginx/snippets/rsvp.locations.conf
fi

systemctl daemon-reload
nginx -t
systemctl restart hummingread.service
systemctl reload nginx
curl --fail --silent --show-error https://127.0.0.1/rsvp/ --resolve "$(hostname):443:127.0.0.1" >/dev/null || true
echo "Restored public build backed up from commit $(cat "${backup_root}/commit.txt"). The failed build was preserved beside dist."
