import 'dotenv/config';
import { mkdir, chmod, rename, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);
const directory = process.env.GTT_BACKUP_DIRECTORY || '/var/backups/guesstheteam';
const url = new URL(process.env.DATABASE_URL);
const pgEnv = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)) };
const filename = `gtt-${new Date().toISOString().replaceAll(':', '-')}.dump`;
const temporary = join(directory, `${filename}.partial`);
try {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  await execute('/usr/lib/postgresql/18/bin/pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--file', temporary], { env: pgEnv, timeout: 120000 });
  await chmod(temporary, 0o600);
  await execute('/usr/lib/postgresql/18/bin/pg_restore', ['--list', temporary], { timeout: 30000 });
  await rename(temporary, join(directory, filename));
  await writeFile(join(directory, 'latest.json'), JSON.stringify({ filename, completedAt: new Date().toISOString(), bytes: (await stat(join(directory, filename))).size }) + '\n', { mode: 0o600 });
  const retentionDays = Number(process.env.GTT_BACKUP_RETENTION_DAYS || 14);
  if (!Number.isInteger(retentionDays) || retentionDays < 2) throw new Error('Invalid backup retention');
  for (const file of await readdir(directory)) {
    if (!/^gtt-\d{4}-\d{2}-\d{2}T[\d.-]+Z\.dump$/.test(file) || file === filename) continue;
    const path = join(directory, file);
    if (Date.now() - (await stat(path)).mtimeMs > retentionDays * 86400000) await unlink(path);
  }
  console.log(`Database backup verified: ${filename}. Retention: ${retentionDays} days.`);
} catch {
  console.error('Database backup failed. No connection details printed.');
  process.exitCode = 1;
}
