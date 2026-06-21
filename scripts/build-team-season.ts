import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { TransfermarktBackupService } from '../backend/src/services/TransfermarktBackupService';
import type { Difficulty, InternalPlayer, Position, TeamData } from '../backend/src/types';

interface Args {
  club: string;
  clubId?: string;
  season: string;
  league?: string;
  difficulty?: Difficulty;
  dryRun: boolean;
  provider: string;
  seedPath: string;
}

interface ClubSearchResponse {
  results?: Array<{ id?: string; name?: string; country?: string }>;
}

interface ClubProfileResponse {
  id?: string;
  name?: string;
  image?: string;
  league?: { id?: string | null; name?: string | null };
}

interface ClubPlayersResponse {
  players?: ClubPlayer[];
}

interface ClubPlayer {
  id: string;
  name: string;
  position: string;
  nationality: string[];
  marketValue?: number | null;
}

interface PlayerStatsResponse {
  stats?: Array<{
    competitionId?: string;
    competitionName?: string;
    seasonId?: string;
    clubId?: string;
    appearances?: number | null;
    goals?: number | null;
    assists?: number | null;
    minutesPlayed?: number | null;
  }>;
}

interface PlayerCandidate {
  id: string;
  name: string;
  apiPosition: string;
  position: Position;
  nationalities: string[];
  marketValue: number;
  appearances: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
}

interface OpenAiStarterSelection {
  formation: string;
  players: Array<{
    id: string;
    position: Position;
    formationSlot: number;
  }>;
}

interface SeedFile {
  teams?: SeedTeam[];
}

type SeedTeam = TeamData & {
  clubId?: string;
  difficulty?: Difficulty;
};

const TRANSFERMARKT_BASE_URL = process.env.TRANSFERMARKT_API_BASE_URL ?? 'https://transfermarkt-api.fly.dev';
const TRANSFERMARKT_TIMEOUT_MS = Number(process.env.TRANSFERMARKT_API_TIMEOUT_MS ?? 8000);
const POSITION_VALUES = new Set<Position>(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF']);
const args = parseArgs(process.argv.slice(2));

if (!args.club && !args.clubId) {
  throw new Error('Provide --club "Club Name" or --club-id 123.');
}

const clubId = args.clubId ?? await searchClubId(args.club);
if (!clubId) throw new Error(`Could not resolve club "${args.club}".`);

const [profile, squad] = await Promise.all([
  fetchJson<ClubProfileResponse>(`/clubs/${encodeURIComponent(clubId)}/profile`),
  fetchJson<ClubPlayersResponse>(`/clubs/${encodeURIComponent(clubId)}/players?season_id=${encodeURIComponent(args.season)}`),
]);

const clubName = normalizeClubName(profile?.name ?? args.club);
const logoUrl = profile?.image ?? '';
const league = args.league ?? profile?.league?.name ?? profile?.league?.id ?? 'Unknown League';
const rawPlayers = squad?.players ?? [];

if (rawPlayers.length < 11) {
  const seedTeam = await findSeedFallback(args.seedPath, {
    clubId,
    clubName,
    requestedClub: args.club,
    season: args.season,
  });

  if (!seedTeam) {
    throw new Error(`Transfermarkt returned only ${rawPlayers.length} players for ${clubName} ${args.season}, and no local seed fallback matched.`);
  }

  const enrichedSeedTeam = await new TransfermarktBackupService().enrichTeamData(seedTeam);
  await outputTeam(enrichedSeedTeam, seedTeam.clubId ?? clubId, args.provider, args.difficulty ?? seedTeam.difficulty ?? getDifficulty(args.season));
  process.exit(0);
}

const candidates = await enrichCandidatesWithStats(rawPlayers, clubId, args.season);
const starterSelection = await selectStarters(candidates, clubName, args.season, league);
const team = await buildTeamData({
  clubId,
  clubName,
  logoUrl,
  league,
  season: args.season,
  candidates,
  starterSelection,
});
await outputTeam(team, clubId, args.provider, args.difficulty ?? getDifficulty(args.season));

function parseArgs(argv: string[]): Args {
  const values = new Map<string, string | boolean>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      values.set(key, true);
    } else {
      values.set(key, next);
      index += 1;
    }
  }

  return {
    club: String(values.get('club') ?? ''),
    clubId: typeof values.get('club-id') === 'string' ? String(values.get('club-id')) : undefined,
    season: String(values.get('season') ?? new Date().getFullYear()),
    league: typeof values.get('league') === 'string' ? String(values.get('league')) : undefined,
    difficulty: parseDifficulty(values.get('difficulty')),
    dryRun: values.has('dry-run'),
    provider: String(values.get('provider') ?? 'transfermarkt-openai-builder'),
    seedPath: String(values.get('seed') ?? 'data/seeds/guesstheteam-seed.json'),
  };
}

