import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import type { Difficulty, GameSession, MatchType, PlayMode, PublicPlayer, Rank, TeamData } from '../types';
import { MIN_SOLVED_TO_COMPLETE, ProgressionService } from './ProgressionService';

export type FinishReason = 'complete' | 'surrender';

type ActiveGameSessionRow = {
  session: GameSession;
};

export class GameSessionService {
  private sessions = new Map<string, GameSession>();
  private progressionService = new ProgressionService();

  async create(userId: string, team: TeamData, opts: {
    playMode: PlayMode;
    matchType: MatchType;
    difficulty: Difficulty;
    rank: Rank;
    winStreak: number;
    series?: { seriesId?: string; round: number; wins: number; played: number };
  }): Promise<GameSession> {
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

    await this.persist(session);
    return session;
  }

  async get(sessionId: string, userId?: string): Promise<GameSession | null> {
    const supabase = createSessionClient();
    if (!supabase) return this.sessions.get(sessionId) ?? null;

    const { data, error } = await supabase
      .from('active_game_sessions')
      .select('session')
      .eq('id', sessionId)
      .eq('user_id', userId ?? '')
      .maybeSingle<ActiveGameSessionRow>();

    if (error || !data) return null;
    return data.session;
  }

  async markSolved(sessionId: string, userId: string | undefined, playerId: string): Promise<void> {
    const session = await this.get(sessionId, userId);
    const player = session?.players[playerId];
    if (!player) return;
    player.solved = true;
    await this.persist(session);
  }

  async autoSolve(sessionId: string, userId: string | undefined, playerId: string): Promise<{ playerId: string; name: string } | null> {
    const session = await this.get(sessionId, userId);
    const player = session?.players[playerId];
    if (!player || player.solved) return null;

    player.solved = true;
    await this.persist(session);
    return { playerId, name: player.name };
  }

  async skip(sessionId: string, userId?: string): Promise<boolean> {
    const supabase = createSessionClient();
    if (supabase) {
      const { error } = await supabase
        .from('active_game_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId ?? '');

      return !error;
    }

    return this.sessions.delete(sessionId);
  }

  async incrementWrong(sessionId: string, userId?: string): Promise<void> {
    const session = await this.get(sessionId, userId);
    if (!session) return;

    for (const player of Object.values(session.players)) {
      if (!player.solved) {
        player.wrongAttempts += 1;
      }
    }

    await this.persist(session);
  }

  async finish(sessionId: string, userId: string | undefined, reason: FinishReason = 'complete') {
    const session = await this.get(sessionId, userId);
    if (!session) return null;

    const solved = Object.values(session.players).filter((player) => player.solved).length;
    const total = Object.keys(session.players).length;
    const durationSec = Math.floor((Date.now() - session.startedAt) / 1000);
    const completionRatio = total > 0 ? solved / total : 0;
    const minimumSolved = Math.min(MIN_SOLVED_TO_COMPLETE, total);
    const isWin = reason !== 'surrender' && solved >= minimumSolved;
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
      solved,
      total,
    });

    const finished = {
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

    await this.skip(sessionId, userId);
    return finished;
  }

  private async persist(session: GameSession): Promise<void> {
    const supabase = createSessionClient();
    if (!supabase) {
      this.sessions.set(session.sessionId, session);
      return;
    }

    const { error } = await supabase
      .from('active_game_sessions')
      .upsert({
        id: session.sessionId,
        user_id: session.userId,
        session,
      }, { onConflict: 'id' });

    if (error) {
      this.sessions.set(session.sessionId, session);
    }
  }
}

function createSessionClient(): SupabaseClient | null {
  if (env.NODE_ENV === 'test') return null;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
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
