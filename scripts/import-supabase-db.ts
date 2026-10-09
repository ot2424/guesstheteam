// One-time import from a read-only Supabase database connection. No SDK required.
import pg from 'pg';
import { pool, transaction } from '../backend/src/db/pool';
const sourceUrl = process.env.SOURCE_DATABASE_URL;
if (!sourceUrl || !process.env.DATABASE_URL) throw new Error('SOURCE_DATABASE_URL and DATABASE_URL are required');
if (sourceUrl === process.env.DATABASE_URL) throw new Error('Source and target must differ');
const source = new pg.Pool({ connectionString: sourceUrl, max: 1 });
const tables = ['profiles', 'team_seasons', 'active_game_sessions', 'match_results', 'friend_requests', 'online_matchups', 'online_matchup_results'];
try {
  const client = await source.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const users = (await client.query(`SELECT id, lower(email) AS email, encrypted_password AS password_hash,
      email_confirmed_at IS NOT NULL AS email_verified, created_at FROM auth.users`)).rows;
    if (users.some(user => !user.email || !/^\$2[aby]\$/.test(user.password_hash ?? ''))) {
      throw new Error('Import contains accounts without a supported password hash (e.g. OAuth). Plan password reset before importing.');
    }
    await transaction(async target => {
      await target.query('SELECT pg_advisory_xact_lock(78419263)');
      const existing = await target.query('SELECT id FROM users LIMIT 1');
      if (existing.rowCount) throw new Error('Import requires an empty target users table');
      for (const table of ['users', ...tables]) {
        const rows: Record<string, unknown>[] = table === 'users' ? users : (await client.query(`SELECT * FROM public.${table}`)).rows;
        const columns = (await target.query<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [table])).rows.map(row => row.column_name);
        for (const row of rows) {
          const selected = columns.filter(column => Object.hasOwn(row, column));
          const values = selected.map(column => {
            const value = row[column];
            return value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) ? JSON.stringify(value) : value;
          });
          await target.query(`INSERT INTO public.${table} (${selected.map(column => `"${column}"`).join(',')}) VALUES (${selected.map((_, index) => `$${index + 1}`).join(',')})`, values);
        }
        console.log(`Imported ${rows.length} rows into ${table}`);
      }
      await target.query('UPDATE active_game_sessions SET session = session - \'accessToken\'');
    });
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
} finally { await source.end(); await pool.end(); }
