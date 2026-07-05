import { describe, expect, it } from 'vitest';
import { getRankedSurrenderLpChange, ONLINE_UNLOCK_LEVEL, RANKED_UNLOCK_LEVEL, WORLD_CUP_UNLOCK_LEVEL } from './progression';

describe('frontend progression helpers', () => {
  it('keeps unlock levels explicit for menus and guards', () => {
    expect(RANKED_UNLOCK_LEVEL).toBe(5);
    expect(WORLD_CUP_UNLOCK_LEVEL).toBe(10);
    expect(ONLINE_UNLOCK_LEVEL).toBe(25);
  });

  it('shows the same ranked surrender LP preview as the single-match penalty rules', () => {
    expect(getRankedSurrenderLpChange('easy', 'single')).toBe(-10);
    expect(getRankedSurrenderLpChange('medium', 'single')).toBe(-14);
    expect(getRankedSurrenderLpChange('hard', 'single')).toBe(-18);
    expect(getRankedSurrenderLpChange('hard', 'series')).toBe(0);
  });
});
