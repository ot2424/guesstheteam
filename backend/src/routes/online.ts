import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { OnlineMatchupService } from '../services/OnlineMatchupService';

const createSchema = z.object({
  opponentId: z.string().uuid(),
});

const paramsSchema = z.object({
  matchupId: z.string().uuid(),
});

const guessSchema = z.object({
  input: z.string().trim().min(1).max(80),
});

export function createOnlineRouter(service = new OnlineMatchupService()) {
  const router = Router();

  router.get('/matchups', requireAuth, async (req, res) => {
    res.json(await service.list(req.user?.accessToken));
  });

  router.post('/matchups', requireAuth, async (req, res) => {
    const payload = createSchema.parse(req.body);
    const result = await service.create(req.user?.accessToken, payload.opponentId);
    if ('error' in result) throw new HttpError(400, result.error);
    res.status(201).json({ matchup: result });
  });

  router.get('/matchups/:matchupId', requireAuth, async (req, res) => {
    const params = paramsSchema.parse(req.params);
    const matchup = await service.get(req.user?.accessToken, params.matchupId);
    if (!matchup) throw new HttpError(404, 'Online-Match nicht gefunden.');
    res.json({ matchup });
  });

  router.post('/matchups/:matchupId/join', requireAuth, async (req, res) => {
    const params = paramsSchema.parse(req.params);
    const matchup = await service.join(req.user?.accessToken, params.matchupId);
    if (!matchup) throw new HttpError(404, 'Online-Match nicht gefunden.');
    res.json({ matchup });
  });

  router.post('/matchups/:matchupId/guess', requireAuth, async (req, res) => {
    const params = paramsSchema.parse(req.params);
    const payload = guessSchema.parse(req.body);
    const result = await service.guess(req.user?.accessToken, params.matchupId, payload.input);
    if (!result) throw new HttpError(404, 'Online-Match nicht aktiv.');
    res.json(result);
  });

  router.post('/matchups/:matchupId/finish', requireAuth, async (req, res) => {
    const params = paramsSchema.parse(req.params);
    const matchup = await service.finish(req.user?.accessToken, params.matchupId);
    if (!matchup) throw new HttpError(404, 'Online-Match nicht aktiv.');
    res.json({ matchup });
  });

  router.post('/matchups/:matchupId/leave', requireAuth, async (req, res) => {
    const params = paramsSchema.parse(req.params);
    const matchup = await service.leave(req.user?.accessToken, params.matchupId);
    if (!matchup) throw new HttpError(404, 'Online-Match nicht gefunden.');
    res.json({ matchup });
  });

  return router;
}
