#!/usr/bin/env bash
set -euo pipefail
cd /root/guesstheteam
install -d -m 0700 /var/backups/guesstheteam
for name in guesstheteam-backup.service guesstheteam-backup.timer guesstheteam-monitor.service guesstheteam-monitor.timer; do
  install -m 0644 "deploy/$name" "/etc/systemd/system/$name"
done
systemd-analyze verify /etc/systemd/system/guesstheteam-backup.service /etc/systemd/system/guesstheteam-monitor.service
systemctl daemon-reload
systemctl start guesstheteam-backup.service
systemctl start guesstheteam-monitor.service
systemctl enable --now guesstheteam-backup.timer guesstheteam-monitor.timer
