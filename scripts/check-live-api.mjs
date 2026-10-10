import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../backend/src/services/AuthService.ts';
import { pool } from '../backend/src/db/pool.ts';
import 'dotenv/config';
import pg from 'pg';
const suffix = randomBytes(8).toString('hex');
const credentials = { email: `live-check-${suffix}@example.com`, password: randomBytes(32).toString('hex') };
let testUserId;
const base = 'https://api.guesstheteam.de';
const origin = 'https://guesstheteam.de';
const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
let cookie = '';
let sessionId;
let userId;
async function call(path, method = 'GET', body, requestOrigin = origin) {
  return fetch(base + path, { method, headers: { Origin: requestOrigin, Cookie: cookie, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
}
try {
  await database.connect();
  await database.query('BEGIN');
  try {
    const { rows: [user] } = await database.query('INSERT INTO users(email,password_hash,email_verified) VALUES ($1,$2,true) RETURNING id', [credentials.email, await hashPassword(credentials.password)]);
    testUserId = user.id;
    await database.query("INSERT INTO profiles(id,email,username,first_name,last_name) VALUES ($1,$2,$3,'Live','Check')", [testUserId, credentials.email, `live_${suffix}`]);
    await database.query('COMMIT');
  } catch (error) { await database.query('ROLLBACK'); throw error; }
  assert.equal((await call('/ready')).status, 200);
  assert.equal((await call('/api/v1/auth/me')).status, 401);
  assert.equal((await call('/api/v1/auth/login', 'POST', { email: credentials.email, password: credentials.password }, 'https://untrusted.example')).status, 403);
  const login = await call('/api/v1/auth/login', 'POST', { email: credentials.email, password: credentials.password });
  assert.equal(login.status, 200);
  assert.equal(login.headers.get('access-control-allow-origin'), origin);
  assert.equal(login.headers.get('access-control-allow-credentials'), 'true');
  const setCookie = login.headers.get('set-cookie');
  assert.ok(setCookie.includes('Secure') && setCookie.includes('HttpOnly') && setCookie.includes('SameSite=None'));
  cookie = setCookie.split(';')[0];
  const { user } = await login.json();
  userId = user.id;
  assert.equal(user.role, 'user');
  assert.equal((await call('/api/v1/profile/me')).status, 200);
  const start = await call('/api/v1/game/start', 'POST', { playMode: 'casual', difficulty: 'easy' });
  assert.equal(start.status, 201);
  const game = await start.json();
  sessionId = game.sessionId;
  assert.equal(game.team.players.length, 11);
  assert.ok(game.team.players.every(player => !player.name));
  const { rows: [stored] } = await database.query('SELECT session FROM active_game_sessions WHERE id=$1 AND user_id=$2', [sessionId, userId]);
  const player = Object.values(stored.session.players)[0];
  const guess = await call('/api/v1/game/guess', 'POST', { sessionId, input: player.name });
  assert.equal(guess.status, 200);
  assert.equal((await guess.json()).correct, true);
  const restored = await call(`/api/v1/game/sessions/${sessionId}`).then(response => response.json());
  assert.equal(restored.status, 'active');
  assert.equal(Object.values(restored.guesses).filter(guess => guess.solved).length, 1);
  const profileBeforeSkip = await call('/api/v1/profile/me').then(response => response.json());
  const seenTeams = new Set();
  for (let index = 0; index < 3; index++) {
    const current = index === 0 ? game : await call('/api/v1/game/start', 'POST', { playMode: 'casual', difficulty: 'easy' }).then(response => response.json());
    assert.equal(seenTeams.has(current.team.id), false);
    seenTeams.add(current.team.id);
    const skipped = await call('/api/v1/game/skip', 'POST', { sessionId: current.sessionId });
    assert.equal(skipped.status, 200);
    assert.equal((await skipped.json()).casualSkipsRemaining, 2 - index);
    assert.equal((await call('/api/v1/game/skip', 'POST', { sessionId: current.sessionId })).status, 200);
  }
  assert.deepEqual(await call('/api/v1/profile/me').then(response => response.json()), profileBeforeSkip);
  const history = await call('/api/v1/profile/matches').then(response => response.json());
  assert.equal(history.matches.length, 3);
  assert.ok(history.matches.every(match => match.skipped && match.xpGained === 0 && match.lpChange === 0));
  const noSkips = await call('/api/v1/game/start', 'POST', { playMode: 'casual', difficulty: 'easy' }).then(response => response.json());
  assert.equal(seenTeams.has(noSkips.team.id), false);
  assert.equal(noSkips.casualSkipsRemaining, 0);
  assert.equal((await call('/api/v1/game/skip', 'POST', { sessionId: noSkips.sessionId })).status, 400);
  assert.equal((await call(`/api/v1/game/sessions/${noSkips.sessionId}`)).status, 200);
  assert.equal((await call('/api/v1/auth/logout', 'POST')).status, 200);
  assert.equal((await call('/api/v1/auth/me')).status, 401);
  console.log('Public HTTPS checks passed: database readiness, temporary account login, CORS/CSRF, secure cookies, profile, PostgreSQL game persistence, server resume, guess and logout. No email sent; temporary account removed.');
} finally {
  if (cookie) await call('/api/v1/auth/logout', 'POST').catch(() => {});
  if (sessionId && userId) await database.query('DELETE FROM active_game_sessions WHERE id=$1 AND user_id=$2', [sessionId, userId]);
  if (testUserId) await database.query('DELETE FROM users WHERE id=$1', [testUserId]);
  await database.end();
  await pool.end();
}
