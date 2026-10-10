import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { GameSessionService } from '../services/GameSessionService';
import { PlayerMatchService } from '../services/PlayerMatchService';
import { ProfileService } from '../services/ProfileService';
import { ProgressionService, RANKED_UNLOCK_LEVEL, WORLD_CUP_UNLOCK_LEVEL } from '../services/ProgressionService';
import { TeamSeedService } from '../services/TeamSeedService';
import type { Difficulty, MatchType, PlayMode } from '../types';
import { withAdvisoryLock } from '../db/pool';
import { accountWriteLimit, gameStartLimit } from '../middleware/rateLimits';

const startSchema = z.object({
  playMode: z.enum(['casual', 'ranked', 'worldcup']).default('casual'),
  matchType: z.enum(['single', 'series']).default('single'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  rank: z.enum(['Bronze 3', 'Bronze 2', 'Bronze 1', 'Silver 3', 'Silver 2', 'Silver 1', 'Gold 3', 'Gold 2', 'Gold 1', 'Platinum 3', 'Platinum 2', 'Platinum 1']).default('Bronze 3'),
  leagueId: z.string().max(80).optional(),
  winStreak: z.number().int().min(0).max(50).default(0),
  excludeTeamIds: z.array(z.string().max(120)).max(10).default([]),
  mode: z.enum(['tutorial', 'single', 'series']).optional(),
});

const guessSchema = z.object({
  sessionId: z.string().uuid(),
  input: z.string().trim().min(1).max(80),
});

const finishSchema = z.object({
  sessionId: z.string().uuid(),
  reason: z.enum(['complete', 'surrender']).default('complete'),
});

const autoSolveSchema = z.object({
  sessionId: z.string().uuid(),
  playerId: z.string().min(1).max(120),
});

const skipSchema = z.object({
  sessionId: z.string().uuid(),
});

export function createGameRouter(
  sessionService = new GameSessionService(),
  matchService = new PlayerMatchService(),
  progressionService = new ProgressionService(),
  teamSeedService = new TeamSeedService(),
  profileService = new ProfileService(),
) {
  const router = Router();
  router.use(requireAuth, accountWriteLimit());
  const mutation = <T extends { sessionId: string }>(schema: z.ZodType<T>, work: (payload: T, userId: string) => Promise<unknown>): RequestHandler => async (req, res) => {
    const payload = schema.parse(req.body);
    const result = await withAdvisoryLock('game', payload.sessionId, () => work(payload, req.user!.id));
    res.json(result);
  };

  router.get('/sessions/:id', async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const completed = await profileService.getCompletedMatch(req.user?.id, id);
    if (completed) return res.json({ ...completed, status: 'completed', finish: completed });
    const session = await sessionService.get(id, req.user?.id);
    if (!session) throw new HttpError(404, 'Dieses Spiel ist nicht mehr verfügbar.');
    return res.json({
      status: 'active', sessionId: id, team: session.team, startedAt: session.startedAt,
      casualSkipsRemaining: await profileService.getCasualSkipsRemaining(req.user?.id),
      playMode: session.playMode, matchType: session.matchType, difficulty: session.difficulty, rank: session.rank,
      guesses: Object.fromEntries(Object.entries(session.players).map(([playerId, player]) => [playerId, {
        playerId, solved: player.solved, attempts: player.wrongAttempts, revealed: false,
        ...(player.solved ? { guessedName: player.name } : {}),
      }])),
    });
  });

  router.post('/start', gameStartLimit(), async (req, res) => {
    const payload = startSchema.parse(req.body);
    const matchType = (payload.mode && payload.mode !== 'tutorial' ? payload.mode : payload.matchType) as MatchType;
    const playMode = payload.playMode as PlayMode;
    const profile = await profileService.getProfile(req.user?.id);
    if (playMode === 'ranked' && (!profile || profile.level < RANKED_UNLOCK_LEVEL)) {
      throw new HttpError(403, `Ranked wird ab Level ${RANKED_UNLOCK_LEVEL} freigeschaltet.`);
    }
    if (playMode === 'worldcup' && (!profile || profile.level < WORLD_CUP_UNLOCK_LEVEL)) {
      throw new HttpError(403, `WM-Modus wird ab Level ${WORLD_CUP_UNLOCK_LEVEL} freigeschaltet.`);
    }
    const rank = profile?.rank ?? 'Bronze 3';
    const winStreak = profile?.winStreak ?? 0;
    const difficulty = playMode === 'ranked'
      ? progressionService.getDifficultyForRank(rank)
      : playMode === 'worldcup'
        ? 'medium'
      : payload.difficulty ?? 'easy';
    const team = await teamSeedService.selectTeam({
      playMode,
      difficulty,
      leagueId: payload.leagueId,
      excludeTeamIds: payload.excludeTeamIds,
      recentTeamIds: await profileService.getRecentTeamIds(req.user?.id),
    });
    const session = await sessionService.create(req.user?.id ?? 'dev-user', team, {
      leagueId: payload.leagueId,
      playMode,
      matchType,
      difficulty,
      rank,
      winStreak,
      // Every new series starts from server-owned counters and an unpredictable ID.
      series: matchType === 'series' ? { round: 1, wins: 0, played: 0 } : undefined,
    });

    res.status(201).json({
      casualSkipsRemaining: await profileService.getCasualSkipsRemaining(req.user?.id),
      sessionId: session.sessionId,
      playMode: session.playMode,
      matchType: session.matchType,
      difficulty: session.difficulty,
      rank: session.rank,
      winStreak: session.winStreak,
      surrenderLpChange: progressionService.calcLP({
        playMode: session.playMode,
        difficulty: session.difficulty,
        matchType: session.matchType,
        isWin: false,
        winStreak: session.winStreak,
        isSeriesComplete: session.matchType === 'series' ? false : true,
      }),
      series: session.series,
      selection: getSelectionDescriptor(session.playMode, session.difficulty, payload.leagueId),
      team: session.team,
    });
  });

  router.post('/guess', mutation(guessSchema, async (payload, userId) => {
    const session = await sessionService.get(payload.sessionId, userId);
    if (!session) throw new HttpError(404, 'Session not found');

    const match = matchService.findMatch(payload.input, session);
    if (!match) {
      await sessionService.incrementWrong(payload.sessionId, userId);
      return { correct: false };
    }

    await sessionService.markSolved(payload.sessionId, userId, match.playerId);
    return { correct: true, matchedPlayerId: match.playerId, name: match.name };
  }));

  router.post('/auto-solve', mutation(autoSolveSchema, async (payload, userId) => {
    const session = await sessionService.get(payload.sessionId, userId);
    if (!session) throw new HttpError(404, 'Session not found');
    if (session.playMode !== 'ranked') throw new HttpError(400, 'Auto-Solve-Joker sind nur im Ranked-Modus nutzbar.');
    if (!Object.hasOwn(session.players, payload.playerId) || session.players[payload.playerId].solved) {
      throw new HttpError(400, 'Diese Karte kann nicht automatisch gelöst werden.');
    }

    const profile = await profileService.consumeAutoSolveJoker(userId);
    if (!profile) throw new HttpError(400, 'Kein Auto-Solve-Joker verfügbar.');
    const solved = await sessionService.autoSolve(payload.sessionId, userId, payload.playerId);
    if (!solved) throw new HttpError(400, 'Diese Karte kann nicht automatisch gelöst werden.');

    return {
      solved,
      profile,
    };
  }));

  router.post('/skip', mutation(skipSchema, async (payload, userId) => {
    const completed = await profileService.getCompletedMatch(userId, payload.sessionId);
    if (completed?.skipped) return { skipped: true, profile: completed.profile, casualSkipsRemaining: await profileService.getCasualSkipsRemaining(userId) };
    if (completed) throw new HttpError(409, 'Dieses Spiel wurde bereits beendet.');
    const session = await sessionService.get(payload.sessionId, userId);
    if (!session) throw new HttpError(404, 'Session not found');
    if (session.playMode === 'casual') {
      // Reject exhausted pools before spending a free skip or discarding progress.
      await teamSeedService.selectTeam({ playMode: 'casual', difficulty: session.difficulty, leagueId: session.leagueId, excludeTeamIds: [session.team.id] });
      const finish = await sessionService.finish(payload.sessionId, userId, 'surrender', false);
      if (!finish) throw new HttpError(404, 'Session not found');
      const profile = await profileService.persistMatch(userId, { session, skipped: true, result: finish.result, progression: { xpGained: 0, lpChange: 0 } });
      if (!profile) throw new HttpError(500, 'Skip konnte nicht gespeichert werden.');
      await sessionService.skip(payload.sessionId, userId);
      return { skipped: true, profile, casualSkipsRemaining: await profileService.getCasualSkipsRemaining(userId) };
    }
    if (session.playMode !== 'ranked') throw new HttpError(400, 'Dieser Modus unterstützt keine Skips.');

    const profile = await profileService.consumeSkipShield(userId);
    if (!profile) throw new HttpError(400, 'Kein Team-Skip-Schild verfügbar.');

    await sessionService.skip(payload.sessionId, userId);

    return {
      skipped: true,
      profile,
    };
  }));

  router.post('/finish', mutation(finishSchema, async (payload, userId) => {
    const completed = await profileService.getCompletedMatch(userId, payload.sessionId);
    if (completed) return completed;
    const session = await sessionService.get(payload.sessionId, userId);
    if (!session) throw new HttpError(404, 'Session not found');

    const result = await sessionService.finish(payload.sessionId, userId, payload.reason, false);
    if (!result) throw new HttpError(404, 'Session not found');

    const profile = await profileService.persistMatch(userId, {
      session,
      result: result.result,
      progression: result.progression,
    });

    if (!profile) throw new HttpError(500, 'Match konnte nicht gespeichert werden.');
    await sessionService.skip(payload.sessionId, userId);

    return await profileService.getCompletedMatch(userId, payload.sessionId) ?? { ...result, profile };
  }));

  return router;
}

