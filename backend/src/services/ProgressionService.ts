import type { Difficulty, MatchType, PlayMode, Rank } from '../types';

const BRONZE_RANKS: Rank[] = ['Bronze 3', 'Bronze 2', 'Bronze 1'];
const SILVER_RANKS: Rank[] = ['Silver 3', 'Silver 2', 'Silver 1'];
export const MIN_SOLVED_TO_COMPLETE = 4;
const BONUS_THRESHOLD = 0.8;
export const RANKED_UNLOCK_LEVEL = 5;
export const WORLD_CUP_UNLOCK_LEVEL = 10;
export const ONLINE_UNLOCK_LEVEL = 25;

export class ProgressionService {
  getDifficultyForRank(rank: Rank): Difficulty {
    if (BRONZE_RANKS.includes(rank)) return 'easy';
    if (SILVER_RANKS.includes(rank)) return 'medium';
    return 'hard';
  }

  calcXP(opts: { difficulty: Difficulty; solved: number; total: number; durationSec: number; isWin: boolean }): number {
    const solvedRatio = opts.total > 0 ? opts.solved / opts.total : 0;

    if (!opts.isWin) {
      return 0;
    }

    const base = opts.difficulty === 'easy' ? 100 : opts.difficulty === 'medium' ? 150 : 250;
    const scaledBase = Math.round(base * solvedRatio);
    const solvedBonus = Math.round(Math.max(0, solvedRatio - BONUS_THRESHOLD) * 250);
    const perfectBonus = opts.solved === opts.total ? 75 : 0;
    const speedBonus = opts.durationSec < 120 ? Math.round(30 * solvedRatio) : 0;

    return scaledBase + solvedBonus + perfectBonus + speedBonus;
  }

  calcLP(opts: { playMode: PlayMode; difficulty: Difficulty; matchType: MatchType; isWin: boolean; winStreak?: number; isSeriesComplete?: boolean; solved?: number; total?: number }): number {
    if (opts.playMode !== 'ranked') return 0;
    if (opts.matchType === 'series' && opts.isSeriesComplete === false) return 0;

    const base = this.getRankedLpBase(opts.difficulty, opts.isWin);
    const streakBonus = opts.isWin ? this.getWinStreakBonus((opts.winStreak ?? 0) + 1) : 0;
    const solvedRatio = opts.total && opts.total > 0 && opts.solved !== undefined
      ? Math.max(0, Math.min(1, opts.solved / opts.total))
      : 1;
    const total = opts.isWin
      ? Math.round((base + streakBonus) * solvedRatio)
      : base;
    return opts.matchType === 'series' ? Math.trunc(total * 1.5) : total;
  }

  private getRankedLpBase(difficulty: Difficulty, isWin: boolean): number {
    if (difficulty === 'easy') return isWin ? 14 : -10;
    if (difficulty === 'medium') return isWin ? 16 : -14;
    return isWin ? 18 : -18;
  }

  private getWinStreakBonus(nextWinStreak: number): number {
    if (nextWinStreak >= 5) return 8;
    if (nextWinStreak === 4) return 6;
    if (nextWinStreak === 3) return 4;
    if (nextWinStreak === 2) return 2;
    return 0;
  }
}
