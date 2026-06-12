import { Router } from 'express';
import { z } from 'zod';
import { REAL_MADRID_2223 } from '../data/mockTeams';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { GameSessionService } from '../services/GameSessionService';
import { PlayerMatchService } from '../services/PlayerMatchService';

const startSchema = z.object({
  mode: z.enum(['tutorial', 'single', 'series']).default('single'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('easy'),
});

const guessSchema = z.object({
  sessionId: z.string().uuid(),
  input: z.string().trim().min(1),
});

const finishSchema = z.object({
  sessionId: z.string().uuid(),
});

export function createGameRouter(
  sessionService = new GameSessionService(),
  matchService = new PlayerMatchService(),
) {
  const router = Router();

  router.post('/start', requireAuth, (req, res) => {
    const payload = startSchema.parse(req.body);
    const session = sessionService.create(req.user?.id ?? 'dev-user', REAL_MADRID_2223, payload);

    res.status(201).json({
      sessionId: session.sessionId,
      team: session.team,
    });
  });

  router.post('/guess', requireAuth, (req, res) => {
    const payload = guessSchema.parse(req.body);
    const session = sessionService.get(payload.sessionId);
    if (!session) throw new HttpError(404, 'Session not found');

    const match = matchService.findMatch(payload.input, session);
    if (!match) {
      sessionService.incrementWrong(payload.sessionId);
      return res.json({ correct: false });
    }

    sessionService.markSolved(payload.sessionId, match.playerId);
    return res.json({ correct: true, matchedPlayerId: match.playerId, name: match.name });
  });

  router.post('/finish', requireAuth, (req, res) => {
    const payload = finishSchema.parse(req.body);
    const result = sessionService.finish(payload.sessionId);
    if (!result) throw new HttpError(404, 'Session not found');

    res.json(result);
  });

  return router;
}
