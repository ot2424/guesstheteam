import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import type { GameSession, PlayMode, Rank } from '../types';

type ProfileRow = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  xp: number;
  level: number;
  lp: number;
  rank: Rank;
  badges: string[] | null;
  matches_played: number;
  matches_won: number;
  win_streak: number;
};

export type PublicProfile = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  xp: number;
  level: number;
  lp: number;
  rank: Rank;
  badges: string[];
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
};

export type MatchPersistencePayload = {
  session: GameSession;
  result: {
    solved: number;
    total: number;
    durationSec: number;
    isWin: boolean;
    isPerfect: boolean;
    completionRatio: number;
    series?: {
      isComplete: boolean;
      isWin: boolean;
    };
  };
  progression: {
    xpGained: number;
    lpChange: number;
  };
};

const RANKS: Rank[] = [
  'Bronze 3', 'Bronze 2', 'Bronze 1',
  'Silver 3', 'Silver 2', 'Silver 1',
  'Gold 3', 'Gold 2', 'Gold 1',
  'Platinum 3', 'Platinum 2', 'Platinum 1',
];

export class ProfileService {
  async getProfile(accessToken?: string): Promise<PublicProfile | null> {
    const supabase = createUserClient(accessToken);
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .maybeSingle<ProfileRow>();

    if (error || !data) return null;
    return mapProfile(data);
  }

  async persistMatch(accessToken: string | undefined, payload: MatchPersistencePayload): Promise<PublicProfile | null> {
    const supabase = createUserClient(accessToken);
    if (!supabase) return null;

    const currentProfile = await this.getProfile(accessToken);
    if (!currentProfile) return null;

    const nextProfile = applyProgress(currentProfile, payload.session.playMode, payload.session.matchType, payload.result, payload.progression);

    const { error: matchError } = await supabase.from('match_results').insert({
      user_id: currentProfile.id,
      session_id: payload.session.sessionId,
      team_id: payload.session.team.id,
      team_name: payload.session.team.name,
      season: payload.session.team.season,
      league: payload.session.team.league,
      play_mode: payload.session.playMode,
      match_type: payload.session.matchType,
      difficulty: payload.session.difficulty,
      rank_at_start: payload.session.rank,
      solved: payload.result.solved,
      total: payload.result.total,
      duration_sec: payload.result.durationSec,
      completion_ratio: payload.result.completionRatio,
      is_win: payload.result.isWin,
      is_perfect: payload.result.isPerfect,
      xp_gained: payload.progression.xpGained,
      lp_change: payload.progression.lpChange,
    });

    if (matchError) return null;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        xp: nextProfile.xp,
        level: nextProfile.level,
        lp: nextProfile.lp,
        rank: nextProfile.rank,
        badges: nextProfile.badges,
        matches_played: nextProfile.matchesPlayed,
        matches_won: nextProfile.matchesWon,
        win_streak: nextProfile.winStreak,
      })
      .eq('id', currentProfile.id);

    if (profileError) return null;
    return nextProfile;
  }
}

function createUserClient(accessToken?: string): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !accessToken) return null;

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

function mapProfile(row: ProfileRow): PublicProfile {
  return {
    id: row.id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    xp: row.xp,
    level: row.level,
    lp: row.lp,
    rank: row.rank,
    badges: row.badges ?? [],
    matchesPlayed: row.matches_played,
    matchesWon: row.matches_won,
    winStreak: row.win_streak,
  };
}

function applyProgress(
  profile: PublicProfile,
  playMode: PlayMode,
  matchType: GameSession['matchType'],
  result: { isWin: boolean; series?: { isComplete: boolean; isWin: boolean } },
  progression: { xpGained: number; lpChange: number },
): PublicProfile {
  const xp = profile.xp + progression.xpGained;
  const lp = playMode === 'ranked' ? Math.max(0, profile.lp + progression.lpChange) : profile.lp;
  const rankedSeriesPending = playMode === 'ranked' && matchType === 'series' && result.series?.isComplete === false;
  const rankedOutcome = matchType === 'series' && result.series?.isComplete
    ? result.series.isWin
    : result.isWin;

  return {
    ...profile,
    xp,
    level: getLevelFromXP(xp),
    lp,
    rank: getRankFromLP(lp),
    matchesPlayed: profile.matchesPlayed + 1,
    matchesWon: profile.matchesWon + (result.isWin ? 1 : 0),
    winStreak: playMode === 'ranked' && !rankedSeriesPending
      ? (rankedOutcome ? profile.winStreak + 1 : 0)
      : profile.winStreak,
  };
}

function getLevelFromXP(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

function getRankFromLP(lp: number): Rank {
  const safeLp = Math.max(0, lp);
  for (let i = RANKS.length - 1; i >= 0; i -= 1) {
    if (safeLp >= getRankLowerBound(RANKS[i])) return RANKS[i];
  }
  return RANKS[0];
}

function getRankLowerBound(rank: Rank): number {
  const rankIndex = RANKS.indexOf(rank);
  if (rankIndex <= 0) return 0;
  return RANKS.slice(0, rankIndex).reduce((total, currentRank) => total + getRankStepSize(currentRank), 0);
}

function getRankStepSize(rank: Rank): number {
  if (rank.startsWith('Bronze')) return 180;
  if (rank.startsWith('Silver')) return 240;
  if (rank.startsWith('Gold')) return 320;
  return 420;
}
