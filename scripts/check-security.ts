// Controlled checks against an isolated database, never existing production users.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../backend/src/app';
import { hashPassword } from '../backend/src/services/AuthService';
import { pool, query, transaction, withAdvisoryLock } from '../backend/src/db/pool';
import { REAL_MADRID_2223 } from '../backend/src/data/mockTeams';

if (process.env.MIGRATION_TEST_DATABASE !== 'true') throw new Error('Use an isolated test database and set MIGRATION_TEST_DATABASE=true');
const directory = mkdtempSync(path.join(tmpdir(), 'gtt-security-'));
process.env.GUESSTHETEAM_SEED_PATH = path.join(directory, 'seed.json');
writeFileSync(process.env.GUESSTHETEAM_SEED_PATH, JSON.stringify({ teams: ['easy', 'medium', 'hard'].flatMap(difficulty => Array.from({ length: 4 }, (_, index) => ({ ...REAL_MADRID_2223, id: `${difficulty}-${index}`, name: `Fixture ${difficulty} ${index}`, difficulty }))) }));
const server = createApp().listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address() as { port: number };
const base = `http://127.0.0.1:${address.port}/api/v1`;
const origin = 'http://localhost:5173';
const users: string[] = [];
let cookie = '';
async function call(route: string, method = 'GET', body?: unknown, session = cookie, extraHeaders: Record<string, string> = {}) {
  return fetch(base + route, { method, headers: { Origin: origin, Cookie: session, 'Content-Type': 'application/json', ...extraHeaders }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
try {
  const password = 'a-security-check-password-123';
  const passwordHash = await hashPassword(password);
  async function account(level: number, rank: string, lp: number) {
    const suffix = randomUUID().slice(0, 8);
    const email = `security-${suffix}@example.com`;
    const [user] = await query<{ id: string }>('INSERT INTO users(email,password_hash,email_verified) VALUES ($1,$2,true) RETURNING id', [email, passwordHash]);
    users.push(user.id);
    await query("INSERT INTO profiles(id,email,username,first_name,last_name,level,xp,rank,lp,skip_shields,auto_solve_jokers) VALUES ($1,$2,$3,'Security','Check',$4,$5,$6,$7,3,3)", [user.id, email, `security_${suffix}`, level, (level - 1) * 500, rank, lp]);
    const login = await call('/auth/login', 'POST', { email, password }, '');
    assert.equal(login.status, 200);
    const session = login.headers.get('set-cookie')!.split(';')[0];
    return { id: user.id, session };
  }
  const owner = await account(25, 'Gold 3', 1260);
  const other = await account(25, 'Gold 3', 1260);
  const locked = await account(1, 'Bronze 3', 0);
  cookie = owner.session;

  assert.equal((await call('/profile/me', 'GET', undefined, '')).status, 401);
  assert.equal((await call('/profile/me', 'GET', undefined, 'gtt_session=' + 'a'.repeat(64))).status, 401);
  assert.equal((await call('/game/start', 'POST', {}, cookie, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await call('/game/start', 'POST', {}, cookie, { Origin: '' })).status, 403);
  const malformed = await fetch(base + '/auth/login', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  const oversized = await call('/auth/login', 'POST', { email: 'x'.repeat(33000) });
  assert.equal(oversized.status, 413);
  assert.equal((await call('/players/search?q=' + 'a'.repeat(81))).status, 400);
  const injection = await call('/profile/users/search?q=' + encodeURIComponent("' OR true --"));
  assert.equal(injection.status, 200);
  assert.deepEqual((await injection.json()).users, []);
  assert.equal((await call('/game/start', 'POST', { playMode: 'ranked', rank: 'Platinum 1', level: 99 }, locked.session)).status, 403);
  assert.equal((await call('/game/start', 'POST', { playMode: 'worldcup', level: 99 }, locked.session)).status, 403);
  assert.equal((await call('/online/matchups', 'POST', { opponentId: owner.id }, locked.session)).status, 400);

  const suppliedSeriesId = randomUUID();
  const series = await call('/game/start', 'POST', { playMode: 'ranked', matchType: 'series', difficulty: 'easy', rank: 'Bronze 3', winStreak: 50, seriesId: suppliedSeriesId, seriesRound: 3, seriesWins: 2, seriesPlayed: 2 }).then(response => response.json());
  assert.equal(series.difficulty, 'hard');
  assert.equal(series.rank, 'Gold 3');
  assert.equal(series.winStreak, 0);
  assert.equal(series.series.round, 1);
  assert.equal(series.series.wins, 0);
  assert.equal(series.series.played, 0);
  assert.notEqual(series.series.seriesId, suppliedSeriesId);
  for (const endpoint of ['guess', 'finish', 'skip', 'auto-solve']) {
    const body = { sessionId: series.sessionId, input: 'Raul', playerId: REAL_MADRID_2223.players[0].id, userId: owner.id };
    assert.equal((await call(`/game/${endpoint}`, 'POST', body, other.session)).status, 404, `Foreign ${endpoint} must fail`);
  }
  assert.equal((await call(`/game/sessions/${series.sessionId}`, 'GET', undefined, other.session)).status, 404);
  for (const playerId of ['__proto__', 'constructor', 'toString']) {
    assert.equal((await call('/game/auto-solve', 'POST', { sessionId: series.sessionId, playerId })).status, 400);
  }
  const [walletBefore] = await query('SELECT auto_solve_jokers FROM profiles WHERE id=$1', [owner.id]);
  assert.equal(walletBefore.auto_solve_jokers, 3);
  const playerId = REAL_MADRID_2223.players[0].id;
  const repeatedJokers = await Promise.all(Array.from({ length: 6 }, () => call('/game/auto-solve', 'POST', { sessionId: series.sessionId, playerId })));
  assert.equal(repeatedJokers.filter(response => response.status === 200).length, 1);
  assert.ok(repeatedJokers.every(response => [200, 400].includes(response.status)));
  assert.equal((await query('SELECT auto_solve_jokers FROM profiles WHERE id=$1', [owner.id]))[0].auto_solve_jokers, 2);
  const forged = await call('/game/finish', 'POST', { sessionId: series.sessionId, reason: 'complete', solved: 11, isWin: true, xpGained: 999999, lpChange: 999999, startedAt: Date.now() });
  const forgedResult = await forged.json();
  assert.equal(forgedResult.result.solved, 1);
  assert.equal(forgedResult.result.isWin, false);
  assert.equal(forgedResult.progression.xpGained, 0);

  const shieldGame = await call('/game/start', 'POST', { playMode: 'ranked', difficulty: 'easy' }).then(response => response.json());
  const repeatedShields = await Promise.all(Array.from({ length: 6 }, () => call('/game/skip', 'POST', { sessionId: shieldGame.sessionId })));
  assert.equal(repeatedShields.filter(response => response.status === 200).length, 1);
  assert.ok(repeatedShields.every(response => [200, 404].includes(response.status)));
  assert.equal((await query('SELECT skip_shields FROM profiles WHERE id=$1', [owner.id]))[0].skip_shields, 2);

  const completion = await call('/game/start', 'POST', { playMode: 'casual', difficulty: 'hard' }).then(response => response.json());
  for (const player of REAL_MADRID_2223.players.slice(0, 3)) await call('/game/guess', 'POST', { sessionId: completion.sessionId, input: player.name });
  await query("UPDATE active_game_sessions SET session=jsonb_set(session, '{startedAt}', to_jsonb($2::bigint)) WHERE id=$1", [completion.sessionId, Date.now() - 600_000]);
  const finishes = await Promise.all(Array.from({ length: 6 }, () => call('/game/finish', 'POST', { sessionId: completion.sessionId, reason: 'complete', durationSec: 1, xpGained: 99999 }).then(response => response.json())));
  assert.equal(finishes[0].progression.xpGained, 38);
  assert.ok(finishes.every(result => JSON.stringify(result) === JSON.stringify(finishes[0])));
  assert.equal((await query('SELECT count(*)::int AS count FROM match_results WHERE user_id=$1 AND session_id=$2', [owner.id, completion.sessionId]))[0].count, 1);

  const [rollbackBefore] = await query('SELECT skip_shields FROM profiles WHERE id=$1', [owner.id]);
  await assert.rejects(withAdvisoryLock('security-rollback', owner.id, async () => {
    await transaction(async () => { await query('UPDATE profiles SET skip_shields=99 WHERE id=$1', [owner.id]); });
    throw new Error('intentional rollback');
  }));
  assert.deepEqual((await query('SELECT skip_shields FROM profiles WHERE id=$1', [owner.id]))[0], rollbackBefore);

  await query("INSERT INTO friend_requests(requester_id,addressee_id,status) VALUES ($1,$2,'accepted')", [owner.id, other.id]);
  const duel = await call('/online/matchups', 'POST', { opponentId: other.id }).then(response => response.json());
  const duelId = duel.matchup.id;
  assert.equal((await call(`/online/matchups/${duelId}/join`, 'POST', {}, other.session)).status, 200);
  assert.equal((await call(`/online/matchups/${duelId}`, 'GET', undefined, locked.session)).status, 404);
  for (const action of ['join', 'finish', 'leave', 'guess']) {
    assert.equal((await call(`/online/matchups/${duelId}/${action}`, 'POST', { input: 'Raul' }, locked.session)).status, 404);
  }
  await Promise.all([
    ...REAL_MADRID_2223.players.slice(0, 4).map(player => call(`/online/matchups/${duelId}/guess`, 'POST', { input: player.name })),
    ...REAL_MADRID_2223.players.slice(0, 3).map(player => call(`/online/matchups/${duelId}/guess`, 'POST', { input: player.name }, other.session)),
    ...Array.from({ length: 4 }, () => call(`/online/matchups/${duelId}`)),
  ]);
  const duelProgress = await call(`/online/matchups/${duelId}`).then(response => response.json());
  assert.equal(duelProgress.matchup.self.solved, 4);
  assert.equal(duelProgress.matchup.rival.solved, 3);
  await Promise.all([call(`/online/matchups/${duelId}/finish`, 'POST', {}), call(`/online/matchups/${duelId}/finish`, 'POST', {}, other.session)]);
  const finishedDuel = await call(`/online/matchups/${duelId}`).then(response => response.json());
  assert.equal(finishedDuel.matchup.status, 'completed');
  assert.equal(finishedDuel.matchup.winnerId, owner.id);
  assert.ok(!('email' in finishedDuel.matchup.opponent));

  // Account limits still hold when the supplied proxy IP changes. This local
  // test emulates nginx, which overwrites X-Forwarded-For in production.
  const rateResponses = [];
  for (let index = 0; index < 95; index++) {
    const response = await call('/game/guess', 'POST', { sessionId: randomUUID(), input: 'Test' }, locked.session, { 'X-Forwarded-For': `198.51.100.${index + 1}` });
    rateResponses.push(response.status);
    if (response.status === 429) { assert.ok(Number(response.headers.get('retry-after')) > 0); break; }
  }
  assert.ok(rateResponses.includes(429));
  const loginRates = [];
  for (let index = 0; index < 16; index++) {
    const response = await call('/auth/login', 'POST', { email: 'rate-check@example.com', password: '' }, '', { 'X-Forwarded-For': `203.0.113.${index + 1}` });
    loginRates.push(response.status);
  }
  assert.equal(loginRates.at(-1), 429, 'Failed account logins must be limited across IPs');
  console.log('Security checks passed: origins, sessions, ownership, input limits, SQL-shaped input, server-owned rank/series/rewards, prototype keys, concurrent jokers/skips/finishes, atomic rollback, online concurrency and account rate limits.');
} finally {
  for (const id of users) await query('DELETE FROM users WHERE id=$1', [id]);
  server.close();
  await once(server, 'close');
  await pool.end();
  rmSync(directory, { recursive: true, force: true });
}
