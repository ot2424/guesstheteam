import nodemailer from 'nodemailer';
import type { PoolClient } from 'pg';
import { env } from '../config/env';
import { transaction } from '../db/pool';

import { renderAuthMail, type MailPurpose } from './AuthMailTemplate';
export async function enqueueAuthMail(client: PoolClient, userId: string, email: string, purpose: MailPurpose, token?: string) {
  const url = new URL('/auth', env.AUTH_FRONTEND_URL);
  if (token) url.hash = new URLSearchParams({ action: purpose, token }).toString();
  const subject = purpose === 'verify-email' ? 'Bestätige deine E-Mail bei GuessTheTeam'
    : purpose === 'reset-password' ? 'Passwort für GuessTheTeam zurücksetzen' : 'Dein GuessTheTeam-Passwort wurde geändert';
  const body = purpose === 'password-changed'
    ? 'Dein Passwort wurde geändert und alle bisherigen Sitzungen wurden abgemeldet. Falls du das nicht warst, setze dein Passwort umgehend über die Anmeldung zurück.'
    : `${purpose === 'verify-email' ? 'Bestätige deine E-Mail-Adresse. Der Link gilt 24 Stunden.' : 'Setze dein Passwort zurück. Der Link gilt 30 Minuten.'}\n\n${url.toString()}\n\nFalls du diese Anfrage nicht gestellt hast, ignoriere diese Nachricht.`;
  // A new action invalidates older queued messages of the same kind.
  await client.query('DELETE FROM auth_mail_outbox WHERE user_id=$1 AND purpose=$2', [userId, purpose]);
  await client.query(`INSERT INTO auth_mail_outbox(user_id,purpose,recipient,subject,body,expires_at)
    VALUES ($1,$2,$3,$4,$5,now()+$6 * interval '1 minute')`, [userId, purpose, email, subject, body, purpose === 'reset-password' ? 30 : 1440]);
}

export function startMailWorker() {
  if (!env.SMTP_HOST || !env.SMTP_FROM) {
    console.warn('SMTP is not configured. Auth messages remain in the database outbox; no emails are sent.');
    return async () => {};
  }
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE,
    requireTLS: !env.SMTP_SECURE,
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } } : {}),
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  let running: Promise<void> | undefined;
  const tick = () => {
    if (!running) running = deliverAuthMail(mail => transporter.sendMail({ from: env.SMTP_FROM, ...mail })).catch(() => { console.error('Auth mail worker failed.'); }).finally(() => { running = undefined; });
  };
  const timer = setInterval(tick, 2000);
  timer.unref();
  tick();
  return async () => { clearInterval(timer); await running; transporter.close(); };
}

export async function deliverAuthMail(send: (mail: { to: string; subject: string; text: string; html: string }) => Promise<unknown>) {
  await transaction(async client => {
    await client.query('DELETE FROM auth_mail_outbox WHERE expires_at <= now()');
    const { rows: [mail] } = await client.query<{ id: string; recipient: string; subject: string; body: string; purpose: MailPurpose }>(
      'SELECT id,recipient,subject,body,purpose FROM auth_mail_outbox WHERE next_attempt_at<=now() ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED');
    if (!mail) return;
    try {
      await send({ to: mail.recipient, subject: mail.subject, text: mail.body, html: renderAuthMail(mail.purpose, mail.body) });
      await client.query('DELETE FROM auth_mail_outbox WHERE id=$1', [mail.id]);
    } catch {
      // Do not log recipients, tokens or mail bodies.
      console.error('Auth email delivery failed; queued for retry.');
      await client.query("UPDATE auth_mail_outbox SET attempts=attempts+1, next_attempt_at=now()+interval '1 minute' WHERE id=$1", [mail.id]);
    }
  });
}
