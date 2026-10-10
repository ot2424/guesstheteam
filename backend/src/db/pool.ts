import pg from 'pg';
import type { PoolClient, QueryResultRow } from 'pg';
import { env } from '../config/env';
import { AsyncLocalStorage } from 'node:async_hooks';
const transactionContext = new AsyncLocalStorage<PoolClient>();

// Preserve ISO timestamps in API responses and persisted online state.
pg.types.setTypeParser(1184, (value) => new Date(value).toISOString());
export const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000, statement_timeout: 10000, lock_timeout: 5000, idle_in_transaction_session_timeout: 15000 });
pool.on('error', (error) => console.error('PostgreSQL pool error', error));
export const hasDatabase = Boolean(env.DATABASE_URL);
export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  if (!hasDatabase) throw new Error('DATABASE_URL is required');
  return (await (transactionContext.getStore() ?? pool).query<T>(text, values)).rows;
}
export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  if (!hasDatabase) throw new Error('DATABASE_URL is required');
  const existing = transactionContext.getStore();
  if (existing) return work(existing);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await transactionContext.run(client, () => work(client));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function withAdvisoryLock<T>(scope: string, id: string, work: () => Promise<T>) {
  if (env.NODE_ENV === 'test') return work();
  return transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`${scope}:${id}`]);
    return work();
  });
}
// Used only for trusted, internal rows from seed scripts and online services.
export async function upsertRows(table: 'team_seasons' | 'online_matchups' | 'online_matchup_results', rows: Record<string, unknown>[], conflict = ['id']) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const ident = (value: string) => {
    if (!/^[a-z_]+$/.test(value)) throw new Error('Invalid SQL identifier');
    return `"${value}"`;
  };
  const values: unknown[] = [];
  const tuples = rows.map(row => `(${columns.map(column => {
    const value = row[column];
    values.push(value && typeof value === 'object' && !Array.isArray(value) ? JSON.stringify(value) : value);
    return `$${values.length}`;
  }).join(',')})`);
  const updates = columns.filter(c => !conflict.includes(c)).map(c => `${ident(c)} = EXCLUDED.${ident(c)}`);
  await query(`INSERT INTO ${ident(table)} (${columns.map(ident).join(',')}) VALUES ${tuples.join(',')} ON CONFLICT (${conflict.map(ident).join(',')}) DO UPDATE SET ${updates.join(',')}`, values);
}
