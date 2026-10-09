import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { enqueueAuthMail } from './MailService';
import type { PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { query, transaction } from '../db/pool';
import { env } from '../config/env';
import { HttpError } from '../middleware/errorHandler';

export interface AuthUser { id: string; email: string; username: string; firstName: string; lastName: string; role: 'user' | 'admin' }
export interface SignUpPayload { email: string; password: string; username: string; firstName: string; lastName: string }
const USER_SELECT = `SELECT u.id, u.email, u.role, p.username, p.first_name AS "firstName", p.last_name AS "lastName"
 FROM users u JOIN profiles p ON p.id=u.id`;
export function hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string) {
  // Existing Supabase accounts use bcrypt; preserve these hashes during import.
  if (/^\$2[aby]\$/.test(hash)) return bcrypt.compare(password, hash);
  const [algorithm, salt, encoded] = hash.split('$');
  if (algorithm !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(encoded ?? '')) return false;
  const expected = Buffer.from(encoded, 'hex');
  return timingSafeEqual(await derive(password, salt), expected);
}
const dummyHash = hashPassword('dummy-account-password');
export class AuthService {
  async register(payload: SignUpPayload): Promise<AuthUser> {
    const passwordHash = await hashPassword(payload.password);
    try {
      return await transaction(async client => {
        const { rows: [user] } = await client.query<{ id: string }>('INSERT INTO users(email,password_hash) VALUES ($1,$2) RETURNING id', [payload.email.toLowerCase(), passwordHash]);
        await client.query('INSERT INTO profiles(id,email,username,first_name,last_name) VALUES ($1,$2,$3,$4,$5)', [user.id, payload.email.toLowerCase(), payload.username, payload.firstName, payload.lastName]);
        await this.issueToken(client, user.id, payload.email.toLowerCase(), 'verify-email');
        return { role: 'user', id: user.id, email: payload.email.toLowerCase(), username: payload.username, firstName: payload.firstName, lastName: payload.lastName };
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new HttpError(409, 'E-Mail oder Benutzername ist bereits vergeben.');
      throw error;
    }
  }
  async login(email: string, password: string): Promise<AuthUser> {
    const [row] = await query<AuthUser & { password_hash: string; email_verified: boolean }>(`${USER_SELECT.replace('SELECT u.id', 'SELECT u.password_hash, u.email_verified, u.id')} WHERE u.email=$1`, [email.toLowerCase()]);
    const valid = await verifyPassword(password, row?.password_hash ?? await dummyHash);
    if (!row || !valid) throw new HttpError(401, 'E-Mail oder Passwort stimmt nicht.');
    if (!row.email_verified) throw new HttpError(403, 'Bitte bestätige zuerst deine E-Mail-Adresse.');
    const { password_hash, email_verified, ...user } = row;
    void email_verified;
    void password_hash;
    return user;
  }
  async loginWithSession(email: string, password: string) {
    return transaction(async client => {
      // Serialize login with password resets so an old password cannot mint a
      // session after a concurrent reset has revoked the previous sessions.
      const { rows: [row] } = await client.query<AuthUser & { password_hash: string; email_verified: boolean }>(
        `${USER_SELECT.replace('SELECT u.id', 'SELECT u.password_hash, u.email_verified, u.id')} WHERE u.email=$1 FOR UPDATE OF u`, [email.toLowerCase()]);
      const valid = await verifyPassword(password, row?.password_hash ?? await dummyHash);
      if (!row || !valid) throw new HttpError(401, 'E-Mail oder Passwort stimmt nicht.');
      if (!row.email_verified) throw new HttpError(403, 'Bitte bestätige zuerst deine E-Mail-Adresse.');
      const { password_hash, email_verified, ...user } = row;
      void password_hash; void email_verified;
      const token = randomBytes(32).toString('hex');
      await client.query(`INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+$3 * interval '1 day')`, [hashToken(token), user.id, env.AUTH_SESSION_DAYS]);
      return { user, token };
    });
  }

  async createSession(userId: string) {
    const token = randomBytes(32).toString('hex');
    const rows = await query(`INSERT INTO auth_sessions(token_hash,user_id,expires_at) SELECT $1,id,now()+$3 * interval '1 day' FROM users WHERE id=$2 AND email_verified=true RETURNING user_id`, [hashToken(token), userId, env.AUTH_SESSION_DAYS]);
    if (!rows.length) throw new HttpError(403, 'Bitte bestätige zuerst deine E-Mail-Adresse.');
    return token;
  }
  async getUser(token?: string): Promise<AuthUser | null> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const [user] = await query<AuthUser>(`${USER_SELECT} JOIN auth_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.email_verified=true`, [hashToken(token)]);
    return user ?? null;
  }
  async logout(token?: string) {
    if (token) await query('DELETE FROM auth_sessions WHERE token_hash=$1', [hashToken(token)]);
  }
  private async issueToken(client: PoolClient, userId: string, email: string, purpose: 'verify-email' | 'reset-password') {
    const token = randomBytes(32).toString('hex');
    await client.query(`INSERT INTO auth_action_tokens(token_hash,user_id,purpose,expires_at)
      VALUES ($1,$2,$3,now()+$4 * interval '1 minute') ON CONFLICT (user_id,purpose)
      DO UPDATE SET token_hash=EXCLUDED.token_hash, expires_at=EXCLUDED.expires_at, created_at=now()`,
      [hashToken(token), userId, purpose, purpose === 'verify-email' ? 1440 : 30]);
    await enqueueAuthMail(client, userId, email, purpose, token);
  }

  async requestAction(email: string, purpose: 'verify-email' | 'reset-password') {
    await transaction(async client => {
      const { rows: [user] } = await client.query<{ id: string; email: string; email_verified: boolean }>(
        'SELECT id,email,email_verified FROM users WHERE email=$1 FOR UPDATE', [email.toLowerCase()]);
      if (!user || (purpose === 'verify-email' ? user.email_verified : !user.email_verified)) return;
      // Per-account cooldown in addition to the endpoint/IP limiter.
      const recent = await client.query("SELECT 1 FROM auth_action_tokens WHERE user_id=$1 AND purpose=$2 AND created_at>now()-interval '1 minute'", [user.id, purpose]);
      if (recent.rowCount) return;
      await this.issueToken(client, user.id, user.email, purpose);
    });
  }

  async completeAction(token: string, purpose: 'verify-email' | 'reset-password', password?: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(400, 'Der Link ist ungültig oder abgelaufen.');
    const passwordHash = purpose === 'reset-password' && password ? await hashPassword(password) : undefined;
    if (purpose === 'reset-password' && !passwordHash) throw new HttpError(400, 'Ein neues Passwort ist erforderlich.');
    await transaction(async client => {
      const { rows: [action] } = await client.query<{ user_id: string }>('SELECT user_id FROM auth_action_tokens WHERE token_hash=$1 AND purpose=$2', [hashToken(token), purpose]);
      if (!action) throw new HttpError(400, 'Der Link ist ungültig oder abgelaufen.');
      const { rows: [user] } = await client.query<{ email: string }>('SELECT email FROM users WHERE id=$1 FOR UPDATE', [action.user_id]);
      const consumed = await client.query('DELETE FROM auth_action_tokens WHERE token_hash=$1 AND purpose=$2 AND expires_at>now() RETURNING user_id', [hashToken(token), purpose]);
      if (!user || !consumed.rowCount) throw new HttpError(400, 'Der Link ist ungültig oder abgelaufen.');
      if (purpose === 'verify-email') {
        await client.query('UPDATE users SET email_verified=true WHERE id=$1', [action.user_id]);
      } else {
        await client.query('UPDATE users SET password_hash=$2 WHERE id=$1', [action.user_id, passwordHash]);
        await client.query('DELETE FROM auth_sessions WHERE user_id=$1', [action.user_id]);
        await enqueueAuthMail(client, action.user_id, user.email, 'password-changed');
      }
      await client.query('DELETE FROM auth_mail_outbox WHERE user_id=$1 AND purpose=$2', [action.user_id, purpose]);
    });
  }

}
