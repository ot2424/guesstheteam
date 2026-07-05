import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import type { GameSession, MatchHistoryItem, PlayMode, PrestigeVisual, ProgressionReward, Rank, UserInventory } from '../types';
import { getInventoryRewardDelta, getPrestigeVisual, getUnlockedRewards } from './RewardService';

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
  best_win_streak?: number | null;
  skip_shields?: number | null;
  auto_solve_jokers?: number | null;
};

type LeaderboardType = 'rank' | 'streak' | 'xp' | 'wins';
type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

type FriendRequestRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendRequestStatus;
  created_at: string;
  responded_at: string | null;
  requester?: ProfileRow | ProfileRow[] | null;
  addressee?: ProfileRow | ProfileRow[] | null;
};

type MatchResultRow = {
  id: string;
  team_name: string;
  season: string;
  league: string;
  play_mode: PlayMode;
  match_type: GameSession['matchType'];
  solved: number;
  total: number;
  duration_sec: number;
  is_win: boolean;
  is_perfect: boolean;
  xp_gained: number;
  lp_change: number;
  created_at: string;
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
  bestWinStreak: number;
  inventory: UserInventory;
  unlockedRewards: ProgressionReward[];
  prestige: PrestigeVisual;
};

export type PublicUserSummary = {
  id: string;
  username: string;
  level: number;
  lp: number;
  rank: Rank;
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
  bestWinStreak: number;
  prestige: PrestigeVisual;
};

