import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSessionService } from './GameSessionService';
import type { InternalPlayer, TeamData } from '../types';

function player(index: number, name = `Player ${index}`): InternalPlayer {
  return {
    id: `p${index}`,
    name,
    position: index === 1 ? 'GK' : index < 6 ? 'CB' : index < 9 ? 'CM' : 'ST',
    nationality: 'Germany',
    nationalityFlag: '🇩🇪',
    formationSlot: index,
    career: [],
  };
}

function team(players = Array.from({ length: 11 }, (_, index) => player(index + 1))): TeamData {
  return {
    id: 'team-1',
    name: 'Test FC',
    season: '2024/2025',
    league: 'Bundesliga',
    logoUrl: 'https://example.com/logo.png',
    formation: '4-3-3',
    players,
  };
}

describe('GameSessionService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T12:00:00Z'));
  });

  it('creates public sessions without leaking player names on cards', async () => {
    const service = new GameSessionService();
    const session = await service.create('user-1', team([player(1, 'Manuel Neuer')]), {
      playMode: 'casual',
      matchType: 'single',
      difficulty: 'easy',
      rank: 'Bronze 3',
      winStreak: 0,
    });

    expect(session.team.players[0]).not.toHaveProperty('name');
    expect(session.players.p1.name).toBe('Manuel Neuer');
  });

  it('finishes a perfect casual game with XP, no LP and removes the session', async () => {
    const service = new GameSessionService();
    const session = await service.create('user-1', team(), {
      playMode: 'casual',
      matchType: 'single',
      difficulty: 'medium',
      rank: 'Bronze 3',
      winStreak: 0,
    });

    for (const id of Object.keys(session.players)) {
      await service.markSolved(session.sessionId, 'user-1', id);
    }

    vi.advanceTimersByTime(90_000);
    const finished = await service.finish(session.sessionId, 'user-1');

    expect(finished?.result).toMatchObject({ solved: 11, total: 11, isWin: true, isPerfect: true });
    expect(finished?.progression.xpGained).toBe(305);
    expect(finished?.progression.lpChange).toBe(0);
    expect(await service.get(session.sessionId, 'user-1')).toBeNull();
  });

  it('treats surrender as loss with no XP and ranked LP penalty', async () => {
    const service = new GameSessionService();
    const session = await service.create('user-1', team(), {
      playMode: 'ranked',
      matchType: 'single',
      difficulty: 'medium',
      rank: 'Silver 3',
      winStreak: 4,
    });

    for (const id of Object.keys(session.players).slice(0, 9)) {
      await service.markSolved(session.sessionId, 'user-1', id);
    }

    const finished = await service.finish(session.sessionId, 'user-1', 'surrender');

    expect(finished?.result.isWin).toBe(false);
    expect(finished?.progression.xpGained).toBe(0);
    expect(finished?.progression.lpChange).toBe(-14);
  });

  it('allows completing a team from four solved players with scaled rewards', async () => {
    const service = new GameSessionService();
    const session = await service.create('user-1', team(), {
      playMode: 'ranked',
      matchType: 'single',
      difficulty: 'easy',
      rank: 'Bronze 3',
      winStreak: 0,
    });

    for (const id of Object.keys(session.players).slice(0, 4)) {
      await service.markSolved(session.sessionId, 'user-1', id);
    }

    vi.advanceTimersByTime(150_000);
    const finished = await service.finish(session.sessionId, 'user-1');

    expect(finished?.result).toMatchObject({ solved: 4, total: 11, isWin: true, isPerfect: false });
    expect(finished?.progression.xpGained).toBe(36);
    expect(finished?.progression.lpChange).toBe(5);
  });

  it('does not complete below four solved players', async () => {
    const service = new GameSessionService();
    const session = await service.create('user-1', team(), {
      playMode: 'ranked',
      matchType: 'single',
      difficulty: 'easy',
      rank: 'Bronze 3',
      winStreak: 0,
    });

    for (const id of Object.keys(session.players).slice(0, 3)) {
      await service.markSolved(session.sessionId, 'user-1', id);
    }

    const finished = await service.finish(session.sessionId, 'user-1');

    expect(finished?.result.isWin).toBe(false);
    expect(finished?.progression.xpGained).toBe(0);
    expect(finished?.progression.lpChange).toBe(-10);
  });

  it('keeps 3er-series LP pending until the series is decided', async () => {
    const service = new GameSessionService();
    const firstRound = await service.create('user-1', team(), {
      playMode: 'ranked',
      matchType: 'series',
      difficulty: 'easy',
      rank: 'Bronze 2',
      winStreak: 2,
      series: { seriesId: 'series-1', round: 1, wins: 0, played: 0 },
    });

    for (const id of Object.keys(firstRound.players).slice(0, 9)) {
      await service.markSolved(firstRound.sessionId, 'user-1', id);
    }

    const pending = await service.finish(firstRound.sessionId, 'user-1');

    expect(pending?.result.series).toMatchObject({ played: 1, wins: 1, isComplete: false });
    expect(pending?.progression.lpChange).toBe(0);

    const secondRound = await service.create('user-1', team(), {
      playMode: 'ranked',
      matchType: 'series',
      difficulty: 'easy',
      rank: 'Bronze 2',
      winStreak: 2,
      series: { seriesId: 'series-1', round: 2, wins: 1, played: 1 },
    });

    for (const id of Object.keys(secondRound.players).slice(0, 9)) {
      await service.markSolved(secondRound.sessionId, 'user-1', id);
    }

    const complete = await service.finish(secondRound.sessionId, 'user-1');

    expect(complete?.result.series).toMatchObject({ played: 2, wins: 2, isComplete: true, isWin: true });
    expect(complete?.progression.lpChange).toBe(22);
  });

  it('increments wrong attempts only on unsolved players', async () => {
    const service = new GameSessionService();
    const session = await service.create('user-1', team([player(1), player(2)]), {
      playMode: 'casual',
      matchType: 'single',
      difficulty: 'easy',
      rank: 'Bronze 3',
      winStreak: 0,
    });

    await service.markSolved(session.sessionId, 'user-1', 'p1');
    await service.incrementWrong(session.sessionId, 'user-1');

    const updated = await service.get(session.sessionId, 'user-1');
    expect(updated?.players.p1.wrongAttempts).toBe(0);
    expect(updated?.players.p2.wrongAttempts).toBe(1);
  });
});
