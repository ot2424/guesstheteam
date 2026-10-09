import { setTimeout as delay } from 'node:timers/promises';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env';
import { getSessionToken, SESSION_COOKIE } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { AuthService } from '../services/AuthService';

const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(256) });
const registerSchema = loginSchema.extend({
  password: z.string().min(12).max(256),
  username: z.string().trim().min(3).max(32).regex(/^[\p{L}\p{N}_-]+$/u),
  firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80),
});
const cookieOptions = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const, path: '/' };
export function createAuthRouter(service = new AuthService()) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.' } });
  router.post('/register', limiter, async (req, res) => {
    await service.register(registerSchema.parse(req.body));
    res.status(201).json({ needsEmailConfirmation: true });
  });
  router.post('/login', limiter, async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const { user, token } = await service.loginWithSession(payload.email, payload.password);
    await service.logout(getSessionToken(req));
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: env.AUTH_SESSION_DAYS * 86400000 });
    res.json({ user });
  });
  const emailSchema = z.object({ email: z.string().trim().email().max(254) });
  const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });
  router.post('/resend-verification', limiter, async (req, res) => {
    await Promise.all([service.requestAction(emailSchema.parse(req.body).email, 'verify-email'), delay(200)]);
    res.json({ ok: true, message: 'Falls eine Bestätigung nötig ist, erhältst du eine E-Mail.' });
  });
  router.post('/verify-email', limiter, async (req, res) => {
    await service.completeAction(tokenSchema.parse(req.body).token, 'verify-email');
    res.json({ ok: true });
  });
  router.post('/forgot-password', limiter, async (req, res) => {
    await Promise.all([service.requestAction(emailSchema.parse(req.body).email, 'reset-password'), delay(200)]);
    res.json({ ok: true, message: 'Falls ein bestätigter Account existiert, erhältst du eine E-Mail.' });
  });
  router.post('/reset-password', limiter, async (req, res) => {
    const payload = tokenSchema.extend({ password: z.string().min(12).max(256) }).parse(req.body);
    await service.completeAction(payload.token, 'reset-password', payload.password);
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.json({ ok: true });
  });
  router.get('/me', async (req, res) => {
    const user = await service.getUser(getSessionToken(req));
    if (!user) throw new HttpError(401, 'Bitte melde dich an.');
    res.json({ user });
  });
  router.post('/logout', async (req, res) => {
    await service.logout(getSessionToken(req));
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.json({ ok: true });
  });
  return router;
}
