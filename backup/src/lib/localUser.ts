import { getLevelFromXP, getRankFromLP, MOCK_USER } from '../data/mockUser';
import type { MatchType, PlayMode, SeriesProgress, UserProfile } from '../types';

const USER_STORAGE_KEY = 'guesstheteam.user.v1';
const LEGACY_USER_STORAGE_KEY = 'footyguesser.user.v1';
const APPLIED_RESULTS_KEY = 'guesstheteam.appliedResults.v1';
const LEGACY_APPLIED_RESULTS_KEY = 'footyguesser.appliedResults.v1';

export function loadUserProfile(): UserProfile {
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_USER_STORAGE_KEY);
    if (!raw) return MOCK_USER;

    return { ...MOCK_USER, ...JSON.parse(raw) } as UserProfile;
  } catch {
    return MOCK_USER;
  }
}

export function saveUserProfile(user: UserProfile) {
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function createStarterProfile(profile: Pick<UserProfile, 'id' | 'username' | 'firstName' | 'lastName' | 'email'>): UserProfile {
  return {
    ...MOCK_USER,
    ...profile,
    xp: 0,
    level: 1,
    lp: 0,
    rank: 'Bronze 3',
    badges: [],
    matchesPlayed: 0,
    matchesWon: 0,
    winStreak: 0,
  };
}

export function applyMatchResultOnce(result: {
  resultId: string;
  playMode?: PlayMode;
  matchType?: MatchType;
  series?: SeriesProgress;
  isWin: boolean;
  xpGained: number;
  lpChange: number;
}): UserProfile {
  const user = loadUserProfile();
  const applied = loadAppliedResultIds();
  if (applied.includes(result.resultId)) return user;

  const nextUser = applyMatchProgress(user, result);
  saveUserProfile(nextUser);
  saveAppliedResultIds([...applied, result.resultId].slice(-50));
  return nextUser;
}

export function applyMatchProgress(user: UserProfile, result: {
  playMode?: PlayMode;
  matchType?: MatchType;
  series?: SeriesProgress;
  isWin: boolean;
  xpGained: number;
  lpChange: number;
}): UserProfile {
  const nextXp = user.xp + result.xpGained;
  const nextLp = result.playMode === 'ranked'
    ? Math.max(0, user.lp + result.lpChange)
    : user.lp;
  const rankedSeriesPending = result.playMode === 'ranked'
    && result.matchType === 'series'
    && result.series?.isComplete === false;
  const rankedOutcome = result.matchType === 'series' && result.series?.isComplete
    ? Boolean(result.series.isWin)
    : result.isWin;
  return {
    ...user,
    xp: nextXp,
    level: getLevelFromXP(nextXp),
    lp: nextLp,
    rank: getRankFromLP(nextLp),
    matchesPlayed: user.matchesPlayed + 1,
    matchesWon: user.matchesWon + (result.isWin ? 1 : 0),
    winStreak: result.playMode === 'ranked' && !rankedSeriesPending
      ? (rankedOutcome ? user.winStreak + 1 : 0)
      : user.winStreak,
  };
}

export function hasAppliedResult(resultId: string) {
  return loadAppliedResultIds().includes(resultId);
}

export function markResultApplied(resultId: string) {
  const applied = loadAppliedResultIds();
  if (applied.includes(resultId)) return;
  saveAppliedResultIds([...applied, resultId].slice(-50));
}

function loadAppliedResultIds(): string[] {
  try {
    const raw = window.localStorage.getItem(APPLIED_RESULTS_KEY) ?? window.localStorage.getItem(LEGACY_APPLIED_RESULTS_KEY);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function saveAppliedResultIds(ids: string[]) {
  window.localStorage.setItem(APPLIED_RESULTS_KEY, JSON.stringify(ids));
}
