import type { Difficulty, MatchType, PlayMode, Rank } from '../types';

const BRONZE_RANKS: Rank[] = ['Bronze 3', 'Bronze 2', 'Bronze 1'];
const SILVER_RANKS: Rank[] = ['Silver 3', 'Silver 2', 'Silver 1'];

export class ProgressionService {
  getDifficultyForRank(rank: Rank): Difficulty {
    if (BRONZE_RANKS.includes(rank)) return 'easy';
    if (SILVER_RANKS.includes(rank)) return 'medium';
    return 'hard';
  }

  calcXP(opts: { difficulty: Difficulty; solved: number; total: number; durationSec: number; isWin: boolean }): number {
    if (!opts.isWin) {
      return opts.difficulty === 'easy' ? 30 : opts.difficulty === 'medium' ? 50 : 80;
    }

    const base = opts.difficulty === 'easy' ? 100 : opts.difficulty === 'medium' ? 150 : 250;
    const perfectBonus = opts.solved === opts.total ? 50 : 0;
    const speedBonus = opts.durationSec < 120 ? 30 : 0;

    return base + perfectBonus + speedBonus;
  }

  calcLP(opts: { playMode: PlayMode; difficulty: Difficulty; matchType: MatchType; isWin: boolean }): number {
    if (opts.playMode === 'casual') return 0;

    const base = this.getRankedLpBase(opts.difficulty, opts.isWin);
    return opts.matchType === 'series' ? Math.trunc(base * 1.5) : base;
  }

  private getRankedLpBase(difficulty: Difficulty, isWin: boolean): number {
    if (difficulty === 'easy') return isWin ? 20 : -10;
    if (difficulty === 'medium') return isWin ? 20 : -15;
    return isWin ? 20 : -20;
  }
}
