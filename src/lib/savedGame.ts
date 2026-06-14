import type { Difficulty, GuessState, MatchType, PlayMode, Rank, SeriesProgress, Team } from '../types';

const STORAGE_KEY = 'guesstheteam.activeGame.v1';
const LEGACY_STORAGE_KEY = 'footyguesser.activeGame.v1';

export interface SavedGame {
  userId?: string;
  sessionId: string;
  team: Team;
  guesses: Record<string, GuessState>;
  startedAt: number;
  playMode: PlayMode;
  matchType: MatchType;
  series?: SeriesProgress;
  difficulty: Difficulty;
  rank: Rank;
  winStreak: number;
  leagueId?: string;
  savedAt: number;
}

export function loadSavedGame(): SavedGame | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;

    const value = JSON.parse(raw) as Partial<SavedGame>;
    if (!value.sessionId || !value.team || !value.guesses || !value.startedAt) return null;

    return { ...value, winStreak: value.winStreak ?? 0 } as SavedGame;
  } catch {
    return null;
  }
}

export function saveGame(game: SavedGame) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...game, savedAt: Date.now() }));
}

export function clearSavedGame() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function matchesSavedGame(
  saved: SavedGame,
  opts: { userId: string; playMode: PlayMode; matchType: MatchType; seriesId?: string; difficulty: Difficulty; rank: Rank; winStreak: number; leagueId?: string },
) {
  return saved.userId === opts.userId
    && saved.playMode === opts.playMode
    && saved.matchType === opts.matchType
    && (saved.series?.seriesId ?? '') === (opts.seriesId ?? '')
    && saved.difficulty === opts.difficulty
    && saved.rank === opts.rank
    && saved.winStreak === opts.winStreak
    && (saved.leagueId ?? '') === (opts.leagueId ?? '');
}

export function getSavedGameUrl(saved: SavedGame) {
  const params = new URLSearchParams({
    playMode: saved.playMode,
    matchType: saved.matchType,
    difficulty: saved.difficulty,
    rank: saved.rank,
    winStreak: String(saved.winStreak),
  });

  if (saved.leagueId) params.set('leagueId', saved.leagueId);
  if (saved.series) {
    params.set('seriesId', saved.series.seriesId);
    params.set('seriesRound', String(saved.series.round));
    params.set('seriesWins', String(saved.series.wins));
    params.set('seriesPlayed', String(saved.series.played));
  }
  return `/play?${params.toString()}`;
}
