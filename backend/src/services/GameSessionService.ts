import { randomUUID } from 'node:crypto';
import type { Difficulty, GameSession, MatchType, PlayMode, PublicPlayer, Rank, TeamData } from '../types';
import { ProgressionService } from './ProgressionService';

export type FinishReason = 'complete' | 'surrender';
const WIN_THRESHOLD = 0.8;

export class GameSessionService {
  private sessions = new Map<string, GameSession>();
  private progressionService = new ProgressionService();

  create(userId: string, team: TeamData, opts: { playMode: PlayMode; matchType: MatchType; difficulty: Difficulty; rank: Rank }): GameSession {
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
      difficulty: opts.difficulty,
      rank: opts.rank,
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
      isWin,
    });

    return {
      result: {
        solved,
        total,
        durationSec,
        isWin,
        isPerfect: solved === total,
        completionRatio,
      },
      progression: {
        xpGained,
        lpChange,
        newAchievements: durationSec < 60 && isWin ? ['speed_demon'] : [],
      },
    };
  }
}
