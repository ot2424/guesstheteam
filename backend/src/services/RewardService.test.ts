import { describe, expect, it } from 'vitest';
import { getInventoryRewardDelta, getPrestigeVisual, getUnlockedRewards } from './RewardService';

describe('RewardService', () => {
  it('unlocks cosmetic and item rewards by level milestones', () => {
    expect(getUnlockedRewards(1).map((reward) => reward.id)).toEqual(['title-kreisliga-legende']);
    expect(getUnlockedRewards(5).map((reward) => reward.id)).toContain('pack-shield-1');
    expect(getUnlockedRewards(10).map((reward) => reward.id)).toContain('banner-night-pitch');
    expect(getUnlockedRewards(25).map((reward) => reward.id)).toContain('pack-joker-1');
  });

  it('grants only newly crossed inventory milestone items', () => {
    expect(getInventoryRewardDelta(1, 4)).toEqual({ skipShields: 0, autoSolveJokers: 0 });
    expect(getInventoryRewardDelta(4, 5)).toEqual({ skipShields: 1, autoSolveJokers: 0 });
    expect(getInventoryRewardDelta(14, 25)).toEqual({ skipShields: 2, autoSolveJokers: 1 });
  });

  it('maps LP rank prestige visuals', () => {
    expect(getPrestigeVisual('Bronze 2')).toEqual({ emblem: 'bronze', nameGlow: null });
    expect(getPrestigeVisual('Silver 1')).toEqual({ emblem: 'silver', nameGlow: null });
    expect(getPrestigeVisual('Gold 3')).toEqual({ emblem: 'gold-winged', nameGlow: '#f5d142' });
    expect(getPrestigeVisual('Platinum 1')).toEqual({ emblem: 'platinum-storm', nameGlow: '#67d6c9' });
  });
});
