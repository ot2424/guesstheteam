import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSavedGame, getSavedGameUrl, loadSavedGame, matchesSavedGame, saveGame, type SavedGame } from './savedGame';
import { createMemoryLocalStorage } from './storageTestUtils';

function savedGame(overrides: Partial<SavedGame> = {}): SavedGame {
  return {
    sessionId: 'session-1',
    team: {
      id: 'team-1',
      name: 'Bayern Munich',
      season: '2020/2021',
      league: 'Bundesliga',
      logoUrl: '',
      formation: '4-2-3-1',
      players: [],
    },
    guesses: {},
    startedAt: 1_000,
    playMode: 'casual',
    matchType: 'single',
    difficulty: 'easy',
    rank: 'Bronze 3',
    savedAt: 1_500,
    ...overrides,
  };
}

describe('savedGame', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: createMemoryLocalStorage() });
  });

  it('saves, loads and clears active browser games', () => {
    saveGame(savedGame({ sessionId: 'abc' }));
    expect(loadSavedGame()?.sessionId).toBe('abc');

    clearSavedGame();
    expect(loadSavedGame()).toBeNull();
  });

  it('ignores corrupt or incomplete saved data', () => {
    window.localStorage.setItem('footyguesser.activeGame.v1', '{');
    expect(loadSavedGame()).toBeNull();

    window.localStorage.setItem('footyguesser.activeGame.v1', JSON.stringify({ sessionId: 'abc' }));
    expect(loadSavedGame()).toBeNull();
  });

  it('matches saved games by mode, match type, rank and league', () => {
    const saved = savedGame({ playMode: 'casual', difficulty: 'medium', rank: 'Silver 3', leagueId: 'L1' });

    expect(matchesSavedGame(saved, { playMode: 'casual', matchType: 'single', difficulty: 'medium', rank: 'Silver 3', leagueId: 'L1' })).toBe(true);
    expect(matchesSavedGame(saved, { playMode: 'casual', matchType: 'single', difficulty: 'hard', rank: 'Silver 3', leagueId: 'L1' })).toBe(false);
    expect(matchesSavedGame(saved, { playMode: 'casual', matchType: 'series', difficulty: 'medium', rank: 'Silver 3', leagueId: 'L1' })).toBe(false);
    expect(matchesSavedGame(saved, { playMode: 'casual', matchType: 'single', difficulty: 'medium', rank: 'Silver 3', leagueId: 'GB1' })).toBe(false);
  });

  it('allows ranked resume independent from selected difficulty because rank controls difficulty', () => {
    const saved = savedGame({ playMode: 'ranked', difficulty: 'easy', rank: 'Gold 3' });

    expect(matchesSavedGame(saved, { playMode: 'ranked', matchType: 'single', difficulty: 'hard', rank: 'Gold 3' })).toBe(true);
    expect(matchesSavedGame(saved, { playMode: 'ranked', matchType: 'single', difficulty: 'hard', rank: 'Gold 2' })).toBe(false);
  });

  it('builds resume URLs with the original game options', () => {
    expect(getSavedGameUrl(savedGame({ playMode: 'worldcup', matchType: 'series', difficulty: 'medium', rank: 'Bronze 1', leagueId: 'WM' })))
      .toBe('/play?playMode=worldcup&matchType=series&difficulty=medium&rank=Bronze+1&leagueId=WM');
  });
});
