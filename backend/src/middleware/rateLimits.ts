import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

export const apiRateLimit = () => rateLimit({
  windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte warte kurz.' },
});

export const accountWriteLimit = () => rateLimit({
  windowMs: 60_000, limit: 90, standardHeaders: 'draft-8', legacyHeaders: false,
  keyGenerator: (req: Request) => req.user!.id,
  skip: req => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
  message: { error: 'Zu viele Spielaktionen. Bitte warte kurz.' },
});

export const gameStartLimit = () => rateLimit({
  windowMs: 60_000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false,
  keyGenerator: (req: Request) => req.user!.id,
  message: { error: 'Du startest zu viele Spiele gleichzeitig. Bitte warte kurz.' },
});
