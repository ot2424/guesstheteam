import { describe, expect, it } from 'vitest';
import { ProgressionService } from './ProgressionService';

describe('ProgressionService', () => {
  const service = new ProgressionService();

  it('maps ranks to automatic ranked difficulty', () => {
    expect(service.getDifficultyForRank('Bronze 3')).toBe('easy');
    expect(service.getDifficultyForRank('Bronze 1')).toBe('easy');
    expect(service.getDifficultyForRank('Silver 2')).toBe('medium');
    expect(service.getDifficultyForRank('Gold 3')).toBe('hard');
    expect(service.getDifficultyForRank('Platinum 1')).toBe('hard');
  });

  it('awards no XP on losses or surrender outcomes', () => {
    expect(service.calcXP({ difficulty: 'hard', solved: 7, total: 11, durationSec: 80, isWin: false })).toBe(0);
  });

  it('awards base, accuracy, perfect and speed XP for wins', () => {
    expect(service.calcXP({ difficulty: 'easy', solved: 9, total: 11, durationSec: 200, isWin: true })).toBe(105);
    expect(service.calcXP({ difficulty: 'medium', solved: 11, total: 11, durationSec: 90, isWin: true })).toBe(305);
    expect(service.calcXP({ difficulty: 'hard', solved: 11, total: 11, durationSec: 130, isWin: true })).toBe(375);
  });

  it('keeps LP out of casual and world cup modes', () => {
    expect(service.calcLP({ playMode: 'casual', difficulty: 'hard', matchType: 'single', isWin: true })).toBe(0);
    expect(service.calcLP({ playMode: 'worldcup', difficulty: 'hard', matchType: 'single', isWin: true })).toBe(0);
  });

  it('calculates ranked LP loss and win values by difficulty', () => {
    expect(service.calcLP({ playMode: 'ranked', difficulty: 'easy', matchType: 'single', isWin: true })).toBe(14);
    expect(service.calcLP({ playMode: 'ranked', difficulty: 'easy', matchType: 'single', isWin: false })).toBe(-10);
    expect(service.calcLP({ playMode: 'ranked', difficulty: 'medium', matchType: 'single', isWin: true })).toBe(16);
    expect(service.calcLP({ playMode: 'ranked', difficulty: 'medium', matchType: 'single', isWin: false })).toBe(-14);
    expect(service.calcLP({ playMode: 'ranked', difficulty: 'hard', matchType: 'single', isWin: true })).toBe(18);
    expect(service.calcLP({ playMode: 'ranked', difficulty: 'hard', matchType: 'single', isWin: false })).toBe(-18);
  });

  it('adds persistent ranked streak bonuses and multiplies finished series LP', () => {
    expect(service.calcLP({ playMode: 'ranked', difficulty: 'medium', matchType: 'single', isWin: true, winStreak: 1 })).toBe(18);
    expect(service.calcLP({ playMode: 'ranked', difficulty: 'medium', matchType: 'single', isWin: true, winStreak: 2 })).toBe(20);
    expect(service.calcLP({ playMode: 'ranked', difficulty: 'medium', matchType: 'single', isWin: true, winStreak: 4 })).toBe(24);
    expect(service.calcLP({ playMode: 'ranked', difficulty: 'hard', matchType: 'series', isWin: true, winStreak: 2, isSeriesComplete: true })).toBe(33);
  });

  it('does not award LP while a 3er-series is still pending', () => {
    expect(service.calcLP({
      playMode: 'ranked',
      difficulty: 'easy',
      matchType: 'series',
      isWin: true,
      winStreak: 4,
      isSeriesComplete: false,
    })).toBe(0);
  });
});
