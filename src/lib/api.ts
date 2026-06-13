import type { Difficulty, MatchResult, MatchType, PlayMode, Rank, Team } from '../types';
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function getAccessToken() {
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export interface StartGameResponse {
  sessionId: string;
  playMode: PlayMode;
  matchType: MatchType;
  difficulty: Difficulty;
  rank: Rank;
  winStreak: number;
  selection: {
    pool: string;
    leagueId?: string;
    seasons: { from: number; to: number };
  };
  team: Team;
}

export interface GuessResponse {
  correct: boolean;
  matchedPlayerId?: string;
  name?: string;
}

export interface FinishGameResponse {
  result: Pick<MatchResult, 'solved' | 'total' | 'durationSec' | 'isWin' | 'isPerfect' | 'completionRatio'>;
  progression: {
    xpGained: number;
    lpChange: number;
    newAchievements: string[];
  };
}

export interface PlayerSearchResponse {
  results: Array<{ name: string }>;
}

export function startGame(payload: {
  playMode: PlayMode;
  matchType: MatchType;
  difficulty?: Difficulty;
  rank?: Rank;
  leagueId?: string;
  winStreak?: number;
}) {
  return request<StartGameResponse>('/game/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitGuess(payload: { sessionId: string; input: string }) {
  return request<GuessResponse>('/game/guess', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function finishGame(payload: { sessionId: string; reason?: 'complete' | 'surrender' }) {
  return request<FinishGameResponse>('/game/finish', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function searchPlayers(query: string, limit = 7, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return request<PlayerSearchResponse>(`/players/search?${params.toString()}`, { signal });
}
