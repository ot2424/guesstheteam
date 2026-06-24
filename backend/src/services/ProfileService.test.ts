import { describe, expect, it } from 'vitest';
import { applyProgress, getLevelFromXP, getRankFromLP, type PublicProfile } from './ProfileService';

function profile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    id: 'user-1',
    username: 'tester',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    xp: 0,
    level: 1,
    lp: 0,
    rank: 'Bronze 3',
    badges: [],
    matchesPlayed: 0,
    matchesWon: 0,
    winStreak: 0,
    inventory: { skipShields: 0, autoSolveJokers: 0 },
    unlockedRewards: [],
    prestige: { emblem: 'bronze', nameGlow: null },
    ...overrides,
  };
}

describe('ProfileService progression helpers', () => {
  it('derives level from lifetime XP without spending XP', () => {
    expect(getLevelFromXP(0)).toBe(1);
    expect(getLevelFromXP(499)).toBe(1);
    expect(getLevelFromXP(500)).toBe(2);
    expect(getLevelFromXP(2500)).toBe(6);
  });

  it('uses longer LP rank steps for higher ranks', () => {
    expect(getRankFromLP(0)).toBe('Bronze 3');
    expect(getRankFromLP(180)).toBe('Bronze 2');
    expect(getRankFromLP(540)).toBe('Silver 3');
    expect(getRankFromLP(1260)).toBe('Gold 3');
    expect(getRankFromLP(2220)).toBe('Platinum 3');
  });

  it('applies casual XP, level rewards and match counters without changing LP', () => {
    const next = applyProgress(
      profile({ xp: 2300, level: 5, lp: 250, rank: 'Bronze 2', inventory: { skipShields: 1, autoSolveJokers: 0 } }),
      'casual',
      'single',
      { isWin: true },
      { xpGained: 300, lpChange: 999 },
    );

    expect(next.xp).toBe(2600);
    expect(next.level).toBe(6);
    expect(next.lp).toBe(250);
    expect(next.rank).toBe('Bronze 2');
    expect(next.matchesPlayed).toBe(1);
    expect(next.matchesWon).toBe(1);
    expect(next.inventory).toEqual({ skipShields: 1, autoSolveJokers: 0 });
  });

  it('grants milestone inventory when XP crosses item levels', () => {
    const next = applyProgress(
      profile({ xp: 1900, level: 4 }),
      'casual',
      'single',
      { isWin: true },
      { xpGained: 700, lpChange: 0 },
    );

    expect(next.level).toBe(6);
    expect(next.inventory.skipShields).toBe(1);
    expect(next.unlockedRewards.map((reward) => reward.id)).toContain('pack-shield-1');
  });

  it('applies ranked LP, rank changes and streak reset on losses', () => {
    const win = applyProgress(
      profile({ lp: 170, rank: 'Bronze 3', winStreak: 1 }),
      'ranked',
      'single',
      { isWin: true },
      { xpGained: 100, lpChange: 20 },
    );

    expect(win.lp).toBe(190);
    expect(win.rank).toBe('Bronze 2');
    expect(win.winStreak).toBe(2);

    const loss = applyProgress(
      win,
      'ranked',
      'single',
      { isWin: false },
      { xpGained: 0, lpChange: -999 },
    );

    expect(loss.lp).toBe(0);
    expect(loss.rank).toBe('Bronze 3');
    expect(loss.winStreak).toBe(0);
  });

  it('keeps ranked streak unchanged while a series is not complete', () => {
    const next = applyProgress(
      profile({ winStreak: 3, lp: 800, rank: 'Silver 2' }),
      'ranked',
      'series',
      { isWin: true, series: { isComplete: false, isWin: false } },
      { xpGained: 100, lpChange: 0 },
    );

    expect(next.winStreak).toBe(3);
    expect(next.lp).toBe(800);
    expect(next.matchesWon).toBe(1);
  });
});
