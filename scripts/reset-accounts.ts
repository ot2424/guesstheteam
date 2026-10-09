import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { hasDatabase, pool, transaction } from '../backend/src/db/pool';
import { hashPassword } from '../backend/src/services/AuthService';

if (!hasDatabase) throw new Error('DATABASE_URL is required');
const execute = process.argv.includes('--execute');
let credentialsPath: string | undefined;
let committed = false;
try {
  const email = execute ? z.string().trim().email().max(254).parse(process.env.ADMIN_EMAIL).toLowerCase() : undefined;
  const password = execute ? randomBytes(24).toString('base64url') : undefined;
  const passwordHash = password ? await hashPassword(password) : undefined;
  if (execute) {
    credentialsPath = resolve(process.env.ADMIN_CREDENTIALS_FILE ?? `/tmp/guesstheteam-admin-${randomUUID()}.json`);
    // Create private credentials before any deletion. Do not overwrite existing files.
    const path = credentialsPath;
    credentialsPath = undefined;
    await writeFile(path, JSON.stringify({ email, password, username: 'admin_test', role: 'admin' }, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    credentialsPath = path;
  }
  const result = await transaction(async client => {
    await client.query('LOCK TABLE public.users IN EXCLUSIVE MODE');
    const { rows: [before] } = await client.query<{ count: string }>('SELECT count(*) FROM public.users');
    if (!execute) return { count: before.count };
    await client.query('DELETE FROM public.users');
    const { rows: [admin] } = await client.query<{ id: string }>(
      "INSERT INTO users(email,password_hash,email_verified,role) VALUES ($1,$2,true,'admin') RETURNING id", [email, passwordHash]);
    await client.query("INSERT INTO profiles(id,email,username,first_name,last_name) VALUES ($1,$2,'admin_test','Admin','Test')", [admin.id, email]);
    return { count: before.count };
  });
  committed = execute;
  console.log(execute
    ? `Deleted ${result.count} accounts and created one verified admin test account. Credentials: ${credentialsPath}`
    : `Found ${result.count} accounts. No changes. Set ADMIN_EMAIL and run with --execute to replace all accounts with one admin test account.`);
} finally {
  if (credentialsPath && !committed) await unlink(credentialsPath);
  await pool.end();
}
