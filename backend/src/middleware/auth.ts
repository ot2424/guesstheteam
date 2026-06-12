import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import type { AuthenticatedRequestUser } from '../types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedRequestUser;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token && env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  req.user = { id: token ? 'supabase-user-placeholder' : 'dev-user' };
  return next();
}