export type FriendRequestSummary = {
  id: string;
  status: FriendRequestStatus;
  createdAt: string;
  respondedAt: string | null;
  direction: 'incoming' | 'outgoing' | 'friend';
  user: PublicUserSummary;
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

const PROFILE_SELECT = 'id, username, first_name, last_name, email, xp, level, lp, rank, badges, matches_played, matches_won, win_streak, best_win_streak, skip_shields, auto_solve_jokers';

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
        best_win_streak: nextProfile.bestWinStreak,
        skip_shields: nextProfile.inventory.skipShields,
        auto_solve_jokers: nextProfile.inventory.autoSolveJokers,
      })
      .eq('id', currentProfile.id);

    if (profileError) return null;
    return nextProfile;
  }

  async getMatchHistory(accessToken?: string, limit = 12): Promise<MatchHistoryItem[]> {
    const supabase = createUserClient(accessToken);
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('match_results')
      .select('id, team_name, season, league, play_mode, match_type, solved, total, duration_sec, is_win, is_perfect, xp_gained, lp_change, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<MatchResultRow[]>();

    if (error || !data) return [];
    return data.map(mapMatchHistoryItem);
  }

  async getLeaderboards(type: LeaderboardType = 'rank', limit = 50): Promise<PublicUserSummary[]> {
    const supabase = createAdminClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .order(getLeaderboardSortColumn(type), { ascending: false })
      .order('matches_won', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 100))
      .returns<ProfileRow[]>();

    if (error || !data) return [];
    return data.map(mapUserSummary);
  }

  async searchUsers(accessToken: string | undefined, query: string, limit = 12): Promise<PublicUserSummary[]> {
    const currentProfile = await this.getProfile(accessToken);
    const supabase = createAdminClient();
    if (!supabase || !currentProfile || query.trim().length < 2) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .ilike('username', `%${query.trim()}%`)
      .neq('id', currentProfile.id)
      .order('username', { ascending: true })
      .limit(Math.min(Math.max(limit, 1), 25))
      .returns<ProfileRow[]>();

    if (error || !data) return [];
    return data.map(mapUserSummary);
  }

  async getSocialOverview(accessToken?: string) {
    const currentProfile = await this.getProfile(accessToken);
    const supabase = createAdminClient();
    if (!supabase || !currentProfile) {
      return { friends: [], incoming: [], outgoing: [], notificationCount: 0 };
    }

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        created_at,
        responded_at,
        requester:requester_id(${PROFILE_SELECT}),
        addressee:addressee_id(${PROFILE_SELECT})
      `)
      .or(`requester_id.eq.${currentProfile.id},addressee_id.eq.${currentProfile.id}`)
      .order('created_at', { ascending: false })
      .returns<FriendRequestRow[]>();

    if (error || !data) return { friends: [], incoming: [], outgoing: [], notificationCount: 0 };

    const items = data
      .map((request) => mapFriendRequest(request, currentProfile.id))
      .filter((request): request is FriendRequestSummary => Boolean(request));

    const incoming = items.filter((request) => request.status === 'pending' && request.direction === 'incoming');
    const outgoing = items.filter((request) => request.status === 'pending' && request.direction === 'outgoing');
    const friends = items.filter((request) => request.status === 'accepted');

    return {
      friends,
      incoming,
      outgoing,
      notificationCount: incoming.length,
    };
  }

  async sendFriendRequest(accessToken: string | undefined, addresseeId: string) {
    const currentProfile = await this.getProfile(accessToken);
    const supabase = createAdminClient();
    if (!supabase || !currentProfile) return { error: 'Profil nicht gefunden.' };
    if (currentProfile.id === addresseeId) return { error: 'Du kannst dir selbst keine Anfrage senden.' };

    const { data: existing } = await supabase
      .from('friend_requests')
      .select('id, status')
      .or(`and(requester_id.eq.${currentProfile.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${currentProfile.id})`)
      .maybeSingle<{ id: string; status: FriendRequestStatus }>();

    if (existing?.status === 'accepted') return { error: 'Ihr seid bereits Freunde.' };
    if (existing?.status === 'pending') return { error: 'Es gibt bereits eine offene Anfrage.' };

    const { error } = await supabase
      .from('friend_requests')
      .insert({
        requester_id: currentProfile.id,
        addressee_id: addresseeId,
        status: 'pending',
      });

    if (error) return { error: error.message };
    return { error: null };
  }

  async respondToFriendRequest(accessToken: string | undefined, requestId: string, action: 'accept' | 'decline') {
    const currentProfile = await this.getProfile(accessToken);
    const supabase = createAdminClient();
    if (!supabase || !currentProfile) return { error: 'Profil nicht gefunden.' };

    const { error } = await supabase
      .from('friend_requests')
      .update({
        status: action === 'accept' ? 'accepted' : 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('addressee_id', currentProfile.id)
      .eq('status', 'pending');

    if (error) return { error: error.message };
    return { error: null };
  }

  async consumeSkipShield(accessToken?: string): Promise<PublicProfile | null> {
    return this.consumeInventoryItem(accessToken, 'skipShields');
  }

  async consumeAutoSolveJoker(accessToken?: string): Promise<PublicProfile | null> {
    return this.consumeInventoryItem(accessToken, 'autoSolveJokers');
  }

  private async consumeInventoryItem(accessToken: string | undefined, item: keyof UserInventory): Promise<PublicProfile | null> {
    const supabase = createUserClient(accessToken);
    if (!supabase) return null;

    const currentProfile = await this.getProfile(accessToken);
    if (!currentProfile || currentProfile.inventory[item] <= 0) return null;

    const nextInventory = {
      ...currentProfile.inventory,
      [item]: currentProfile.inventory[item] - 1,
    };

    const { error } = await supabase
      .from('profiles')
      .update({
        skip_shields: nextInventory.skipShields,
        auto_solve_jokers: nextInventory.autoSolveJokers,
      })
      .eq('id', currentProfile.id);

    if (error) return null;
    return {
      ...currentProfile,
      inventory: nextInventory,
    };
  }
}

function mapMatchHistoryItem(row: MatchResultRow): MatchHistoryItem {
  return {
    id: row.id,
    teamName: row.team_name,
    season: row.season,
    league: row.league,
    playMode: row.play_mode,
    matchType: row.match_type,
    solved: row.solved,
    total: row.total,
    durationSec: row.duration_sec,
    isWin: row.is_win,
    isPerfect: row.is_perfect,
    xpGained: row.xp_gained,
    lpChange: row.lp_change,
    createdAt: row.created_at,
  };
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

function createAdminClient(): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
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
    bestWinStreak: row.best_win_streak ?? row.win_streak,
    inventory: {
      skipShields: row.skip_shields ?? 0,
      autoSolveJokers: row.auto_solve_jokers ?? 0,
    },
    unlockedRewards: getUnlockedRewards(row.level),
    prestige: getPrestigeVisual(row.rank),
  };
}

function mapUserSummary(row: ProfileRow): PublicUserSummary {
  return {
    id: row.id,
    username: row.username,
    level: row.level,
    lp: row.lp,
    rank: row.rank,
    matchesPlayed: row.matches_played,
    matchesWon: row.matches_won,
    winStreak: row.win_streak,
    bestWinStreak: row.best_win_streak ?? row.win_streak,
    prestige: getPrestigeVisual(row.rank),
  };
}

function mapFriendRequest(row: FriendRequestRow, currentUserId: string): FriendRequestSummary | null {
  const requester = Array.isArray(row.requester) ? row.requester[0] : row.requester;
  const addressee = Array.isArray(row.addressee) ? row.addressee[0] : row.addressee;
  const otherProfile = row.requester_id === currentUserId ? addressee : requester;
  if (!otherProfile) return null;

  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
    direction: row.status === 'accepted'
      ? 'friend'
      : row.addressee_id === currentUserId ? 'incoming' : 'outgoing',
    user: mapUserSummary(otherProfile),
  };
}

function getLeaderboardSortColumn(type: LeaderboardType) {
  if (type === 'streak') return 'best_win_streak';
  if (type === 'xp') return 'xp';
  if (type === 'wins') return 'matches_won';
  return 'lp';
}

export function applyProgress(
  profile: PublicProfile,
  playMode: PlayMode,
  matchType: GameSession['matchType'],
  result: { isWin: boolean; series?: { isComplete: boolean; isWin: boolean } },
  progression: { xpGained: number; lpChange: number },
): PublicProfile {
  const xp = profile.xp + progression.xpGained;
  const nextLevel = getLevelFromXP(xp);
  const lp = playMode === 'ranked' ? Math.max(0, profile.lp + progression.lpChange) : profile.lp;
  const nextRank = getRankFromLP(lp);
  const inventoryDelta = getInventoryRewardDelta(profile.level, nextLevel);
  const inventory = {
    skipShields: profile.inventory.skipShields + inventoryDelta.skipShields,
    autoSolveJokers: profile.inventory.autoSolveJokers + inventoryDelta.autoSolveJokers,
  };
  const rankedSeriesPending = playMode === 'ranked' && matchType === 'series' && result.series?.isComplete === false;
  const rankedOutcome = matchType === 'series' && result.series?.isComplete
    ? result.series.isWin
    : result.isWin;
  const winStreak = playMode === 'ranked' && !rankedSeriesPending
    ? (rankedOutcome ? profile.winStreak + 1 : 0)
    : profile.winStreak;

  return {
    ...profile,
    xp,
    level: nextLevel,
    lp,
    rank: nextRank,
    inventory,
    unlockedRewards: getUnlockedRewards(nextLevel),
    prestige: getPrestigeVisual(nextRank),
    matchesPlayed: profile.matchesPlayed + 1,
    matchesWon: profile.matchesWon + (result.isWin ? 1 : 0),
    winStreak,
    bestWinStreak: Math.max(profile.bestWinStreak, winStreak),
  };
}

export function getLevelFromXP(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

export function getRankFromLP(lp: number): Rank {
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
