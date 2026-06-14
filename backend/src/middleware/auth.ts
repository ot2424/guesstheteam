import type { NextFunction, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import type { AuthenticatedRequestUser } from '../types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedRequestUser;
  }
}

const supabase = env.SUPABASE_URL && env.SUPABASE_ANON_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  : null;

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token && env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  if (!token || !supabase) {
    req.user = { id: 'dev-user' };
    return next();
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    if (env.NODE_ENV !== 'production') {
      req.user = { id: 'dev-user' };
      return next();
    }

    return res.status(401).json({ error: 'Invalid bearer token' });
  }

  req.user = { id: data.user.id, accessToken: token };
  return next();
}
