#!/usr/bin/env bash
set -euo pipefail
cd /root/guesstheteam
install -d -m 0755 /var/www/letsencrypt
if [ ! -e /etc/letsencrypt/live/api.guesstheteam.de/fullchain.pem ]; then
  install -m 0644 deploy/nginx-api.conf /etc/nginx/sites-available/guesstheteam-api
  if [ ! -L /etc/nginx/sites-enabled/guesstheteam-api ]; then
    ln -s /etc/nginx/sites-available/guesstheteam-api /etc/nginx/sites-enabled/guesstheteam-api
  fi
  nginx -t
  systemctl reload nginx
  certbot certonly --webroot -w /var/www/letsencrypt \
    -d api.guesstheteam.de --non-interactive --agree-tos --email onur.t@aol.com
fi
install -m 0644 deploy/nginx-api-https.conf /etc/nginx/sites-available/guesstheteam-api
nginx -t
systemctl reload nginx
# Certificate refreshes must be loaded by nginx.
install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
install -m 0755 deploy/reload-nginx.sh /etc/letsencrypt/renewal-hooks/deploy/guesstheteam-nginx
systemctl enable --now certbot.timer
curl --fail --silent --show-error --max-time 15 https://api.guesstheteam.de/ready
