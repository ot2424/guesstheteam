import { Router } from 'express';
import { z } from 'zod';
import { PlayerSearchService } from '../services/PlayerSearchService';

const querySchema = z.object({
  q: z.string().trim().default(''),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export function createPlayersRouter(playerSearchService = new PlayerSearchService()) {
  const router = Router();

  router.get('/search', (req, res) => {
    const query = querySchema.parse(req.query);
    res.json({ results: playerSearchService.search(query.q, query.limit) });
  });

  return router;
}
