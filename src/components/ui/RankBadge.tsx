import { getRankTier, RANK_COLORS } from '../../data/mockUser';
import type { Rank } from '../../types';

interface Props {
  rank: Rank;
  size?: 'sm' | 'md' | 'lg';
}

export function RankBadge({ rank, size = 'md' }: Props) {
  const tier = getRankTier(rank);
  const colors = RANK_COLORS[tier];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-lg px-4 py-1.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`bebas tracking-wider rounded ${sizeClass} border`}
      style={{ color: colors.text, background: colors.bg, borderColor: colors.border }}
    >
      {rank}
    </span>
  );
}
