import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { parse } from 'dotenv';
import pg from 'pg';

if (process.getuid?.() !== 0) throw new Error('Run as root on the PostgreSQL host');
const path = new URL('../.env', import.meta.url);
let config = parse(readFileSync(path));
let connection = config.DATABASE_URL;
function sql(statement) {
  try {
    return execFileSync('runuser', ['-u', 'postgres', '--', 'psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1'], { input: statement, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch { throw new Error('PostgreSQL provisioning failed; no credentials printed'); }
}
const hasRole = sql("SELECT count(*) FROM pg_roles WHERE rolname='guesstheteam';") === '1';
const hasDb = sql("SELECT count(*) FROM pg_database WHERE datname='guesstheteam';") === '1';
if (!connection || connection.includes('CHANGE_ME')) {
  if (hasRole || hasDb) throw new Error('Existing database or role found; configure its credentials instead of overwriting them');
  connection = `postgresql://guesstheteam:${randomBytes(32).toString('hex')}@127.0.0.1:5432/guesstheteam`;
  const latest = readFileSync(path, 'utf8');
  const updated = /^DATABASE_URL=/m.test(latest)
    ? latest.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${JSON.stringify(connection)}`)
    : `${latest}\nDATABASE_URL=${JSON.stringify(connection)}\n`;
  const temporary = new URL('../.env.provisioning', import.meta.url);
  writeFileSync(temporary, updated, { mode: 0o600, flag: 'wx' });
  renameSync(temporary, path);
  config = parse(updated);
}
const url = new URL(connection);
if (url.hostname !== '127.0.0.1' || url.pathname !== '/guesstheteam' || url.username !== 'guesstheteam') throw new Error('Provisioning only supports the local guesstheteam database');
const password = decodeURIComponent(url.password).replaceAll("'", "''");
if (!password) throw new Error('Database password is required');
if (!hasRole) sql(`CREATE ROLE guesstheteam LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;`);
if (!hasDb) sql('CREATE DATABASE guesstheteam OWNER guesstheteam ENCODING \'UTF8\' TEMPLATE template0;');
const client = new pg.Client({ connectionString: config.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  await client.query('SELECT 1');
  console.log('Local PostgreSQL database and application role ready. Credentials stored only in the central .env.');
} catch { throw new Error('Database connection failed; no credentials printed'); }
finally { await client.end(); }
