import { randomUUID } from 'node:crypto';
import type { Difficulty, GameMode, GameSession, PublicPlayer, TeamData } from '../types';

export class GameSessionService {
  private sessions = new Map<string, GameSession>();

  create(userId: string, team: TeamData, opts: { mode: GameMode; difficulty: Difficulty }): GameSession {
    const sessionId = randomUUID();
    const publicPlayers: PublicPlayer[] = team.players.map((player) => ({
      id: player.id,
      position: player.position,
      nationality: player.nationality,
      nationalityFlag: player.nationalityFlag,
      formationSlot: player.formationSlot,
      career: player.career,
    }));
    const session: GameSession = {
      sessionId,
      userId,
      mode: opts.mode,
      difficulty: opts.difficulty,
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

  finish(sessionId: string) {
    const session = this.get(sessionId);
    if (!session) return null;

    const solved = Object.values(session.players).filter((player) => player.solved).length;
    const total = Object.keys(session.players).length;
    const durationSec = Math.floor((Date.now() - session.startedAt) / 1000);
    const isWin = solved === total;

    return {
      result: {
        solved,
        total,
        durationSec,
        isWin,
      },
      progression: {
        xpGained: isWin ? 150 : 30,
        lpChange: isWin ? 25 : -20,
        newAchievements: durationSec < 60 && isWin ? ['speed_demon'] : [],
      },
    };
  }
}
