// Run after db:migrate against an isolated test database, never production.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createApp } from '../backend/src/app';
import { pool, query } from '../backend/src/db/pool';
import { hashToken } from '../backend/src/services/AuthService';
import { deliverAuthMail } from '../backend/src/services/MailService';
import { ProfileService } from '../backend/src/services/ProfileService';
import { ONLINE_UNLOCK_LEVEL } from '../backend/src/services/ProgressionService';
import { TeamSeedService } from '../backend/src/services/TeamSeedService';
import { REAL_MADRID_2223 } from '../backend/src/data/mockTeams';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
if (process.env.MIGRATION_TEST_DATABASE !== 'true') throw new Error('Set MIGRATION_TEST_DATABASE=true and DATABASE_URL to an isolated test database');
const fixtureDirectory = mkdtempSync(path.join(tmpdir(), 'gtt-db-fixtures-'));
process.env.GUESSTHETEAM_SEED_PATH = path.join(fixtureDirectory, 'seed.json');
writeFileSync(process.env.GUESSTHETEAM_SEED_PATH, JSON.stringify({ teams: ['easy', 'medium', 'hard'].flatMap(difficulty => Array.from({ length: 6 }, (_, index) => ({ ...REAL_MADRID_2223, id: `skip-fixture-${difficulty}-${index}`, name: `Fixture ${difficulty} ${index}`, difficulty }))) }));
const server = createApp().listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
const origin = 'http://localhost:5173';
let cookie = '';
const userIds: string[] = [];
async function call(path: string, method = 'GET', body?: unknown, session = cookie, requestOrigin = origin) {
  return fetch(`${base}${path}`, { method, headers: { Origin: requestOrigin, Cookie: session, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
try {
  assert.equal((await call('/profile/me')).status, 401);
  assert.equal((await call('/auth/register', 'POST', {}, '', 'https://evil.example')).status, 403);
  assert.equal((await call('/auth/register', 'POST', { email: 'broken' })).status, 400);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const payload = { email: `test-${suffix}@example.com`, password: 'a-test-password-12345', username: `test_${suffix}`, firstName: 'Test', lastName: 'User' };
  async function registerAndVerify(account: typeof payload) {
    const registered = await call('/auth/register', 'POST', { ...account, role: 'admin', email_verified: true }, '');
    assert.equal(registered.status, 201);
    assert.equal(registered.headers.get('set-cookie'), null);
    assert.equal((await registered.json()).needsEmailConfirmation, true);
    const [user] = await query('SELECT id,email FROM users WHERE email=$1', [account.email]);
    userIds.push(user.id);
    assert.equal((await call('/auth/login', 'POST', { email: account.email, password: account.password }, '')).status, 403);
    const [mail] = await query('SELECT body FROM auth_mail_outbox WHERE user_id=$1 AND purpose=$2', [user.id, 'verify-email']);
    const token = mail.body.match(/token=([a-f0-9]{64})/)[1];
    const [{ token_hash }] = await query('SELECT token_hash FROM auth_action_tokens WHERE user_id=$1', [user.id]);
    assert.equal(token_hash, hashToken(token));
    assert.equal((await call('/auth/verify-email', 'POST', { token }, '')).status, 200);
    assert.equal((await call('/auth/verify-email', 'POST', { token }, '')).status, 400);
    const login = await call('/auth/login', 'POST', { email: account.email, password: account.password }, '');
    assert.equal(login.status, 200);
    assert.ok(login.headers.get('set-cookie')!.includes('HttpOnly'));
    assert.equal((await login.json()).user.role, 'user');
    return { user, cookie: login.headers.get('set-cookie')!.split(';')[0] };
  }
  const registered = await registerAndVerify(payload);
  const user = registered.user;
  cookie = registered.cookie;
  const [{ token_hash }] = await query('SELECT token_hash FROM auth_sessions WHERE user_id=$1', [user.id]);
  assert.equal(token_hash, hashToken(cookie.split('=')[1]));
  assert.equal((await call('/auth/register', 'POST', payload)).status, 409);
  assert.equal((await call('/auth/login', 'POST', { email: payload.email, password: 'wrong' })).status, 401);
  assert.equal((await call('/auth/me')).status, 200);
  assert.equal((await call('/profile/me')).status, 200);
  const start = await call('/game/start', 'POST', { playMode: 'casual' });
  assert.equal(start.status, 201);
  const game = await start.json();
  assert.ok(game.team.players.every((player: { name?: string }) => !player.name));
  const startSession = (await query('SELECT session FROM active_game_sessions WHERE id=$1', [game.sessionId]))[0].session;
  const guess = await call('/game/guess', 'POST', { sessionId: game.sessionId, input: Object.values(startSession.players as Record<string, { name: string }>)[0].name });
  assert.equal(guess.status, 200);
  assert.equal((await guess.json()).correct, true);
  const parallelNames = Object.values(startSession.players as Record<string, { name: string }>).slice(1, 4).map(player => player.name);
  await Promise.all(parallelNames.map(input => call('/game/guess', 'POST', { sessionId: game.sessionId, input })));
  const restored = await call(`/game/sessions/${game.sessionId}`).then(response => response.json());
  assert.equal(restored.status, 'active');
  assert.equal(Object.values(restored.guesses as Record<string, { solved: boolean }>).filter(player => player.solved).length, 4);
  assert.ok(restored.team.players.every((player: { name?: string }) => !player.name));
  assert.ok(Object.values(restored.guesses as Record<string, { solved: boolean; guessedName?: string }>).every(player => player.solved || !player.guessedName));
  const finish = await call('/game/finish', 'POST', { sessionId: game.sessionId, reason: 'surrender' });
  assert.equal(finish.status, 200);
  const completedResponse = await finish.json();
  const replay = await call('/game/finish', 'POST', { sessionId: game.sessionId, reason: 'complete' });
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), completedResponse);
  const resumedCompletion = await call(`/game/sessions/${game.sessionId}`).then(response => response.json());
  assert.equal(resumedCompletion.status, 'completed');
  assert.deepEqual(resumedCompletion.finish, completedResponse);
  assert.equal((await call('/profile/matches').then(response => response.json())).matches.length, 1);
  const service = new ProfileService();
  const persistence = { session: startSession, result: { solved: 1, total: 11, durationSec: 1, isWin: false, isPerfect: false, completionRatio: 1 / 11 }, progression: { xpGained: 999, lpChange: 0 } };
  const before = await service.getProfile(user.id);
  await Promise.all([service.persistMatch(user.id, persistence), service.persistMatch(user.id, persistence)]);
  assert.equal((await service.getProfile(user.id))!.xp, before!.xp);
  const seen = new Set([game.team.id]);
  for (let index = 0; index < 3; index++) {
    const next = await call('/game/start', 'POST', { playMode: 'casual', difficulty: 'easy' }).then(response => response.json());
    assert.equal(seen.has(next.team.id), false, 'Previously completed/skipped teams must be avoided');
    seen.add(next.team.id);
    const skipped = await call('/game/skip', 'POST', { sessionId: next.sessionId });
    assert.equal(skipped.status, 200);
    assert.equal((await skipped.json()).casualSkipsRemaining, 2 - index);
    assert.equal((await call('/game/skip', 'POST', { sessionId: next.sessionId })).status, 200, 'Skip retry is idempotent');
    assert.equal((await query('SELECT id FROM active_game_sessions WHERE id=$1', [next.sessionId])).length, 0);
  }
  const skippedHistory = await call('/profile/matches').then(response => response.json());
  assert.equal(skippedHistory.matches.filter((match: { skipped: boolean }) => match.skipped).length, 3);
  assert.deepEqual(await service.getProfile(user.id), before, 'Skipping must preserve XP, LP and match counters');
  const exhausted = await call('/game/start', 'POST', { playMode: 'casual' }).then(response => response.json());
  assert.equal(exhausted.casualSkipsRemaining, 0);
  assert.equal((await call('/game/skip', 'POST', { sessionId: exhausted.sessionId })).status, 400);
  assert.equal((await call(`/game/sessions/${exhausted.sessionId}`)).status, 200, 'Rejected skip preserves the game');
  const hard = await call('/game/start', 'POST', { playMode: 'casual', difficulty: 'hard' }).then(response => response.json());
  const [hardRow] = await query('SELECT session FROM active_game_sessions WHERE id=$1', [hard.sessionId]);
  for (const player of Object.values(hardRow.session.players as Record<string, { name: string }>).slice(0, 3)) {
    assert.equal((await call('/game/guess', 'POST', { sessionId: hard.sessionId, input: player.name })).status, 200);
  }
  await query("UPDATE active_game_sessions SET session=jsonb_set(session, '{startedAt}', to_jsonb($2::bigint)) WHERE id=$1", [hard.sessionId, Date.now() - 300_000]);
  const hardFinish = await call('/game/finish', 'POST', { sessionId: hard.sessionId, reason: 'complete' }).then(response => response.json());
  assert.equal(hardFinish.result.isWin, true);
  assert.equal(hardFinish.result.solved, 3);
  assert.equal(hardFinish.progression.xpGained, 61);
  assert.deepEqual(await call('/game/finish', 'POST', { sessionId: hard.sessionId, reason: 'complete' }).then(response => response.json()), hardFinish);
  await query('UPDATE profiles SET skip_shields=1 WHERE id=$1', [user.id]);
  const consumed = await Promise.all([service.consumeSkipShield(user.id), service.consumeSkipShield(user.id)]);
  assert.equal(consumed.filter(Boolean).length, 1);
  // Ownership checks and social/online persistence.
  const second = await registerAndVerify({ ...payload, email: `other-${suffix}@example.com`, username: `other_${suffix}` });
  const other = second.user;
  const otherCookie = second.cookie;
  const ownStart = await call('/game/start', 'POST', { playMode: 'casual' });
  const ownGame = await ownStart.json();
  assert.equal((await call('/game/guess', 'POST', { sessionId: ownGame.sessionId, input: 'anything' }, otherCookie)).status, 404);
  assert.equal((await call(`/game/sessions/${ownGame.sessionId}`, 'GET', undefined, otherCookie)).status, 404);
  assert.equal((await call(`/game/sessions/${game.sessionId}`, 'GET', undefined, otherCookie)).status, 404);
  assert.equal((await call('/profile/friends/request', 'POST', { profileId: other.id })).status, 201);
  const social = await call('/profile/social', 'GET', undefined, otherCookie).then(response => response.json());
  assert.equal(social.incoming.length, 1);
  assert.equal((await call(`/profile/friends/${social.incoming[0].id}/respond`, 'POST', { action: 'accept' }, otherCookie)).status, 200);
  await query('UPDATE profiles SET level=$3 WHERE id=$1 OR id=$2', [user.id, other.id, ONLINE_UNLOCK_LEVEL]);
  const duel = await call('/online/matchups', 'POST', { opponentId: other.id });
  assert.equal(duel.status, 201);
  const duelId = (await duel.json()).matchup.id;
  assert.equal((await call(`/online/matchups/${duelId}/join`, 'POST', undefined, otherCookie)).status, 200);
  assert.equal((await call(`/online/matchups/${duelId}`)).status, 200);
  const teamId = `migration-test-${suffix}`;
  await query(`INSERT INTO team_seasons(id,name,season,league,team) VALUES ($1,'Test','2025','Test',$2)`, [teamId, JSON.stringify({ id: teamId, name: 'Test', season: '2025', league: 'Test', players: [], logoUrl: '', formation: '4-3-3', difficulty: 'easy' })]);
  try { assert.equal((await new TeamSeedService().selectTeam({ playMode: 'casual', difficulty: 'easy' })).id, teamId); }
  finally { await query('DELETE FROM team_seasons WHERE id=$1', [teamId]); }
  const unknown = await call('/auth/forgot-password', 'POST', { email: `unknown-${suffix}@example.com` }).then(response => response.json());
  const known = await call('/auth/forgot-password', 'POST', { email: payload.email }).then(response => response.json());
  assert.deepEqual(unknown, known);
  const tokenFromMail = async () => (await query('SELECT body FROM auth_mail_outbox WHERE user_id=$1 AND purpose=$2', [user.id, 'reset-password']))[0].body.match(/token=([a-f0-9]{64})/)[1];
  const oldToken = await tokenFromMail();
  assert.equal((await call('/auth/verify-email', 'POST', { token: oldToken })).status, 400);
  assert.equal((await call('/auth/reset-password', 'POST', { token: oldToken, password: 'short' })).status, 400);
  await query("UPDATE auth_action_tokens SET expires_at=now()-interval '1 second', created_at=now()-interval '2 minutes' WHERE user_id=$1", [user.id]);
  assert.equal((await call('/auth/reset-password', 'POST', { token: oldToken, password: 'a-new-test-password-123' })).status, 400);
  await call('/auth/forgot-password', 'POST', { email: payload.email });
  const resetToken = await tokenFromMail();
  assert.notEqual(resetToken, oldToken);
  const resetResults = await Promise.all([
    call('/auth/reset-password', 'POST', { token: resetToken, password: 'a-new-test-password-123' }),
    call('/auth/reset-password', 'POST', { token: resetToken, password: 'a-new-test-password-123' }),
  ]);
  assert.deepEqual(resetResults.map(response => response.status).sort(), [200, 400]);
  assert.equal((await call('/auth/me')).status, 401);
  assert.equal((await call('/auth/login', 'POST', { email: payload.email, password: payload.password })).status, 401);
  // Simulate a failed SMTP attempt and then delivery, without external email.
  await deliverAuthMail(async () => { throw new Error('simulated SMTP failure'); });
  const [{ attempts }] = await query('SELECT attempts FROM auth_mail_outbox WHERE user_id=$1 AND purpose=$2', [user.id, 'password-changed']);
  assert.equal(attempts, 1);
  await query('UPDATE auth_mail_outbox SET next_attempt_at=now() WHERE user_id=$1', [user.id]);
  let delivered = false;
  await deliverAuthMail(async mail => { assert.equal(mail.to, payload.email); assert.ok(mail.html.includes('Passwort geändert')); assert.ok(mail.text); delivered = true; });
  assert.equal(delivered, true);
  assert.equal((await query('SELECT id FROM auth_mail_outbox WHERE user_id=$1', [user.id])).length, 0);
  const login = await call('/auth/login', 'POST', { email: payload.email.toUpperCase(), password: 'a-new-test-password-123' });
  assert.equal(login.status, 200);
  cookie = login.headers.get('set-cookie')!.split(';')[0];
  await query("UPDATE auth_sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1", [user.id]);
  assert.equal((await call('/auth/me')).status, 401);
  const relogin = await call('/auth/login', 'POST', { email: payload.email.toUpperCase(), password: 'a-new-test-password-123' });
  assert.equal(relogin.status, 200);
  cookie = relogin.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await call('/auth/logout', 'POST')).status, 200);
  assert.equal((await call('/auth/me')).status, 401);
  console.log('Migration integration checks passed: email confirmation, password recovery, session expiry/revocation, ownership, matches, idempotency, inventory, social, online and team storage.');
} finally {
  for (const id of userIds) await query('DELETE FROM users WHERE id=$1', [id]);
  server.close();
  await once(server, 'close');
  await pool.end();
  rmSync(fixtureDirectory, { recursive: true, force: true });
}
