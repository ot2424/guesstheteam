import { ApiError, ConnectionError } from './apiErrors';
import type { Difficulty, FriendRequestSummary, MatchHistoryItem, MatchResult, MatchType, OnlineMatchup, PlayMode, PublicUserSummary, Rank, Team } from '../types';
import type { UserProfile } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? 'https://api.guesstheteam.de/api/v1' : 'http://localhost:4000/api/v1')).replace(/\/$/, '');

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timeout = window.setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), 15000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options, signal: controller.signal, credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new ApiError(body?.error ?? (response.status >= 500 ? 'Der Dienst ist gerade nicht verfügbar. Bitte versuche es erneut.' : `Anfrage fehlgeschlagen (${response.status}).`), response.status);
    }
    return await response.json() as T;
  } catch (error) {
    if (options.signal?.aborted || error instanceof ApiError) throw error;
    const failure = new ConnectionError(controller.signal.aborted ? 'Die Antwort dauert zu lange. Bitte versuche es erneut.' : undefined);
    window.dispatchEvent(new CustomEvent('gtt:connection-error', { detail: failure.message }));
    throw failure;
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}

export interface ResumeGameResponse {
  casualSkipsRemaining?: number;
  status: 'active' | 'completed';
  sessionId: string;
  team: Team;
  startedAt: number;
  playMode: PlayMode;
  matchType: MatchType;
  difficulty: Difficulty;
  rank: Rank;
  guesses: Record<string, import('../types').GuessState>;
  finish?: FinishGameResponse;
}
export const resumeGame = (id: string, signal?: AbortSignal) => request<ResumeGameResponse>(`/game/sessions/${encodeURIComponent(id)}`, { signal });

export interface StartGameResponse {
  casualSkipsRemaining?: number;
  sessionId: string;
  playMode: PlayMode;
  matchType: MatchType;
  difficulty: Difficulty;
  rank: Rank;
  winStreak: number;
  surrenderLpChange: number;
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

export interface AutoSolveResponse {
  solved: {
    playerId: string;
    name: string;
  };
  profile: UserProfile;
}

export interface SkipTeamResponse {
  casualSkipsRemaining?: number;
  skipped: boolean;
  profile: UserProfile;
}

export interface FinishGameResponse {
  result: Pick<MatchResult, 'solved' | 'total' | 'durationSec' | 'isWin' | 'isPerfect' | 'completionRatio'>;
  progression: {
    xpGained: number;
    lpChange: number;
    newAchievements: string[];
  };
  profile: UserProfile | null;
}

export interface ProfileResponse {
  profile: UserProfile;
}

export interface PlayerSearchResponse {
  results: Array<{ name: string }>;
}

export interface MatchHistoryResponse {
  matches: MatchHistoryItem[];
}

export interface LeaderboardResponse {
  entries: PublicUserSummary[];
}

export interface UserSearchResponse {
  users: PublicUserSummary[];
}

export interface SocialOverviewResponse {
  friends: FriendRequestSummary[];
  incoming: FriendRequestSummary[];
  outgoing: FriendRequestSummary[];
  notificationCount: number;
}

export interface OnlineMatchupsResponse {
  matchups: OnlineMatchup[];
}

export interface OnlineMatchupResponse {
  matchup: OnlineMatchup;
}

export interface OnlineGuessResponse {
  correct: boolean;
  matchedPlayerId?: string;
  name?: string;
  matchup: OnlineMatchup;
}

export function startGame(payload: {
  playMode: PlayMode;
  matchType: MatchType;
  difficulty?: Difficulty;
  rank?: Rank;
  leagueId?: string;
  excludeTeamIds?: string[];
}) {
  return request<StartGameResponse>('/game/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getProfile() {
  return request<ProfileResponse>('/profile/me');
}

export function getMatchHistory() {
  return request<MatchHistoryResponse>('/profile/matches');
}

export function getLeaderboards(type: 'rank' | 'streak' | 'xp' | 'wins', limit = 50) {
  const params = new URLSearchParams({ type, limit: String(limit) });
  return request<LeaderboardResponse>(`/profile/leaderboards?${params.toString()}`);
}

export function searchUsers(query: string, limit = 12) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return request<UserSearchResponse>(`/profile/users/search?${params.toString()}`);
}

export function getSocialOverview() {
  return request<SocialOverviewResponse>('/profile/social');
}

export function sendFriendRequest(profileId: string) {
  return request<{ ok: true }>('/profile/friends/request', {
    method: 'POST',
    body: JSON.stringify({ profileId }),
  });
}

export function respondToFriendRequest(requestId: string, action: 'accept' | 'decline') {
  return request<{ ok: true }>(`/profile/friends/${requestId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

export function getOnlineMatchups() {
  return request<OnlineMatchupsResponse>('/online/matchups');
}

export function createOnlineMatchup(opponentId: string) {
  return request<OnlineMatchupResponse>('/online/matchups', {
    method: 'POST',
    body: JSON.stringify({ opponentId }),
  });
}

export function getOnlineMatchup(matchupId: string) {
  return request<OnlineMatchupResponse>(`/online/matchups/${matchupId}`);
}

export function joinOnlineMatchup(matchupId: string) {
  return request<OnlineMatchupResponse>(`/online/matchups/${matchupId}/join`, {
    method: 'POST',
  });
}

export function leaveOnlineMatchup(matchupId: string) {
  return request<OnlineMatchupResponse>(`/online/matchups/${matchupId}/leave`, {
    method: 'POST',
  });
}

export function guessOnlineMatchup(matchupId: string, input: string) {
  return request<OnlineGuessResponse>(`/online/matchups/${matchupId}/guess`, {
    method: 'POST',
    body: JSON.stringify({ input }),
  });
}

export function finishOnlineMatchup(matchupId: string) {
  return request<OnlineMatchupResponse>(`/online/matchups/${matchupId}/finish`, {
    method: 'POST',
  });
}

export function submitGuess(payload: { sessionId: string; input: string }) {
  return request<GuessResponse>('/game/guess', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function autoSolvePlayer(payload: { sessionId: string; playerId: string }) {
  return request<AutoSolveResponse>('/game/auto-solve', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function skipRankedTeam(payload: { sessionId: string }) {
  return request<SkipTeamResponse>('/game/skip', {
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
