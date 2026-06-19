import type { Difficulty, GuessState, MatchType, PlayMode, Rank, Team } from '../types';

const STORAGE_KEY = 'footyguesser.activeGame.v1';

export interface SavedGame {
  sessionId: string;
  team: Team;
  guesses: Record<string, GuessState>;
  startedAt: number;
  playMode: PlayMode;
  matchType: MatchType;
  difficulty: Difficulty;
  rank: Rank;
  surrenderLpChange?: number;
  leagueId?: string;
  savedAt: number;
}

export function loadSavedGame(): SavedGame | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const value = JSON.parse(raw) as Partial<SavedGame>;
    if (!value.sessionId || !value.team || !value.guesses || !value.startedAt) return null;

    return value as SavedGame;
  } catch {
    return null;
  }
}

export function saveGame(game: SavedGame) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...game, savedAt: Date.now() }));
}

export function clearSavedGame() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function matchesSavedGame(
  saved: SavedGame,
  opts: { playMode: PlayMode; matchType: MatchType; difficulty: Difficulty; rank: Rank; leagueId?: string },
) {
  return saved.playMode === opts.playMode
    && saved.matchType === opts.matchType
    && (opts.playMode === 'ranked' || saved.difficulty === opts.difficulty)
    && saved.rank === opts.rank
    && (saved.leagueId ?? '') === (opts.leagueId ?? '');
}

export function getSavedGameUrl(saved: SavedGame) {
  const params = new URLSearchParams({
    playMode: saved.playMode,
    matchType: saved.matchType,
    difficulty: saved.difficulty,
    rank: saved.rank,
  });

  if (saved.leagueId) params.set('leagueId', saved.leagueId);
  return `/play?${params.toString()}`;
}
