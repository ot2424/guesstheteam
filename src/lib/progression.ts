import type { Difficulty, MatchType } from '../types';

export const RANKED_UNLOCK_LEVEL = 5;
export const WORLD_CUP_UNLOCK_LEVEL = 10;

export function getRankedSurrenderLpChange(difficulty: Difficulty, matchType: MatchType) {
  const base = difficulty === 'easy' ? -10 : difficulty === 'medium' ? -14 : -18;
  return matchType === 'series' ? 0 : base;
}
