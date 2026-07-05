import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import type { Difficulty, GameSession, PublicPlayer, Rank, TeamData } from '../types';
import { PlayerMatchService } from './PlayerMatchService';
import { ProfileService, type PublicUserSummary } from './ProfileService';
import { TeamSeedService } from './TeamSeedService';

const MATCH_LIMIT_MS = 45 * 60 * 1000;
const RECONNECT_LIMIT_MS = 3 * 60 * 1000;
const DEFAULT_RANK: Rank = 'Bronze 3';
const DEFAULT_DIFFICULTY: Difficulty = 'medium';

type OnlineStatus = 'pending' | 'active' | 'completed' | 'expired';
type Side = 'challenger' | 'opponent';

type OnlinePlayerState = {
  name: string;
  solved: boolean;
};

type OnlineSideState = {
  sessionId: string;
  startedAt: number;
  finishedAt?: number;
  players: Record<string, OnlinePlayerState>;
};

type OnlineMatchupRow = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: OnlineStatus;
  team: TeamData;
  challenger_state: OnlineSideState;
  opponent_state: OnlineSideState | null;
  challenger_joined_at: string;
  opponent_joined_at: string | null;
  challenger_left_at: string | null;
  opponent_left_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string;
  winner_id: string | null;
  win_reason: string | null;
  created_at: string;
  updated_at: string;
  challenger?: ProfileRowOrArray | null;
  opponent?: ProfileRowOrArray | null;
};

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

type ProfileRowOrArray = ProfileRow | ProfileRow[];

export type OnlineMatchupView = {
  id: string;
  status: OnlineStatus;
  role: Side;
  opponent: PublicUserSummary;
  team: Omit<TeamData, 'players'> & { players: PublicPlayer[] };
  self: OnlineScore;
  rival: OnlineScore;
  selfSolvedPlayerIds: string[];
  rivalSolvedPlayerIds: string[];
  winnerId: string | null;
  winReason: string | null;
  expiresAt: string;
  reconnectDeadlineAt: string | null;
  pairScore: {
    selfWins: number;
    opponentWins: number;
  };
};

type OnlineScore = {
  userId: string;
  solved: number;
  total: number;
  durationSec: number;
  finished: boolean;
  leftAt: string | null;
};

type OnlineResultRow = {
  user_id: string;
  opponent_id: string;
  outcome: 'win' | 'loss' | 'draw';
};

const PROFILE_SELECT = 'id, username, first_name, last_name, email, xp, level, lp, rank, badges, matches_played, matches_won, win_streak, best_win_streak, skip_shields, auto_solve_jokers';

export class OnlineMatchupService {
  private rows = new Map<string, OnlineMatchupRow>();
  private matcher = new PlayerMatchService();

  constructor(
    private profileService = new ProfileService(),
    private teamSeedService = new TeamSeedService(),
  ) {}

  async create(accessToken: string | undefined, opponentId: string): Promise<OnlineMatchupView | { error: string }> {
    const profile = await this.profileService.getProfile(accessToken);
    if (!profile) return { error: 'Profil nicht gefunden.' };
    if (profile.id === opponentId) return { error: 'Du kannst dich nicht selbst herausfordern.' };
    if (!(await this.areFriends(profile.id, opponentId))) return { error: 'Online-Matches gehen vorerst nur gegen Freunde.' };

    const team = await this.teamSeedService.selectTeam({
      playMode: 'casual',
      difficulty: DEFAULT_DIFFICULTY,
    });
    const now = Date.now();
    const row: OnlineMatchupRow = {
      id: randomUUID(),
      challenger_id: profile.id,
      opponent_id: opponentId,
      status: 'pending',
      team,
      challenger_state: makeSideState(team, now),
      opponent_state: null,
      challenger_joined_at: new Date(now).toISOString(),
      opponent_joined_at: null,
      challenger_left_at: null,
      opponent_left_at: null,
      started_at: null,
      completed_at: null,
      expires_at: new Date(now + MATCH_LIMIT_MS).toISOString(),
      winner_id: null,
      win_reason: null,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    };

    const saved = await this.save(row);
    return this.toView(saved, profile.id);
  }

