import { describe, expect, it } from 'vitest';
import { getInventoryRewardDelta, getPrestigeVisual, getUnlockedRewards } from './rewards';

describe('frontend rewards helpers', () => {
  it('mirrors XP milestone rewards for the profile UI', () => {
    expect(getUnlockedRewards(10).map((reward) => reward.id)).toEqual([
      'title-kreisliga-legende',
      'frame-green-rookie',
      'pack-shield-1',
      'banner-night-pitch',
    ]);
  });

  it('calculates newly earned inventory packs', () => {
    expect(getInventoryRewardDelta(4, 15)).toEqual({ skipShields: 3, autoSolveJokers: 0 });
    expect(getInventoryRewardDelta(24, 25)).toEqual({ skipShields: 0, autoSolveJokers: 1 });
  });

  it('shows name glow only for prestige ranks', () => {
    expect(getPrestigeVisual('Bronze 1').nameGlow).toBeNull();
    expect(getPrestigeVisual('Gold 1')).toEqual({ emblem: 'gold-winged', nameGlow: '#f5d142' });
    expect(getPrestigeVisual('Platinum 2')).toEqual({ emblem: 'platinum-storm', nameGlow: '#67d6c9' });
  });
});
