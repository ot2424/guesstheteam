import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { ProfileService } from '../services/ProfileService';

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

  router.get('/me', requireAuth, async (req, res) => {
    const profile = await profileService.getProfile(req.user?.accessToken);
    if (!profile) throw new HttpError(404, 'Profil nicht gefunden.');
    res.json({ profile });
  });

  router.get('/matches', requireAuth, async (req, res) => {
    const matches = await profileService.getMatchHistory(req.user?.accessToken);
    res.json({ matches });
  });

  router.get('/leaderboards', requireAuth, async (req, res) => {
    const query = leaderboardQuerySchema.parse(req.query);
    const entries = await profileService.getLeaderboards(query.type, query.limit);
    res.json({ entries });
  });

  router.get('/users/search', requireAuth, async (req, res) => {
    const query = userSearchQuerySchema.parse(req.query);
    const users = await profileService.searchUsers(req.user?.accessToken, query.q, query.limit);
    res.json({ users });
  });

  router.get('/social', requireAuth, async (req, res) => {
    const social = await profileService.getSocialOverview(req.user?.accessToken);
    res.json(social);
  });

  router.post('/friends/request', requireAuth, async (req, res) => {
    const payload = friendRequestSchema.parse(req.body);
    const result = await profileService.sendFriendRequest(req.user?.accessToken, payload.profileId);
    if (result.error) throw new HttpError(400, result.error);
    res.status(201).json({ ok: true });
  });

  router.post('/friends/:requestId/respond', requireAuth, async (req, res) => {
    const params = z.object({ requestId: z.string().uuid() }).parse(req.params);
    const payload = friendResponseSchema.parse(req.body);
    const result = await profileService.respondToFriendRequest(req.user?.accessToken, params.requestId, payload.action);
    if (result.error) throw new HttpError(400, result.error);
    res.json({ ok: true });
  });

  return router;
}
