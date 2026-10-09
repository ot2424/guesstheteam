import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hasDatabase, pool, transaction } from '../backend/src/db/pool';
if (!hasDatabase) throw new Error('DATABASE_URL is required');
const directory = fileURLToPath(new URL('../backend/migrations/', import.meta.url));
try {
  await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(78419263)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const applied = new Set((await client.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map(row => row.name));
    for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
      if (applied.has(name)) continue;
      await client.query(await readFile(`${directory}/${name}`, 'utf8'));
      await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
      console.log(`Applied ${name}`);
    }
  });
} finally { await pool.end(); }