async function findSeedFallback(
  seedPath: string,
  input: { clubId: string; clubName: string; requestedClub: string; season: string },
): Promise<SeedTeam | null> {
  let seed: SeedFile;
  try {
    seed = JSON.parse(await readFile(seedPath, 'utf8')) as SeedFile;
  } catch {
    return null;
  }

  const normalizedClubNames = new Set([
    normalizeName(input.clubName),
    normalizeName(input.requestedClub),
  ]);

  const teams = seed.teams ?? [];
  return teams.find((team) => {
    const teamClubId = team.clubId ?? '';
    const sameClub = teamClubId === input.clubId || normalizedClubNames.has(normalizeName(team.name));
    return sameClub && String(team.season).startsWith(input.season);
  }) ?? null;
}

function parseDifficulty(value: string | boolean | undefined): Difficulty | undefined {
  return value === 'easy' || value === 'medium' || value === 'hard' ? value : undefined;
}

async function searchClubId(clubName: string) {
  const response = await fetchJson<ClubSearchResponse>(`/clubs/search/${encodeURIComponent(clubName)}`);
  const normalized = normalizeName(clubName);
  return response?.results?.find((club) => normalizeName(club.name ?? '') === normalized)?.id
    ?? response?.results?.[0]?.id
    ?? null;
}

async function enrichCandidatesWithStats(players: ClubPlayer[], clubId: string, season: string): Promise<PlayerCandidate[]> {
  return mapConcurrent(players, 4, async (player) => {
    const stats = await fetchJson<PlayerStatsResponse>(`/players/${encodeURIComponent(player.id)}/stats`);
    const seasonStats = (stats?.stats ?? []).filter((entry) => entry.seasonId === season);
    const clubStats = seasonStats.filter((entry) => entry.clubId === clubId);
    const relevantStats = clubStats.length > 0 ? clubStats : seasonStats;
    const totals = relevantStats.reduce((sum, entry) => ({
      appearances: sum.appearances + (entry.appearances ?? 0),
      minutesPlayed: sum.minutesPlayed + (entry.minutesPlayed ?? 0),
      goals: sum.goals + (entry.goals ?? 0),
      assists: sum.assists + (entry.assists ?? 0),
    }), { appearances: 0, minutesPlayed: 0, goals: 0, assists: 0 });

    return {
      id: player.id,
      name: player.name,
      apiPosition: player.position,
      position: mapPosition(player.position),
      nationalities: player.nationality.filter(Boolean),
      marketValue: player.marketValue ?? 0,
      ...totals,
    };
  });
}

