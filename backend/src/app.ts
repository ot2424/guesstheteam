import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createGameRouter } from './routes/game';
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

  app.use(helmet());
  app.use(cors({ origin: getCorsOrigins() }));
  app.use(express.json());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/v1/game', createGameRouter());
  app.use('/api/v1/players', createPlayersRouter());
  app.use('/api/v1/profile', createProfileRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
