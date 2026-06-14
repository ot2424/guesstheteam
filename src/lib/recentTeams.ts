const STORAGE_KEY = 'footyguesser.recentTeams.v1';
const MAX_RECENT_TEAMS = 5;

export function loadRecentTeamIds(userId: string): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = raw ? JSON.parse(raw) : {};
    const ids = value?.[userId];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberRecentTeamId(userId: string, teamId: string) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = raw ? JSON.parse(raw) as Record<string, string[]> : {};
    const current = Array.isArray(value[userId]) ? value[userId] : [];
    value[userId] = [teamId, ...current.filter((id) => id !== teamId)].slice(0, MAX_RECENT_TEAMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Non-critical: team repetition prevention is a local quality-of-life feature.
  }
}
