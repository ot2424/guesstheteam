import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import 'dotenv/config';
import pg from 'pg';
const credentials = JSON.parse(readFileSync(new URL('../.admin-test-account.json', import.meta.url)));
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
  assert.equal(user.role, 'admin');
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
  assert.equal((await call('/api/v1/auth/logout', 'POST')).status, 200);
  assert.equal((await call('/api/v1/auth/me')).status, 401);
  console.log('Public HTTPS checks passed: database readiness, admin login, CORS/CSRF, secure cookies, profile, PostgreSQL game persistence, guess and logout.');
} finally {
  if (cookie) await call('/api/v1/auth/logout', 'POST').catch(() => {});
  if (sessionId && userId) await database.query('DELETE FROM active_game_sessions WHERE id=$1 AND user_id=$2', [sessionId, userId]);
  await database.end();
}