  async list(accessToken?: string): Promise<{ matchups: OnlineMatchupView[] }> {
    const profile = await this.profileService.getProfile(accessToken);
    if (!profile) return { matchups: [] };

    const supabase = createAdminClient();
    const rows = supabase ? await this.fetchRows(profile.id) : [...this.rows.values()].filter((row) => isParticipant(row, profile.id));
    const views = await Promise.all(rows.map((row) => this.toView(row, profile.id)));
    return { matchups: views.sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed')) };
  }

  async get(accessToken: string | undefined, matchupId: string) {
    const profile = await this.profileService.getProfile(accessToken);
    const row = profile ? await this.getRow(matchupId, profile.id) : null;
    if (!profile || !row) return null;

    const checked = await this.applyTimeoutRules(row);
    return this.toView(await this.touchPresence(checked, profile.id), profile.id);
  }

  async join(accessToken: string | undefined, matchupId: string) {
    const profile = await this.profileService.getProfile(accessToken);
    const row = profile ? await this.getRow(matchupId, profile.id) : null;
    if (!profile || !row) return null;
    if (row.status === 'completed' || row.status === 'expired') return this.toView(row, profile.id);

    const now = Date.now();
    const next = { ...row };
    if (profile.id === next.opponent_id && !next.opponent_state) {
      next.opponent_state = makeSideState(next.team, now);
      next.opponent_joined_at = new Date(now).toISOString();
      next.status = 'active';
      next.started_at = new Date(now).toISOString();
    }
    clearLeftAt(next, profile.id);
    return this.toView(await this.save(next), profile.id);
  }

  async leave(accessToken: string | undefined, matchupId: string) {
    const profile = await this.profileService.getProfile(accessToken);
    const row = profile ? await this.getRow(matchupId, profile.id) : null;
    if (!profile || !row) return null;
    if (row.status !== 'active') return this.toView(row, profile.id);

    const next = { ...row };
    setLeftAt(next, profile.id, new Date().toISOString());
    return this.toView(await this.save(next), profile.id);
  }

  async guess(accessToken: string | undefined, matchupId: string, input: string) {
    const profile = await this.profileService.getProfile(accessToken);
    const row = profile ? await this.getRow(matchupId, profile.id) : null;
    if (!profile || !row || row.status !== 'active') return null;

    const side = getSide(row, profile.id);
    const state = getState(row, side);
    if (!state || state.finishedAt) return { correct: false, matchup: await this.toView(row, profile.id) };

    const session = makePseudoSession(row, state, profile.id);
    const match = this.matcher.findMatch(input, session);
    const next = { ...row };
    const nextState = cloneState(state);
    if (match) nextState.players[match.playerId].solved = true;
    setState(next, side, nextState);
    clearLeftAt(next, profile.id);

    const saved = await this.maybeComplete(await this.save(next));
    return {
      correct: Boolean(match),
      matchedPlayerId: match?.playerId,
      name: match?.name,
      matchup: await this.toView(saved, profile.id),
    };
  }

  async finish(accessToken: string | undefined, matchupId: string) {
    const profile = await this.profileService.getProfile(accessToken);
    const row = profile ? await this.getRow(matchupId, profile.id) : null;
    if (!profile || !row || row.status !== 'active') return null;

    const side = getSide(row, profile.id);
    const state = getState(row, side);
    if (!state) return null;

    const next = { ...row };
    const nextState = cloneState(state);
    nextState.finishedAt = Date.now();
    setState(next, side, nextState);
    clearLeftAt(next, profile.id);

    const saved = await this.maybeComplete(await this.save(next));
    return this.toView(saved, profile.id);
  }

  private async maybeComplete(row: OnlineMatchupRow): Promise<OnlineMatchupRow> {
    const checked = await this.applyTimeoutRules(row);
    if (checked.status !== 'active') return checked;
    if (!checked.challenger_state.finishedAt || !checked.opponent_state?.finishedAt) return checked;
    return this.complete(checked, 'finished');
  }

  private async applyTimeoutRules(row: OnlineMatchupRow): Promise<OnlineMatchupRow> {
    if (row.status !== 'active' && row.status !== 'pending') return row;
    const now = Date.now();

    if (now >= new Date(row.expires_at).getTime()) {
      return this.complete(row, 'time_limit');
    }

    if (row.status === 'active') {
      const challengerDeadline = row.challenger_left_at ? new Date(row.challenger_left_at).getTime() + RECONNECT_LIMIT_MS : null;
      const opponentDeadline = row.opponent_left_at ? new Date(row.opponent_left_at).getTime() + RECONNECT_LIMIT_MS : null;
      if (challengerDeadline && now > challengerDeadline) return this.complete(row, 'reconnect_forfeit', row.opponent_id);
      if (opponentDeadline && now > opponentDeadline) return this.complete(row, 'reconnect_forfeit', row.challenger_id);
    }

    return row;
  }

  private async complete(row: OnlineMatchupRow, reason: string, forcedWinnerId?: string): Promise<OnlineMatchupRow> {
    const winnerId = forcedWinnerId ?? getWinner(row);
    const next: OnlineMatchupRow = {
      ...row,
      status: 'completed',
      completed_at: new Date().toISOString(),
      winner_id: winnerId,
      win_reason: reason,
    };
    const saved = await this.save(next);
    await this.persistResults(saved);
    return saved;
  }

  private async persistResults(row: OnlineMatchupRow) {
    const supabase = createAdminClient();
    if (!supabase) return;

    const challengerScore = getScore(row, 'challenger');
    const opponentScore = getScore(row, 'opponent');
    const rows = [
      {
        matchup_id: row.id,
        user_id: row.challenger_id,
        opponent_id: row.opponent_id,
        solved: challengerScore.solved,
        total: challengerScore.total,
        duration_sec: challengerScore.durationSec,
        is_winner: row.winner_id === row.challenger_id,
        outcome: row.winner_id === null ? 'draw' : row.winner_id === row.challenger_id ? 'win' : 'loss',
        win_reason: row.win_reason,
      },
      {
        matchup_id: row.id,
        user_id: row.opponent_id,
        opponent_id: row.challenger_id,
        solved: opponentScore.solved,
        total: opponentScore.total,
        duration_sec: opponentScore.durationSec,
        is_winner: row.winner_id === row.opponent_id,
        outcome: row.winner_id === null ? 'draw' : row.winner_id === row.opponent_id ? 'win' : 'loss',
        win_reason: row.win_reason,
      },
    ];
    await supabase.from('online_matchup_results').upsert(rows, { onConflict: 'matchup_id,user_id' });
  }

  private async areFriends(userId: string, otherId: string) {
    const supabase = createAdminClient();
    if (!supabase) return true;
    const { data } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('status', 'accepted')
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`)
      .maybeSingle<{ id: string }>();
    return Boolean(data);
  }

  private async fetchRows(userId: string) {
    const supabase = createAdminClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from('online_matchups')
      .select(`*, challenger:challenger_id(${PROFILE_SELECT}), opponent:opponent_id(${PROFILE_SELECT})`)
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .limit(30)
      .returns<OnlineMatchupRow[]>();
    return data ?? [];
  }

  private async getRow(matchupId: string, userId: string) {
    const supabase = createAdminClient();
    if (!supabase) {
      const row = this.rows.get(matchupId);
      return row && isParticipant(row, userId) ? row : null;
    }

    const { data } = await supabase
      .from('online_matchups')
      .select(`*, challenger:challenger_id(${PROFILE_SELECT}), opponent:opponent_id(${PROFILE_SELECT})`)
      .eq('id', matchupId)
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .maybeSingle<OnlineMatchupRow>();
    return data ?? null;
  }

  private async touchPresence(row: OnlineMatchupRow, userId: string) {
    if (row.status !== 'active') return row;
    const next = { ...row };
    clearLeftAt(next, userId);
    return this.save(next);
  }

  private async save(row: OnlineMatchupRow): Promise<OnlineMatchupRow> {
    const next = { ...row, updated_at: new Date().toISOString() };
    const supabase = createAdminClient();
    if (!supabase) {
      this.rows.set(next.id, next);
      return next;
    }

    const { data, error } = await supabase
      .from('online_matchups')
      .upsert(toDbRow(next), { onConflict: 'id' })
      .select(`*, challenger:challenger_id(${PROFILE_SELECT}), opponent:opponent_id(${PROFILE_SELECT})`)
      .single<OnlineMatchupRow>();
    if (error || !data) throw new Error(error?.message ?? 'Online matchup could not be saved.');
    return data;
  }

  private async toView(row: OnlineMatchupRow, userId: string): Promise<OnlineMatchupView> {
    const role = getSide(row, userId);
    const rivalRole: Side = role === 'challenger' ? 'opponent' : 'challenger';
    const pairScore = await this.getPairScore(userId, getUserId(row, rivalRole));
    const opponent = getProfileSummary(row, rivalRole) ?? fallbackUser(getUserId(row, rivalRole));
    const checked = await this.applyTimeoutRules(row);
    const rivalLeftAt = getLeftAt(checked, rivalRole);
    return {
      id: checked.id,
      status: checked.status,
      role,
      opponent,
      team: publicTeam(checked.team),
      self: { userId, ...getScore(checked, role), leftAt: getLeftAt(checked, role) },
      rival: { userId: getUserId(checked, rivalRole), ...getScore(checked, rivalRole), leftAt: rivalLeftAt },
      selfSolvedPlayerIds: getSolvedPlayerIds(checked, role),
      rivalSolvedPlayerIds: getSolvedPlayerIds(checked, rivalRole),
      winnerId: checked.winner_id,
      winReason: checked.win_reason,
      expiresAt: checked.expires_at,
      reconnectDeadlineAt: rivalLeftAt ? new Date(new Date(rivalLeftAt).getTime() + RECONNECT_LIMIT_MS).toISOString() : null,
      pairScore,
    };
  }

  private async getPairScore(userId: string, opponentId: string) {
    const supabase = createAdminClient();
    if (!supabase) return { selfWins: 0, opponentWins: 0 };
    const { data } = await supabase
      .from('online_matchup_results')
      .select('user_id, opponent_id, outcome')
      .or(`and(user_id.eq.${userId},opponent_id.eq.${opponentId}),and(user_id.eq.${opponentId},opponent_id.eq.${userId})`)
      .returns<OnlineResultRow[]>();
    return {
      selfWins: (data ?? []).filter((row) => row.user_id === userId && row.outcome === 'win').length,
      opponentWins: (data ?? []).filter((row) => row.user_id === opponentId && row.outcome === 'win').length,
    };
  }
}

function makeSideState(team: TeamData, now: number): OnlineSideState {
  return {
    sessionId: randomUUID(),
    startedAt: now,
    players: Object.fromEntries(team.players.map((player) => [player.id, { name: player.name, solved: false }])),
  };
}

function publicTeam(team: TeamData): OnlineMatchupView['team'] {
  return {
    id: team.id,
    name: team.name,
    season: team.season,
    league: team.league,
    logoUrl: team.logoUrl,
    formation: team.formation,
    players: team.players.map((player) => ({
      id: player.id,
      position: player.position,
      nationality: player.nationality,
      nationality2: player.nationality2,
      nationalityFlag: player.nationalityFlag,
      formationSlot: player.formationSlot,
      career: player.career,
    })),
  };
}

function getSolvedPlayerIds(row: OnlineMatchupRow, side: Side) {
  const state = getState(row, side);
  if (!state) return [];
  return Object.entries(state.players)
    .filter(([, player]) => player.solved)
    .map(([playerId]) => playerId);
}

function getScore(row: OnlineMatchupRow, side: Side) {
  const state = getState(row, side);
  const players = state ? Object.values(state.players) : [];
  const durationSec = state
    ? Math.floor(((state.finishedAt ?? Date.now()) - state.startedAt) / 1000)
    : 0;
  return {
    solved: players.filter((player) => player.solved).length,
    total: players.length || 11,
    durationSec: Math.min(durationSec, MATCH_LIMIT_MS / 1000),
    finished: Boolean(state?.finishedAt),
  };
}

function getWinner(row: OnlineMatchupRow) {
  const challenger = getScore(row, 'challenger');
  const opponent = getScore(row, 'opponent');
  if (challenger.solved !== opponent.solved) return challenger.solved > opponent.solved ? row.challenger_id : row.opponent_id;
  if (challenger.durationSec !== opponent.durationSec) return challenger.durationSec < opponent.durationSec ? row.challenger_id : row.opponent_id;
  return null;
}

function makePseudoSession(row: OnlineMatchupRow, state: OnlineSideState, userId: string): GameSession {
  return {
    sessionId: state.sessionId,
    userId,
    playMode: 'casual',
    matchType: 'single',
    difficulty: DEFAULT_DIFFICULTY,
    rank: DEFAULT_RANK,
    winStreak: 0,
    startedAt: state.startedAt,
    team: publicTeam(row.team),
    players: Object.fromEntries(Object.entries(state.players).map(([id, player]) => [id, { ...player, wrongAttempts: 0 }])),
  };
}

function getState(row: OnlineMatchupRow, side: Side) {
  return side === 'challenger' ? row.challenger_state : row.opponent_state;
}

function setState(row: OnlineMatchupRow, side: Side, state: OnlineSideState) {
  if (side === 'challenger') row.challenger_state = state;
  else row.opponent_state = state;
}

function cloneState(state: OnlineSideState): OnlineSideState {
  return JSON.parse(JSON.stringify(state)) as OnlineSideState;
}

function isParticipant(row: OnlineMatchupRow, userId: string) {
  return row.challenger_id === userId || row.opponent_id === userId;
}

function getSide(row: OnlineMatchupRow, userId: string): Side {
  return row.challenger_id === userId ? 'challenger' : 'opponent';
}

function getUserId(row: OnlineMatchupRow, side: Side) {
  return side === 'challenger' ? row.challenger_id : row.opponent_id;
}

function getLeftAt(row: OnlineMatchupRow, side: Side) {
  return side === 'challenger' ? row.challenger_left_at : row.opponent_left_at;
}

function setLeftAt(row: OnlineMatchupRow, userId: string, value: string | null) {
  if (row.challenger_id === userId) row.challenger_left_at = value;
  if (row.opponent_id === userId) row.opponent_left_at = value;
}

function clearLeftAt(row: OnlineMatchupRow, userId: string) {
  setLeftAt(row, userId, null);
}

function getProfileSummary(row: OnlineMatchupRow, side: Side): PublicUserSummary | null {
  const profile = side === 'challenger' ? row.challenger : row.opponent;
  const item = Array.isArray(profile) ? profile[0] : profile;
  if (!item) return null;
  return {
    id: item.id,
    username: item.username,
    level: item.level,
    lp: item.lp,
    rank: item.rank,
    matchesPlayed: item.matches_played,
    matchesWon: item.matches_won,
    winStreak: item.win_streak,
    bestWinStreak: item.best_win_streak ?? item.win_streak,
    prestige: { emblem: item.rank.startsWith('Gold') ? 'gold-winged' : item.rank.startsWith('Platinum') ? 'platinum-storm' : item.rank.startsWith('Silver') ? 'silver' : 'bronze', nameGlow: null },
  };
}

function fallbackUser(id: string): PublicUserSummary {
  return {
    id,
    username: 'Freund',
    level: 1,
    lp: 0,
    rank: DEFAULT_RANK,
    matchesPlayed: 0,
    matchesWon: 0,
    winStreak: 0,
    bestWinStreak: 0,
    prestige: { emblem: 'bronze', nameGlow: null },
  };
}

function toDbRow(row: OnlineMatchupRow) {
  return {
    id: row.id,
    challenger_id: row.challenger_id,
    opponent_id: row.opponent_id,
    status: row.status,
    team: row.team,
    challenger_state: row.challenger_state,
    opponent_state: row.opponent_state,
    challenger_joined_at: row.challenger_joined_at,
    opponent_joined_at: row.opponent_joined_at,
    challenger_left_at: row.challenger_left_at,
    opponent_left_at: row.opponent_left_at,
    started_at: row.started_at,
    completed_at: row.completed_at,
    expires_at: row.expires_at,
    winner_id: row.winner_id,
    win_reason: row.win_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function createAdminClient(): SupabaseClient | null {
  if (env.NODE_ENV === 'test') return null;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}