function getSelectionDescriptor(playMode: PlayMode, difficulty: Difficulty, leagueId?: string) {
  if (playMode === 'worldcup') {
    return {
      pool: 'world-cup-national-teams',
      leagueId: 'national-team',
      seasons: { from: 2024, to: 2024 },
    };
  }

  if (playMode === 'casual' && difficulty === 'easy') {
    return {
      pool: 'fixed-league-modern-top-teams',
      leagueId: leagueId ?? 'L1',
      seasons: { from: 2018, to: 2026 },
    };
  }

  if (playMode === 'casual') {
    return {
      pool: 'mixed-european-leagues',
      seasons: difficulty === 'hard' ? { from: 2013, to: 2015 } : { from: 2016, to: 2017 },
    };
  }

  if (difficulty === 'easy') {
    return {
      pool: 'ranked-modern-elite-clubs',
      seasons: { from: 2018, to: 2026 },
    };
  }

  if (difficulty === 'medium') {
    return {
      pool: 'ranked-established-euro-clubs',
      seasons: { from: 2016, to: 2017 },
    };
  }

  if (difficulty === 'hard') {
    return {
      pool: 'mixed-leagues-nostalgia',
      seasons: { from: 2013, to: 2015 },
    };
  }

  return {
    pool: 'mixed-european-leagues',
    seasons: { from: 2010, to: 2026 },
  };
}
