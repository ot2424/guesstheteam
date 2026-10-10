#!/usr/bin/env bash
set -euo pipefail
cd /root/guesstheteam
if ! getent passwd guesstheteam >/dev/null; then
  useradd --system --user-group --home-dir /opt/guesstheteam --shell /usr/sbin/nologin guesstheteam
fi
install -d -o guesstheteam -g guesstheteam -m 0750 /opt/guesstheteam
# Keep the one central .env and the admin password outside the service checkout.
rsync -a --chown=guesstheteam:guesstheteam \
  --exclude='/.git/' --exclude='/.env*' --exclude='/.admin*.json' \
  --exclude='/problems/' --exclude='/docs/previews/' --exclude='/.agents/' --exclude='/.aws/' --exclude='/.codex/' \
  --exclude='/backup/' --exclude='/dist/' --exclude='/coverage/' \
  --exclude='/data/transfermarkt/' --exclude='/data/cache/' \
  /root/guesstheteam/ /opt/guesstheteam/
install -m 0644 deploy/guesstheteam-api.service /etc/systemd/system/guesstheteam-api.service
systemd-analyze verify /etc/systemd/system/guesstheteam-api.service
systemctl daemon-reload
systemctl enable guesstheteam-api
systemctl restart guesstheteam-api
systemctl is-active guesstheteam-api
