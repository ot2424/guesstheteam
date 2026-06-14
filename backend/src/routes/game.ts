import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { GameSessionService } from '../services/GameSessionService';
import { PlayerMatchService } from '../services/PlayerMatchService';
import { ProfileService } from '../services/ProfileService';
import { ProgressionService } from '../services/ProgressionService';
import { TeamSeedService } from '../services/TeamSeedService';
import type { Difficulty, MatchType, PlayMode, Rank } from '../types';

const startSchema = z.object({
  playMode: z.enum(['casual', 'ranked']).default('casual'),
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
    const rank = playMode === 'ranked'
      ? profile?.rank ?? payload.rank as Rank
      : payload.rank as Rank;
    const winStreak = playMode === 'ranked'
      ? profile?.winStreak ?? payload.winStreak
      : payload.winStreak;
    const difficulty = playMode === 'ranked'
      ? progressionService.getDifficultyForRank(rank)
      : payload.difficulty ?? 'easy';
    const team = teamSeedService.selectTeam({
      playMode,
      difficulty,
      leagueId: payload.leagueId,
      excludeTeamIds: payload.excludeTeamIds,
    });
    const session = sessionService.create(req.user?.id ?? 'dev-user', team, {
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
      series: session.series,
      selection: getSelectionDescriptor(session.playMode, session.difficulty, payload.leagueId),
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

  router.post('/finish', requireAuth, async (req, res) => {
    const payload = finishSchema.parse(req.body);
    const session = sessionService.get(payload.sessionId);
    if (!session) throw new HttpError(404, 'Session not found');

    const result = sessionService.finish(payload.sessionId, payload.reason);
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
