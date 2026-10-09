import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AuthService } from '../services/AuthService';
import type { AuthenticatedRequestUser } from '../types';

declare module 'express-serve-static-core' {
  interface Request { user?: AuthenticatedRequestUser }
}
export const SESSION_COOKIE = env.NODE_ENV === 'production' ? '__Host-gtt_session' : 'gtt_session';
export function getSessionToken(req: Request) {
  return req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}
const authService = new AuthService();
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await authService.getUser(getSessionToken(req));
  if (!user) return res.status(401).json({ error: 'Bitte melde dich an.' });
  req.user = { id: user.id };
  next();
}
// Credentialed browser mutations must originate from an explicitly allowed frontend.
export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const allowed = env.CORS_ORIGIN.split(',').map(value => value.trim());
  if (!req.headers.origin || !allowed.includes(req.headers.origin)) {
    return res.status(403).json({ error: 'Nicht erlaubter Ursprung.' });
  }
  next();
}
