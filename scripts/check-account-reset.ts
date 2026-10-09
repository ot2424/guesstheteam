import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, stat, rm, writeFile, unlink, access } from 'node:fs/promises';
import { join } from 'node:path';
import { pool, query } from '../backend/src/db/pool';
import { hashPassword, hashToken, AuthService } from '../backend/src/services/AuthService';

if (process.env.MIGRATION_TEST_DATABASE !== 'true') throw new Error('Use an isolated test database with MIGRATION_TEST_DATABASE=true');
const [{ count }] = await query('SELECT count(*) FROM users');
if (Number(count) !== 0) throw new Error('Account reset test requires an empty users table');
const directory = await mkdtemp('/tmp/gtt-account-reset-');
const credentialsFile = join(directory, 'admin.json');
const execute = promisify(execFile);
const childEnv = { ...process.env, ADMIN_EMAIL: 'admin-reset-test@example.com', ADMIN_CREDENTIALS_FILE: credentialsFile };
const teamId = 'account-reset-test-team';
try {
  const [{ id }] = await query("INSERT INTO users(email,password_hash,email_verified) VALUES ('old-reset-test@example.com',$1,true) RETURNING id", [await hashPassword('old-test-password-123')]);
  await query("INSERT INTO profiles(id,email,username,first_name,last_name) VALUES ($1,'old-reset-test@example.com','old_test','Old','Test')", [id]);
  await query("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '1 day')", [hashToken('old-session'), id]);
  await query("INSERT INTO auth_action_tokens(token_hash,user_id,purpose,expires_at) VALUES ($1,$2,'reset-password',now()+interval '30 minutes')", [hashToken('old-token'), id]);
  await query("INSERT INTO team_seasons(id,name,season,league,team) VALUES ($1,'Test','2025','Test','{}')", [teamId]);
  // A preview never changes accounts.
  await execute(process.execPath, ['--import', 'tsx', 'scripts/reset-accounts.ts'], { env: childEnv });
  assert.equal(Number((await query('SELECT count(*) FROM users'))[0].count), 1);
  // A credential-file collision must abort before touching the database or file.
  await writeFile(credentialsFile, 'existing-file', { flag: 'wx', mode: 0o600 });
  await assert.rejects(execute(process.execPath, ['--import', 'tsx', 'scripts/reset-accounts.ts', '--execute'], { env: childEnv }));
  assert.equal(await readFile(credentialsFile, 'utf8'), 'existing-file');
  assert.equal(Number((await query('SELECT count(*) FROM users'))[0].count), 1);
  await unlink(credentialsFile);
  // Force admin creation to fail after deletion, then verify full rollback.
  await query(`CREATE FUNCTION test_reject_admin() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.role='admin' THEN RAISE EXCEPTION 'simulated admin insertion failure'; END IF; RETURN NEW; END; $$`);
  await query('CREATE TRIGGER test_reject_admin BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION test_reject_admin()');
  try {
    await assert.rejects(execute(process.execPath, ['--import', 'tsx', 'scripts/reset-accounts.ts', '--execute'], { env: childEnv }));
    assert.equal(Number((await query('SELECT count(*) FROM users'))[0].count), 1);
    assert.equal((await query('SELECT role FROM users'))[0].role, 'user');
    await assert.rejects(access(credentialsFile));
  } finally {
    await query('DROP TRIGGER test_reject_admin ON users');
    await query('DROP FUNCTION test_reject_admin()');
  }
  await execute(process.execPath, ['--import', 'tsx', 'scripts/reset-accounts.ts', '--execute'], { env: childEnv });
  const credentials = JSON.parse(await readFile(credentialsFile, 'utf8'));
  assert.equal((await stat(credentialsFile)).mode & 0o777, 0o600);
  assert.equal((await query('SELECT id FROM users')).length, 1);
  assert.equal((await query('SELECT id FROM profiles')).length, 1);
  assert.equal((await query('SELECT token_hash FROM auth_sessions')).length, 0);
  assert.equal((await query('SELECT token_hash FROM auth_action_tokens')).length, 0);
  assert.equal((await query('SELECT id FROM team_seasons WHERE id=$1', [teamId])).length, 1);
  const admin = await new AuthService().login(credentials.email, credentials.password);
  assert.equal(admin.role, 'admin');
  assert.equal(admin.username, 'admin_test');
  console.log('Account reset checks passed: preview, credential collision, transaction rollback, deletion cascades, team retention, private credentials and admin login.');
} finally {
  await query("DELETE FROM users WHERE email IN ('admin-reset-test@example.com','old-reset-test@example.com')");
  await query('DELETE FROM team_seasons WHERE id=$1', [teamId]);
  await rm(directory, { recursive: true });
  await pool.end();
}
