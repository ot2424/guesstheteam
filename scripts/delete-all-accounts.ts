import { hasDatabase, pool, transaction } from '../backend/src/db/pool';

// Uses the application's PostgreSQL database. Team data and schema stay intact.
if (!hasDatabase) throw new Error('DATABASE_URL is required');
const execute = process.argv.includes('--execute');
try {
  await transaction(async client => {
    await client.query('LOCK TABLE public.users IN EXCLUSIVE MODE');
    const { rows: [before] } = await client.query<{ count: string }>('SELECT count(*) FROM public.users');
    if (!execute) {
      console.log(`Found ${before.count} accounts. No data deleted. Run with --execute to delete all accounts and associated user data.`);
      return;
    }
    // ON DELETE CASCADE removes profiles, sessions, matches, friendships and duels.
    const result = await client.query('DELETE FROM public.users');
    console.log(`Deleted ${result.rowCount} accounts and associated user data. Team data retained.`);
  });
} finally {
  await pool.end();
}
