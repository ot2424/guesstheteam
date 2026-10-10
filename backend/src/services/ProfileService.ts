import { query, transaction } from '../db/pool';
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
  async getProfile(userId?: string): Promise<PublicProfile | null> {
    if (!userId) return null;
    const [row] = await query<ProfileRow>('SELECT * FROM profiles WHERE id = $1', [userId]);
    return row ? mapProfile(row) : null;
  }

  async persistMatch(userId: string | undefined, payload: MatchPersistencePayload): Promise<PublicProfile | null> {
    if (!userId || payload.session.userId !== userId) return null;
    return transaction(async client => {
      const { rows: [row] } = await client.query<ProfileRow>('SELECT * FROM profiles WHERE id = $1 FOR UPDATE', [userId]);
      if (!row) return null;
      const current = mapProfile(row);
      const { session, result, progression } = payload;
      const next = applyProgress(current, session.playMode, session.matchType, result, progression);
      const completionResponse = { result, progression, profile: next, team: session.team, sessionId: session.sessionId, startedAt: session.startedAt, playMode: session.playMode, matchType: session.matchType, difficulty: session.difficulty, rank: session.rank };
      const inserted = await client.query(`INSERT INTO match_results
        (user_id, session_id, team_id, team_name, season, league, play_mode, match_type, difficulty, rank_at_start,
         solved, total, duration_sec, completion_ratio, is_win, is_perfect, xp_gained, lp_change, completion_response)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        ON CONFLICT (user_id, session_id) DO NOTHING RETURNING id`,
        [userId, session.sessionId, session.team.id, session.team.name, session.team.season, session.team.league,
         session.playMode, session.matchType, session.difficulty, session.rank, result.solved, result.total,
         result.durationSec, result.completionRatio, result.isWin, result.isPerfect, progression.xpGained, progression.lpChange, JSON.stringify(completionResponse)]);
      if (!inserted.rowCount) return current;
      await client.query(`UPDATE profiles SET xp=$2, level=$3, lp=$4, rank=$5, badges=$6,
        matches_played=$7, matches_won=$8, win_streak=$9, best_win_streak=$10, skip_shields=$11, auto_solve_jokers=$12 WHERE id=$1`,
        [userId, next.xp, next.level, next.lp, next.rank, next.badges, next.matchesPlayed, next.matchesWon,
         next.winStreak, next.bestWinStreak, next.inventory.skipShields, next.inventory.autoSolveJokers]);
      return next;
    });
  }

  async getCompletedMatch(userId: string | undefined, sessionId: string) {
    if (!userId) return null;
    const [row] = await query<{ completion_response: Record<string, unknown> | null }>(
      'SELECT completion_response FROM match_results WHERE user_id=$1 AND session_id=$2', [userId, sessionId]);
    return row?.completion_response ?? null;
  }

  async getMatchHistory(userId?: string, limit = 12): Promise<MatchHistoryItem[]> {
    if (!userId) return [];
    return (await query<MatchResultRow>('SELECT * FROM match_results WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2', [userId, limit])).map(mapMatchHistoryItem);
  }

  async getLeaderboards(type: LeaderboardType = 'rank', limit = 50): Promise<PublicUserSummary[]> {
    const column = getLeaderboardSortColumn(type);
    return (await query<ProfileRow>(`SELECT ${PROFILE_SELECT} FROM profiles ORDER BY ${column} DESC, matches_won DESC LIMIT $1`, [Math.min(Math.max(limit, 1), 100)])).map(mapUserSummary);
  }

  async searchUsers(userId: string | undefined, search: string, limit = 12): Promise<PublicUserSummary[]> {
    if (!userId || search.trim().length < 2) return [];
    return (await query<ProfileRow>(`SELECT ${PROFILE_SELECT} FROM profiles WHERE username ILIKE $1 AND id <> $2 ORDER BY username LIMIT $3`, [`%${search.trim()}%`, userId, Math.min(Math.max(limit, 1), 25)])).map(mapUserSummary);
  }

  async getSocialOverview(userId?: string) {
    if (!userId) return { friends: [], incoming: [], outgoing: [], notificationCount: 0 };
    const rows = await query<FriendRequestRow>(`SELECT f.*, row_to_json(r) AS requester, row_to_json(a) AS addressee
      FROM friend_requests f JOIN profiles r ON r.id=f.requester_id JOIN profiles a ON a.id=f.addressee_id
      WHERE f.requester_id=$1 OR f.addressee_id=$1 ORDER BY f.created_at DESC`, [userId]);
    const items = rows.map(row => mapFriendRequest(row, userId)).filter((item): item is FriendRequestSummary => Boolean(item));
    const incoming = items.filter(item => item.status === 'pending' && item.direction === 'incoming');
    return {
      friends: items.filter(item => item.status === 'accepted'), incoming,
      outgoing: items.filter(item => item.status === 'pending' && item.direction === 'outgoing'),
      notificationCount: incoming.length,
    };
  }

  async sendFriendRequest(userId: string | undefined, addresseeId: string) {
    if (!userId) return { error: 'Profil nicht gefunden.' };
    if (userId === addresseeId) return { error: 'Du kannst dir selbst keine Anfrage senden.' };
    const rows = await query(`INSERT INTO friend_requests(requester_id, addressee_id) VALUES ($1,$2)
      ON CONFLICT (least(requester_id,addressee_id), greatest(requester_id,addressee_id))
      DO UPDATE SET requester_id=EXCLUDED.requester_id, addressee_id=EXCLUDED.addressee_id,
      status='pending', responded_at=NULL, created_at=now() WHERE friend_requests.status='declined' RETURNING id`, [userId, addresseeId]);
    return { error: rows.length ? null : 'Es gibt bereits eine Anfrage oder Freundschaft.' };
  }

  async respondToFriendRequest(userId: string | undefined, requestId: string, action: 'accept' | 'decline') {
    if (!userId) return { error: 'Profil nicht gefunden.' };
    const rows = await query(`UPDATE friend_requests SET status=$3, responded_at=now()
      WHERE id=$1 AND addressee_id=$2 AND status='pending' RETURNING id`, [requestId, userId, action === 'accept' ? 'accepted' : 'declined']);
    return { error: rows.length ? null : 'Offene Anfrage nicht gefunden.' };
  }

  async consumeSkipShield(userId?: string): Promise<PublicProfile | null> {
    return this.consumeInventoryItem(userId, 'skip_shields');
  }
  async consumeAutoSolveJoker(userId?: string): Promise<PublicProfile | null> {
    return this.consumeInventoryItem(userId, 'auto_solve_jokers');
  }
  private async consumeInventoryItem(userId: string | undefined, column: 'skip_shields' | 'auto_solve_jokers'): Promise<PublicProfile | null> {
    if (!userId) return null;
    const [row] = await query<ProfileRow>(`UPDATE profiles SET ${column}=${column}-1 WHERE id=$1 AND ${column}>0 RETURNING *`, [userId]);
    return row ? mapProfile(row) : null;
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
