import { getLevelFromXP, getRankFromLP, MOCK_USER } from '../data/mockUser';
import type { MatchType, PlayMode, UserProfile } from '../types';

const USER_STORAGE_KEY = 'footyguesser.user.v1';
const APPLIED_RESULTS_KEY = 'footyguesser.appliedResults.v1';

export function loadUserProfile(): UserProfile {
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return MOCK_USER;

    return { ...MOCK_USER, ...JSON.parse(raw) } as UserProfile;
  } catch {
    return MOCK_USER;
  }
}

export function saveUserProfile(user: UserProfile) {
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function applyRankedResultOnce(result: {
  resultId: string;
  playMode?: PlayMode;
  matchType?: MatchType;
  isWin: boolean;
  xpGained: number;
  lpChange: number;
}): UserProfile {
  const user = loadUserProfile();
  if (result.playMode !== 'ranked') return user;

  const applied = loadAppliedResultIds();
  if (applied.includes(result.resultId)) return user;

  const nextXp = user.xp + result.xpGained;
  const nextLp = Math.max(0, user.lp + result.lpChange);
  const nextUser: UserProfile = {
    ...user,
    xp: nextXp,
    level: getLevelFromXP(nextXp),
    lp: nextLp,
    rank: getRankFromLP(nextLp),
    matchesPlayed: user.matchesPlayed + 1,
    matchesWon: user.matchesWon + (result.isWin ? 1 : 0),
    winStreak: result.isWin ? user.winStreak + 1 : 0,
  };

  saveUserProfile(nextUser);
  saveAppliedResultIds([...applied, result.resultId].slice(-50));
  return nextUser;
}

function loadAppliedResultIds(): string[] {
  try {
    const raw = window.localStorage.getItem(APPLIED_RESULTS_KEY);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function saveAppliedResultIds(ids: string[]) {
  window.localStorage.setItem(APPLIED_RESULTS_KEY, JSON.stringify(ids));
}
