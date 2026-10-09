import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { createAuthRouter } from './routes/auth';
import { requireTrustedOrigin } from './middleware/auth';
import { query } from './db/pool';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createGameRouter } from './routes/game';
import { createOnlineRouter } from './routes/online';
import { createPlayersRouter } from './routes/players';
import { createProfileRouter } from './routes/profile';

function getCorsOrigins() {
  const origins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 1 ? origins : origins[0];
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 'loopback');
  app.use(helmet());
  app.use(cors({ origin: getCorsOrigins(), credentials: true }));
  app.use(requireTrustedOrigin);
  app.use(express.json({ limit: '32kb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/ready', async (_req, res) => { await query('SELECT 1'); res.json({ ok: true }); });
  app.use('/api/v1', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use('/api/v1/auth', createAuthRouter());
  app.use('/api/v1/game', createGameRouter());
  app.use('/api/v1/online', createOnlineRouter());
  app.use('/api/v1/players', createPlayersRouter());
  app.use('/api/v1/profile', createProfileRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
