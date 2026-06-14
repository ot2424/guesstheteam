import { randomUUID } from 'node:crypto';
import type { Difficulty, GameSession, MatchType, PlayMode, PublicPlayer, Rank, TeamData } from '../types';
import { ProgressionService } from './ProgressionService';

export type FinishReason = 'complete' | 'surrender';
const WIN_THRESHOLD = 0.8;

export class GameSessionService {
  private sessions = new Map<string, GameSession>();
  private progressionService = new ProgressionService();

  create(userId: string, team: TeamData, opts: {
    playMode: PlayMode;
    matchType: MatchType;
    difficulty: Difficulty;
    rank: Rank;
    winStreak: number;
    series?: { seriesId?: string; round: number; wins: number; played: number };
  }): GameSession {
    const sessionId = randomUUID();
    const publicPlayers: PublicPlayer[] = team.players.map((player) => ({
      id: player.id,
      position: player.position,
      nationality: player.nationality,
      nationality2: player.nationality2,
      nationalityFlag: player.nationalityFlag,
      formationSlot: player.formationSlot,
      career: player.career,
    }));
    const session: GameSession = {
      sessionId,
      userId,
      playMode: opts.playMode,
      matchType: opts.matchType,
      series: opts.matchType === 'series'
        ? {
            seriesId: opts.series?.seriesId ?? randomUUID(),
            round: opts.series?.round ?? 1,
            wins: opts.series?.wins ?? 0,
            played: opts.series?.played ?? 0,
            total: 3,
            neededWins: 2,
          }
        : undefined,
      difficulty: opts.difficulty,
      rank: opts.rank,
      winStreak: opts.winStreak,
      startedAt: Date.now(),
      team: {
        id: team.id,
        name: team.name,
        season: team.season,
        league: team.league,
        logoUrl: team.logoUrl,
        formation: team.formation,
        players: publicPlayers,
      },
      players: Object.fromEntries(
        team.players.map((player) => [
          player.id,
          { name: player.name, solved: false, wrongAttempts: 0 },
        ]),
      ),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  get(sessionId: string): GameSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  markSolved(sessionId: string, playerId: string): void {
    const session = this.get(sessionId);
    const player = session?.players[playerId];
    if (!player) return;
    player.solved = true;
  }

  incrementWrong(sessionId: string): void {
    const session = this.get(sessionId);
    if (!session) return;

    for (const player of Object.values(session.players)) {
      if (!player.solved) {
        player.wrongAttempts += 1;
      }
    }
  }

  finish(sessionId: string, reason: FinishReason = 'complete') {
    const session = this.get(sessionId);
    if (!session) return null;

    const solved = Object.values(session.players).filter((player) => player.solved).length;
    const total = Object.keys(session.players).length;
    const durationSec = Math.floor((Date.now() - session.startedAt) / 1000);
    const completionRatio = total > 0 ? solved / total : 0;
    const isWin = reason !== 'surrender' && completionRatio >= WIN_THRESHOLD;
    const series = session.series
      ? getNextSeriesState(session.series, isWin)
      : undefined;
    const rankedOutcome = series
      ? (series.isComplete ? series.isWin : null)
      : isWin;
    const xpGained = this.progressionService.calcXP({
      difficulty: session.difficulty,
      solved,
      total,
      durationSec,
      isWin,
    });
    const lpChange = this.progressionService.calcLP({
      playMode: session.playMode,
      difficulty: session.difficulty,
      matchType: session.matchType,
      isWin: rankedOutcome ?? false,
      winStreak: session.winStreak,
      isSeriesComplete: series?.isComplete ?? true,
    });

    return {
      result: {
        solved,
        total,
        durationSec,
        isWin,
        isPerfect: solved === total,
        completionRatio,
        series,
      },
      progression: {
        xpGained,
        lpChange,
        newAchievements: durationSec < 60 && isWin ? ['speed_demon'] : [],
      },
    };
  }
}

function getNextSeriesState(
  current: NonNullable<GameSession['series']>,
  currentTeamWin: boolean,
) {
  const played = current.played + 1;
  const wins = current.wins + (currentTeamWin ? 1 : 0);
  const remaining = current.total - played;
  const isComplete = played >= current.total
    || wins >= current.neededWins
    || wins + remaining < current.neededWins;

  return {
    seriesId: current.seriesId,
    round: current.round,
    played,
    wins,
    total: current.total,
    neededWins: current.neededWins,
    isComplete,
    isWin: isComplete ? wins >= current.neededWins : false,
  };
}
