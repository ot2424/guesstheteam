import { Router } from 'express';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { ProfileService } from '../services/ProfileService';

export function createProfileRouter(profileService = new ProfileService()) {
  const router = Router();

  router.get('/me', requireAuth, async (req, res) => {
    const profile = await profileService.getProfile(req.user?.accessToken);
    if (!profile) throw new HttpError(404, 'Profil nicht gefunden.');
    res.json({ profile });
  });

  return router;
}
