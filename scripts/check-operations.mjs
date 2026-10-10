import 'dotenv/config';
import { readFile, statfs } from 'node:fs/promises';
import pg from 'pg';
const issues = [];
const checks = [
  ['local API', process.env.GTT_HEALTH_URL || 'http://127.0.0.1:4000/ready'],
  ['public API', 'https://api.guesstheteam.de/ready'],
  ['frontend', 'https://guesstheteam.de'],
];
for (const [name, url] of checks) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!response.ok) issues.push(`${name}: HTTP ${response.status}`);
    else if (name.includes('API') && !(await response.json()).ok) issues.push(`${name}: invalid readiness response`);
    else if (name === 'frontend' && !(await response.text()).includes('GuessTheTeam')) issues.push('frontend: unexpected content');
  } catch { issues.push(`${name}: unreachable`); }
}
const database = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await database.connect();
  const { rows: [mail] } = await database.query("SELECT count(*)::int AS delayed FROM auth_mail_outbox WHERE expires_at>now() AND (attempts>=3 OR created_at<now()-interval '10 minutes')");
  if (mail.delayed) issues.push(`mail queue: ${mail.delayed} delayed messages`);
} catch { issues.push('database: unavailable'); }
finally { await database.end().catch(() => {}); }
const directory = process.env.GTT_BACKUP_DIRECTORY || '/var/backups/guesstheteam';
try {
  const backup = JSON.parse(await readFile(`${directory}/latest.json`, 'utf8'));
  if (Date.now() - Date.parse(backup.completedAt) > 30 * 3600000 || !(backup.bytes > 0)) issues.push('database backup: missing or older than 30 hours');
  const disk = await statfs(directory);
  if (disk.bavail / disk.blocks < 0.1) issues.push('backup volume: less than 10% free');
} catch { issues.push('database backup: status unavailable'); }
if (issues.length) {
  for (const issue of issues) console.error(`FAIL: ${issue}`);
  process.exitCode = 1;
} else console.log('Operations checks passed: local/public API, frontend, database, mail queue, backup freshness and disk space.');
