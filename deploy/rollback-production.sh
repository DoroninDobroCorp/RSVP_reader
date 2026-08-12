#!/usr/bin/env bash
set -euo pipefail

fixture_root=${HUMMINGREAD_DEPLOY_FIXTURE_ROOT:-}
if [[ -n ${fixture_root} ]]; then
  case "${fixture_root}" in /tmp/hummingread-rollback-fixture.*) ;; *) echo "Unsafe fixture root." >&2; exit 1;; esac
elif [[ ${EUID} -ne 0 ]]; then
  echo "Production rollback must run as root." >&2
  exit 1
fi
if [[ $# -ne 1 ]]; then
  echo "Usage: sudo $0 /var/backups/hummingread/YYYYMMDDTHHMMSSZ" >&2
  exit 1
fi

backup_root=$1
if [[ -n ${fixture_root} ]]; then
  case "${backup_root}" in "${fixture_root}"/var/backups/hummingread/20??????T??????Z) ;; *) echo "Unsafe fixture backup path." >&2; exit 1;; esac
else
  case "${backup_root}" in /var/backups/hummingread/20??????T??????Z) ;; *) echo "Refusing rollback from an unexpected path." >&2; exit 1;; esac
fi

repo_root="${fixture_root}/srv/RSVP_reader"
runtime_root="${fixture_root}/srv/hummingread"
systemd_unit="${fixture_root}/etc/systemd/system/rsvp-reader.service"
ip_config="${fixture_root}/etc/nginx/conf.d/00-ip-access.conf"
tls_config="${fixture_root}/etc/nginx/sites-enabled/spanish-sslip"
limits_config="${fixture_root}/etc/nginx/conf.d/hummingread-limits.conf"

for required in SHA256SUMS dist.tgz production-commit.txt rsvp-reader.service 00-ip-access.conf spanish-sslip; do
  [[ -f ${backup_root}/${required} ]] || { echo "Missing backup file: ${required}" >&2; exit 1; }
done
(
  cd "${backup_root}"
  sha256sum --check SHA256SUMS
)

stamp=$(date -u +%Y%m%dT%H%M%SZ)
restore_stage=$(mktemp -d "${repo_root}/.rollback-dist.XXXXXX")
trap 'rm -rf "${restore_stage}"' EXIT
tar -C "${restore_stage}" -xzf "${backup_root}/dist.tgz"
[[ -f ${restore_stage}/dist/index.html ]]
mv "${repo_root}/dist" "${repo_root}/dist.failed.${stamp}"
mv "${restore_stage}/dist" "${repo_root}/dist"

install -m 0644 "${backup_root}/rsvp-reader.service" "${systemd_unit}"
install -m 0644 "${backup_root}/00-ip-access.conf" "${ip_config}"
install -m 0644 "${backup_root}/spanish-sslip" "${tls_config}"
if [[ -f ${backup_root}/hummingread-limits.conf ]]; then
  install -m 0644 "${backup_root}/hummingread-limits.conf" "${limits_config}"
elif [[ -f ${limits_config} ]]; then
  unlink "${limits_config}"
fi

if [[ -s ${backup_root}/previous-release-target.txt ]]; then
  previous_target=$(cat "${backup_root}/previous-release-target.txt")
  [[ ${previous_target} == "${runtime_root}"/releases/* ]]
  if mv --help 2>&1 | grep -q -- '-T'; then
    ln -s "${previous_target}" "${runtime_root}/current.rollback"
    mv -Tf "${runtime_root}/current.rollback" "${runtime_root}/current"
  else
    ln -sfn "${previous_target}" "${runtime_root}/current"
  fi
fi

if [[ -f ${backup_root}/sync-store.json && ! -e ${repo_root}/data/sync-store.json ]]; then
  if [[ -n ${fixture_root} ]]; then
    install -d -m 0700 "${repo_root}/data"
    install -m 0600 "${backup_root}/sync-store.json" "${repo_root}/data/sync-store.json"
  else
    install -d -m 0700 -o root -g root "${repo_root}/data"
    install -m 0600 -o root -g root "${backup_root}/sync-store.json" "${repo_root}/data/sync-store.json"
  fi
fi

if [[ -z ${fixture_root} ]]; then
  systemctl daemon-reload
  nginx -t
  systemctl restart rsvp-reader.service
  systemctl reload nginx
fi
echo "Restored the exact rsvp-reader unit, both nginx files, public dist, and retained data from commit $(cat "${backup_root}/production-commit.txt")."