async function selectStarters(
  candidates: PlayerCandidate[],
  clubName: string,
  season: string,
  league: string,
): Promise<OpenAiStarterSelection> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return heuristicSelection(candidates);

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: 'You build verified football starting elevens for a guessing game. Use only provided player ids. Pick exactly 11 players. Prefer season minutes and appearances over fame.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Select the most plausible Stammelf / regular starting eleven and formation. Return exactly 11 players with normalized positions and formation slots 0-10.',
            clubName,
            season,
            league,
            positionValues: [...POSITION_VALUES],
            candidates: candidates.map((player) => ({
              id: player.id,
              name: player.name,
              apiPosition: player.apiPosition,
              normalizedPosition: player.position,
              nationalities: player.nationalities,
              appearances: player.appearances,
              minutesPlayed: player.minutesPlayed,
              goals: player.goals,
              assists: player.assists,
              marketValue: player.marketValue,
            })),
          }),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'starter_selection',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              formation: { type: 'string' },
              players: {
                type: 'array',
                minItems: 11,
                maxItems: 11,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    id: { type: 'string' },
                    position: { type: 'string', enum: [...POSITION_VALUES] },
                    formationSlot: { type: 'integer', minimum: 0, maximum: 10 },
                  },
                  required: ['id', 'position', 'formationSlot'],
                },
              },
            },
            required: ['formation', 'players'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAI starter selection failed (${response.status}): ${text}`);
  }

  return sanitizeSelection(parseOpenAiJson(await response.json() as Record<string, unknown>), candidates);
}

function heuristicSelection(candidates: PlayerCandidate[]): OpenAiStarterSelection {
  const sorted = [...candidates].sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
  const picked: PlayerCandidate[] = [];

  pickByPosition(sorted, picked, ['GK'], 1);
  pickByPosition(sorted, picked, ['CB', 'LB', 'RB'], 4);
  pickByPosition(sorted, picked, ['CDM', 'CM', 'CAM', 'LM', 'RM'], 3);
  pickByPosition(sorted, picked, ['LW', 'RW', 'ST', 'CF'], 3);

  for (const player of sorted) {
    if (picked.length >= 11) break;
    if (!picked.some((existing) => existing.id === player.id)) picked.push(player);
  }

  return {
    formation: '4-3-3',
    players: picked.slice(0, 11).map((player, formationSlot) => ({
      id: player.id,
      position: player.position,
      formationSlot,
    })),
  };
}

function pickByPosition(sorted: PlayerCandidate[], picked: PlayerCandidate[], positions: Position[], count: number) {
  for (const player of sorted) {
    if (picked.length >= 11) return;
    if (picked.filter((existing) => positions.includes(existing.position)).length >= count) return;
    if (!positions.includes(player.position)) continue;
    if (!picked.some((existing) => existing.id === player.id)) picked.push(player);
  }
}

function sanitizeSelection(selection: OpenAiStarterSelection, candidates: PlayerCandidate[]): OpenAiStarterSelection {
  const candidatesById = new Map(candidates.map((player) => [player.id, player]));
  const seen = new Set<string>();
  const players = selection.players
    .filter((player) => candidatesById.has(player.id) && !seen.has(player.id) && POSITION_VALUES.has(player.position))
    .map((player) => {
      seen.add(player.id);
      return player;
    });

  if (players.length === 11) {
    return {
      formation: selection.formation || inferFormation(players),
      players: players.map((player, index) => ({
        ...player,
        formationSlot: Number.isInteger(player.formationSlot) ? player.formationSlot : index,
      })),
    };
  }

  return heuristicSelection(candidates);
}

async function buildTeamData(input: {
  clubId: string;
  clubName: string;
  logoUrl: string;
  league: string;
  season: string;
  candidates: PlayerCandidate[];
  starterSelection: OpenAiStarterSelection;
}): Promise<TeamData> {
  const candidatesById = new Map(input.candidates.map((player) => [player.id, player]));
  const players: InternalPlayer[] = input.starterSelection.players.map((starter, index) => {
    const candidate = candidatesById.get(starter.id);
    if (!candidate) throw new Error(`OpenAI selected unknown player id ${starter.id}.`);
    const [nationality, nationality2] = candidate.nationalities;

    return {
      id: candidate.id,
      name: candidate.name,
      position: starter.position,
      nationality: nationality ?? 'Unknown',
      nationality2,
      nationalityFlag: nationality ?? '',
      formationSlot: Number.isInteger(starter.formationSlot) ? starter.formationSlot : index,
      career: [{
        clubId: input.clubId,
        clubName: input.clubName,
        logoUrl: input.logoUrl,
        fromYear: Number(input.season),
        toYear: null,
      }],
    };
  });

  const team: TeamData & { clubId?: string } = {
    id: `${slugify(input.clubName)}-${input.season}`,
    clubId: input.clubId,
    name: input.clubName,
    season: input.season,
    league: input.league,
    logoUrl: input.logoUrl,
    formation: input.starterSelection.formation || inferFormation(input.starterSelection.players),
    players,
  };

  return new TransfermarktBackupService().enrichTeamData(team);
}

function toTeamSeasonRow(team: TeamData, clubId: string, provider: string, difficulty: Difficulty) {
  return {
    id: team.id,
    club_id: clubId,
    source_game_id: null,
    name: team.name,
    season: team.season,
    league: team.league,
    logo_url: team.logoUrl ?? '',
    formation: team.formation,
    difficulty,
    provider,
    team,
  };
}

async function outputTeam(team: TeamData, clubId: string, provider: string, difficulty: Difficulty) {
  const row = toTeamSeasonRow(team, clubId, provider, difficulty);

  if (args.dryRun) {
    console.log(JSON.stringify(row, null, 2));
    return;
  }

  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('team_seasons')
    .upsert(row, { onConflict: 'id' });

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  console.log(`Built and synced ${team.name} ${team.season} (${team.formation}) with ${team.players.length} starters.`);
}

function parseOpenAiJson(body: Record<string, unknown>): OpenAiStarterSelection {
  if (typeof body.output_text === 'string') return JSON.parse(body.output_text) as OpenAiStarterSelection;

  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== 'object') continue;
      const text = (contentItem as { text?: unknown }).text;
      if (typeof text === 'string') return JSON.parse(text) as OpenAiStarterSelection;
    }
  }

  throw new Error('OpenAI response did not contain parseable JSON.');
}

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  return createClient(url, serviceRoleKey);
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSFERMARKT_TIMEOUT_MS);

  try {
    const url = new URL(path, TRANSFERMARKT_BASE_URL);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });

    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function scoreCandidate(player: PlayerCandidate) {
  return player.minutesPlayed + player.appearances * 90 + player.marketValue / 100000;
}

function mapPosition(position: string): Position {
  const normalized = normalizeName(position);
  if (normalized.includes('goalkeeper')) return 'GK';
  if (normalized.includes('leftback')) return 'LB';
  if (normalized.includes('rightback')) return 'RB';
  if (normalized.includes('centreback') || normalized.includes('centerback')) return 'CB';
  if (normalized.includes('defensivemidfield')) return 'CDM';
  if (normalized.includes('attackingmidfield')) return 'CAM';
  if (normalized.includes('leftmidfield')) return 'LM';
  if (normalized.includes('rightmidfield')) return 'RM';
  if (normalized.includes('leftwing')) return 'LW';
  if (normalized.includes('rightwing')) return 'RW';
  if (normalized.includes('centreforward') || normalized.includes('centerforward')) return 'ST';
  if (normalized.includes('secondstriker')) return 'CF';
  if (normalized.includes('midfield')) return 'CM';
  if (normalized.includes('defender')) return 'CB';
  if (normalized.includes('forward') || normalized.includes('striker')) return 'ST';
  return 'CM';
}

function inferFormation(players: Array<{ position: Position }>) {
  const defenders = players.filter((player) => ['CB', 'LB', 'RB'].includes(player.position)).length || 4;
  const attackers = players.filter((player) => ['LW', 'RW', 'ST', 'CF'].includes(player.position)).length || 3;
  const midfielders = Math.max(1, 10 - defenders - attackers);
  return `${defenders}-${midfielders}-${attackers}`;
}

function getDifficulty(season: string): Difficulty {
  const year = Number(season.slice(0, 4));
  if (year >= 2018) return 'easy';
  if (year >= 2010) return 'medium';
  return 'hard';
}

function normalizeClubName(name: string) {
  return name
    .replace(/^Football\s+Club\s+Internazionale\s+Milano.*$/i, 'Inter Milan')
    .replace(/^Fu[sß]ball-Club\s+Bayern\s+M[uü]nchen.*$/i, 'Bayern Munich')
    .replace(/^Leeds\s+United\s+Association\s+FC$/i, 'Leeds United')
    .replace(/\s+Football Club$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
