import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { GameSessionService } from '../services/GameSessionService';
import { PlayerMatchService } from '../services/PlayerMatchService';
import { ProfileService } from '../services/ProfileService';
import { ProgressionService, RANKED_UNLOCK_LEVEL, WORLD_CUP_UNLOCK_LEVEL } from '../services/ProgressionService';
import { TeamSeedService } from '../services/TeamSeedService';
import type { Difficulty, MatchType, PlayMode, Rank } from '../types';

const startSchema = z.object({
  playMode: z.enum(['casual', 'ranked', 'worldcup']).default('casual'),
  matchType: z.enum(['single', 'series']).default('single'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  rank: z.enum(['Bronze 3', 'Bronze 2', 'Bronze 1', 'Silver 3', 'Silver 2', 'Silver 1', 'Gold 3', 'Gold 2', 'Gold 1', 'Platinum 3', 'Platinum 2', 'Platinum 1']).default('Bronze 3'),
  leagueId: z.string().optional(),
  winStreak: z.number().int().min(0).max(50).default(0),
  seriesId: z.string().uuid().optional(),
  seriesRound: z.number().int().min(0).max(3).default(1),
  seriesWins: z.number().int().min(0).max(2).default(0),
  seriesPlayed: z.number().int().min(0).max(2).default(0),
  excludeTeamIds: z.array(z.string()).max(10).default([]),
  mode: z.enum(['tutorial', 'single', 'series']).optional(),
});

const guessSchema = z.object({
  sessionId: z.string().uuid(),
  input: z.string().trim().min(1),
});

const finishSchema = z.object({
  sessionId: z.string().uuid(),
  reason: z.enum(['complete', 'surrender']).default('complete'),
});

const autoSolveSchema = z.object({
  sessionId: z.string().uuid(),
  playerId: z.string().min(1),
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

  router.post('/start', requireAuth, async (req, res) => {
    const payload = startSchema.parse(req.body);
    const matchType = (payload.mode && payload.mode !== 'tutorial' ? payload.mode : payload.matchType) as MatchType;
    const playMode = payload.playMode as PlayMode;
    const profile = await profileService.getProfile(req.user?.accessToken);
    if (playMode === 'ranked' && (!profile || profile.level < RANKED_UNLOCK_LEVEL)) {
      throw new HttpError(403, `Ranked wird ab Level ${RANKED_UNLOCK_LEVEL} freigeschaltet.`);
    }
    if (playMode === 'worldcup' && (!profile || profile.level < WORLD_CUP_UNLOCK_LEVEL)) {
      throw new HttpError(403, `WM-Modus wird ab Level ${WORLD_CUP_UNLOCK_LEVEL} freigeschaltet.`);
    }
    const rank = playMode === 'ranked'
      ? profile?.rank ?? payload.rank as Rank
      : payload.rank as Rank;
    const winStreak = playMode === 'ranked'
      ? profile?.winStreak ?? payload.winStreak
      : payload.winStreak;
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
    });
    const session = await sessionService.create(req.user?.id ?? 'dev-user', team, {
      playMode,
      matchType,
      difficulty,
      rank,
      winStreak,
      series: matchType === 'series'
        ? {
            seriesId: payload.seriesId,
            round: Math.max(1, payload.seriesRound),
            wins: payload.seriesWins,
            played: payload.seriesPlayed,
          }
        : undefined,
    });

    res.status(201).json({
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

  router.post('/guess', requireAuth, async (req, res) => {
    const payload = guessSchema.parse(req.body);
    const session = await sessionService.get(payload.sessionId, req.user?.id);
    if (!session) throw new HttpError(404, 'Session not found');

    const match = matchService.findMatch(payload.input, session);
    if (!match) {
      await sessionService.incrementWrong(payload.sessionId, req.user?.id);
      return res.json({ correct: false });
    }

    await sessionService.markSolved(payload.sessionId, req.user?.id, match.playerId);
    return res.json({ correct: true, matchedPlayerId: match.playerId, name: match.name });
  });

  router.post('/auto-solve', requireAuth, async (req, res) => {
    const payload = autoSolveSchema.parse(req.body);
    const session = await sessionService.get(payload.sessionId, req.user?.id);
    if (!session) throw new HttpError(404, 'Session not found');
    if (session.playMode !== 'ranked') throw new HttpError(400, 'Auto-Solve-Joker sind nur im Ranked-Modus nutzbar.');
    if (!session.players[payload.playerId] || session.players[payload.playerId].solved) {
      throw new HttpError(400, 'Diese Karte kann nicht automatisch gelöst werden.');
    }

    const profile = await profileService.consumeAutoSolveJoker(req.user?.accessToken);
    if (!profile) throw new HttpError(400, 'Kein Auto-Solve-Joker verfügbar.');
    const solved = await sessionService.autoSolve(payload.sessionId, req.user?.id, payload.playerId);
    if (!solved) throw new HttpError(400, 'Diese Karte kann nicht automatisch gelöst werden.');

    return res.json({
      solved,
      profile,
    });
  });

  router.post('/skip', requireAuth, async (req, res) => {
    const payload = skipSchema.parse(req.body);
    const session = await sessionService.get(payload.sessionId, req.user?.id);
    if (!session) throw new HttpError(404, 'Session not found');
    if (session.playMode !== 'ranked') throw new HttpError(400, 'Team-Skip-Schilde sind nur im Ranked-Modus nutzbar.');

    const profile = await profileService.consumeSkipShield(req.user?.accessToken);
    if (!profile) throw new HttpError(400, 'Kein Team-Skip-Schild verfügbar.');

    await sessionService.skip(payload.sessionId, req.user?.id);

    return res.json({
      skipped: true,
      profile,
    });
  });

  router.post('/finish', requireAuth, async (req, res) => {
    const payload = finishSchema.parse(req.body);
    const session = await sessionService.get(payload.sessionId, req.user?.id);
    if (!session) throw new HttpError(404, 'Session not found');

    const result = await sessionService.finish(payload.sessionId, req.user?.id, payload.reason);
    if (!result) throw new HttpError(404, 'Session not found');

    const profile = await profileService.persistMatch(req.user?.accessToken, {
      session,
      result: result.result,
      progression: result.progression,
    });

    res.json({
      ...result,
      profile,
    });
  });

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
      seasons: { from: difficulty === 'medium' ? 2010 : 2000, to: 2026 },
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
      seasons: { from: 2010, to: 2026 },
    };
  }

  if (difficulty === 'hard') {
    return {
      pool: 'mixed-leagues-nostalgia',
      seasons: { from: 2000, to: 2015 },
    };
  }

  return {
    pool: 'mixed-european-leagues',
    seasons: { from: 2010, to: 2026 },
  };
}
