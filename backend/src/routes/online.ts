import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { OnlineMatchupService } from '../services/OnlineMatchupService';
import { accountWriteLimit, gameStartLimit } from '../middleware/rateLimits';

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
  router.use(requireAuth, accountWriteLimit());

  router.get('/matchups', async (req, res) => {
    res.json(await service.list(req.user?.id));
  });

  router.post('/matchups', gameStartLimit(), async (req, res) => {
    const payload = createSchema.parse(req.body);
    const result = await service.create(req.user?.id, payload.opponentId);
    if ('error' in result) throw new HttpError(400, result.error);
    res.status(201).json({ matchup: result });
  });

  router.get('/matchups/:matchupId', async (req, res) => {
    const params = paramsSchema.parse(req.params);
    const matchup = await service.get(req.user?.id, params.matchupId);
    if (!matchup) throw new HttpError(404, 'Online-Match nicht gefunden.');
    res.json({ matchup });
  });

  router.post('/matchups/:matchupId/join', async (req, res) => {
    const params = paramsSchema.parse(req.params);
    const matchup = await service.join(req.user?.id, params.matchupId);
    if (!matchup) throw new HttpError(404, 'Online-Match nicht gefunden.');
    res.json({ matchup });
  });

  router.post('/matchups/:matchupId/guess', async (req, res) => {
    const params = paramsSchema.parse(req.params);
    const payload = guessSchema.parse(req.body);
    const result = await service.guess(req.user?.id, params.matchupId, payload.input);
    if (!result) throw new HttpError(404, 'Online-Match nicht aktiv.');
    res.json(result);
  });

  router.post('/matchups/:matchupId/finish', async (req, res) => {
    const params = paramsSchema.parse(req.params);
    const matchup = await service.finish(req.user?.id, params.matchupId);
    if (!matchup) throw new HttpError(404, 'Online-Match nicht aktiv.');
    res.json({ matchup });
  });

  router.post('/matchups/:matchupId/leave', async (req, res) => {
    const params = paramsSchema.parse(req.params);
    const matchup = await service.leave(req.user?.id, params.matchupId);
    if (!matchup) throw new HttpError(404, 'Online-Match nicht gefunden.');
    res.json({ matchup });
  });

  return router;
}
