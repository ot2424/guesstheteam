import { beforeEach, describe, expect, it, vi } from 'vitest';
import { consumeDailyCasualSkip, DAILY_CASUAL_SKIP_LIMIT, getDailyCasualSkipsRemaining } from './dailyCasualSkips';
import { createMemoryLocalStorage } from './storageTestUtils';

describe('dailyCasualSkips', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T10:00:00'));
    vi.stubGlobal('window', { localStorage: createMemoryLocalStorage() });
  });

  it('allows exactly three free casual skips per day', () => {
    expect(getDailyCasualSkipsRemaining()).toBe(DAILY_CASUAL_SKIP_LIMIT);
    expect(consumeDailyCasualSkip()).toBe(true);
    expect(consumeDailyCasualSkip()).toBe(true);
    expect(consumeDailyCasualSkip()).toBe(true);
    expect(consumeDailyCasualSkip()).toBe(false);
    expect(getDailyCasualSkipsRemaining()).toBe(0);
  });

  it('resets the free skip counter on the next day', () => {
    expect(consumeDailyCasualSkip()).toBe(true);
    expect(getDailyCasualSkipsRemaining()).toBe(2);

    vi.setSystemTime(new Date('2026-06-25T10:00:00'));
    expect(getDailyCasualSkipsRemaining()).toBe(3);
  });

  it('recovers from broken localStorage data', () => {
    window.localStorage.setItem('footyguesser.casualFreeSkips.v1', 'not-json');
    expect(getDailyCasualSkipsRemaining()).toBe(3);
  });
});
