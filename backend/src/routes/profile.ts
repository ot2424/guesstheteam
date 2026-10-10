import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { ProfileService } from '../services/ProfileService';
import { accountWriteLimit } from '../middleware/rateLimits';

const leaderboardQuerySchema = z.object({
  type: z.enum(['rank', 'streak', 'xp', 'wins']).default('rank'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const userSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(32),
  limit: z.coerce.number().int().min(1).max(25).default(12),
});

const friendRequestSchema = z.object({
  profileId: z.string().uuid(),
});

const friendResponseSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

export function createProfileRouter(profileService = new ProfileService()) {
  const router = Router();
  router.use(requireAuth, accountWriteLimit());

  router.get('/me', async (req, res) => {
    const profile = await profileService.getProfile(req.user?.id);
    if (!profile) throw new HttpError(404, 'Profil nicht gefunden.');
    res.json({ profile });
  });

  router.get('/matches', async (req, res) => {
    const matches = await profileService.getMatchHistory(req.user?.id);
    res.json({ matches });
  });

  router.get('/leaderboards', async (req, res) => {
    const query = leaderboardQuerySchema.parse(req.query);
    const entries = await profileService.getLeaderboards(query.type, query.limit);
    res.json({ entries });
  });

  router.get('/users/search', async (req, res) => {
    const query = userSearchQuerySchema.parse(req.query);
    const users = await profileService.searchUsers(req.user?.id, query.q, query.limit);
    res.json({ users });
  });

  router.get('/social', async (req, res) => {
    const social = await profileService.getSocialOverview(req.user?.id);
    res.json(social);
  });

  router.post('/friends/request', async (req, res) => {
    const payload = friendRequestSchema.parse(req.body);
    const result = await profileService.sendFriendRequest(req.user?.id, payload.profileId);
    if (result.error) throw new HttpError(400, result.error);
    res.status(201).json({ ok: true });
  });

  router.post('/friends/:requestId/respond', async (req, res) => {
    const params = z.object({ requestId: z.string().uuid() }).parse(req.params);
    const payload = friendResponseSchema.parse(req.body);
    const result = await profileService.respondToFriendRequest(req.user?.id, params.requestId, payload.action);
    if (result.error) throw new HttpError(400, result.error);
    res.json({ ok: true });
  });

  return router;
}
