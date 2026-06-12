import type { Difficulty, GameMode, MatchResult, Team } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export interface StartGameResponse {
  sessionId: string;
  team: Team;
}

export interface GuessResponse {
  correct: boolean;
  matchedPlayerId?: string;
  name?: string;
}

export interface FinishGameResponse {
  result: Pick<MatchResult, 'solved' | 'total' | 'durationSec' | 'isWin'>;
  progression: {
    xpGained: number;
    lpChange: number;
    newAchievements: string[];
  };
}

export function startGame(payload: { mode: GameMode; difficulty: Difficulty }) {
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

export function finishGame(payload: { sessionId: string }) {
  return request<FinishGameResponse>('/game/finish', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
