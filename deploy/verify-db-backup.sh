#!/usr/bin/env bash
# Restore into a disposable, private cluster, never into the live database.
set -euo pipefail
backup_file=${1:?Usage: verify-db-backup.sh /path/to/backup.dump}
restore_root=$(mktemp -d /tmp/gtt-restore.XXXXXX)
chmod 0700 "$restore_root"
cp "$backup_file" "$restore_root/backup.dump"
chown -R postgres:postgres "$restore_root"
cleanup() {
  runuser -u postgres -- /usr/lib/postgresql/18/bin/pg_ctl -D "$restore_root/data" stop -m immediate >/dev/null 2>&1 || true
  # The directory is private and the script only deletes its own mktemp directory.
  [[ "$restore_root" == /tmp/gtt-restore.* ]] && rm -rf -- "$restore_root"
}
trap cleanup EXIT
runuser -u postgres -- /usr/lib/postgresql/18/bin/initdb -D "$restore_root/data" --auth=trust --no-locale >/dev/null
runuser -u postgres -- /usr/lib/postgresql/18/bin/pg_ctl -D "$restore_root/data" -l "$restore_root/server.log" -o "-k $restore_root -c listen_addresses='' -p 55434" start >/dev/null
runuser -u postgres -- /usr/lib/postgresql/18/bin/pg_restore --host="$restore_root" --port=55434 --dbname=postgres --no-owner --no-acl --exit-on-error "$restore_root/backup.dump"
runuser -u postgres -- psql -h "$restore_root" -p 55434 -d postgres -X -At -c "SELECT 'Restored tables: '||count(*) FROM information_schema.tables WHERE table_schema='public'; SELECT 'Restored users: '||count(*) FROM users; SELECT 'Restored teams: '||count(*) FROM team_seasons; SELECT 'Restored migration versions: '||count(*) FROM schema_migrations;"
echo 'Backup restoration passed in an isolated temporary cluster.'
