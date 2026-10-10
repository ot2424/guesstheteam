import { randomUUID } from 'node:crypto';
import { query } from '../db/pool';
import { env } from '../config/env';
import type { Difficulty, GameSession, MatchType, PlayMode, PublicPlayer, Rank, TeamData } from '../types';
import { ProgressionService } from './ProgressionService';
import { getMinimumSolved, getTimeXpMultiplier } from '../../../shared/gameRules';

export type FinishReason = 'complete' | 'surrender';

type ActiveGameSessionRow = {
  session: GameSession;
};

export class GameSessionService {
  private sessions = new Map<string, GameSession>();
  private progressionService = new ProgressionService();

  async create(userId: string, team: TeamData, opts: {
    leagueId?: string;
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
      leagueId: opts.leagueId,
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
    if (env.NODE_ENV === 'test') {
      const session = this.sessions.get(sessionId);
      return session && (!userId || session.userId === userId) ? session : null;
    }
    const [row] = await query<ActiveGameSessionRow>('SELECT session FROM active_game_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
    return row?.session ?? null;
  }

  async markSolved(sessionId: string, userId: string | undefined, playerId: string): Promise<void> {
    if (env.NODE_ENV !== 'test') {
      await query("UPDATE active_game_sessions SET session=jsonb_set(session, ARRAY['players',$3,'solved'], 'true'::jsonb) WHERE id=$1 AND user_id=$2 AND session->'players'->$3 IS NOT NULL", [sessionId, userId, playerId]);
      return;
    }
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

    await this.markSolved(sessionId, userId, playerId);
    return { playerId, name: player.name };
  }

  async skip(sessionId: string, userId?: string): Promise<boolean> {
    if (env.NODE_ENV === 'test') {
      if (!await this.get(sessionId, userId)) return false;
      return this.sessions.delete(sessionId);
    }
    const rows = await query('DELETE FROM active_game_sessions WHERE id = $1 AND user_id = $2 RETURNING id', [sessionId, userId]);
    return rows.length > 0;
  }

  async incrementWrong(sessionId: string, userId?: string): Promise<void> {
    if (env.NODE_ENV !== 'test') {
      await query(`UPDATE active_game_sessions SET session=jsonb_set(session, '{players}',
        (SELECT jsonb_object_agg(key, CASE WHEN (value->>'solved')::boolean THEN value
          ELSE jsonb_set(value, '{wrongAttempts}', to_jsonb((value->>'wrongAttempts')::int+1)) END)
         FROM jsonb_each(session->'players'))) WHERE id=$1 AND user_id=$2`, [sessionId, userId]);
      return;
    }
    const session = await this.get(sessionId, userId);
    if (!session) return;

    for (const player of Object.values(session.players)) {
      if (!player.solved) {
        player.wrongAttempts += 1;
      }
    }

    await this.persist(session);
  }

  async finish(sessionId: string, userId: string | undefined, reason: FinishReason = 'complete', removeSession = true) {
    const session = await this.get(sessionId, userId);
    if (!session) return null;

    const solved = Object.values(session.players).filter((player) => player.solved).length;
    const total = Object.keys(session.players).length;
    const durationSec = Math.floor((Date.now() - session.startedAt) / 1000);
    const completionRatio = total > 0 ? solved / total : 0;
    const minimumSolved = getMinimumSolved(session.difficulty, total);
    const isWin = reason !== 'surrender' && total > 0 && solved >= minimumSolved;
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
        xpTimeMultiplier: getTimeXpMultiplier(durationSec),
        xpGained,
        lpChange,
        newAchievements: durationSec < 60 && isWin ? ['speed_demon'] : [],
      },
    };

    if (removeSession) await this.skip(sessionId, userId);
    return finished;
  }

  private async persist(session: GameSession): Promise<void> {
    if (env.NODE_ENV === 'test') { this.sessions.set(session.sessionId, session); return; }
    await query('INSERT INTO active_game_sessions(id, user_id, session) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET session = EXCLUDED.session', [session.sessionId, session.userId, JSON.stringify(session)]);
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
