import 'dotenv/config';
import { createReadStream, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { createClient } from '@supabase/supabase-js';
import { TransfermarktBackupService } from '../backend/src/services/TransfermarktBackupService';
import type { CareerClub, Difficulty, InternalPlayer, Position, TeamData } from '../backend/src/types';

interface Args {
  club: string;
  clubId?: string;
  season: string;
  league?: string;
  difficulty?: Difficulty;
  dryRun: boolean;
  provider: string;
  seedPath: string;
  datasetSource: string;
  apiFirst: boolean;
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
  sourceGameId?: string;
};

type Row = Record<string, string>;

interface DatasetClub {
  clubId: string;
  name: string;
  competitionId: string;
}

interface DatasetGame {
  gameId: string;
  season: number;
  date: string;
  competitionId: string;
  homeClubId: string;
  awayClubId: string;
  homeFormation: string;
  awayFormation: string;
}

interface DatasetPlayer {
  playerId: string;
  name: string;
  position: string;
  nationality: string;
  nationality2?: string;
}

interface DatasetLineupPlayer {
  playerId: string;
  position: string;
}

const TRANSFERMARKT_BASE_URL = process.env.TRANSFERMARKT_API_BASE_URL ?? 'https://transfermarkt-api.fly.dev';
const TRANSFERMARKT_TIMEOUT_MS = Number(process.env.TRANSFERMARKT_API_TIMEOUT_MS ?? 8000);
const POSITION_VALUES = new Set<Position>(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF']);
const KNOWN_CLUB_IDS: Record<string, string> = {
  'ac milan': '5',
  ajax: '610',
  arsenal: '11',
  'atalanta': '800',
  'atletico madrid': '13',
  barcelona: '131',
  'bayer leverkusen': '15',
  'bayern munich': '27',
  benfica: '294',
  'borussia dortmund': '16',
  chelsea: '631',
  'deportivo la coruna': '897',
  feyenoord: '234',
  fiorentina: '430',
  'hamburger sv': '41',
  'inter milan': '46',
  juventus: '506',
  lazio: '398',
  liverpool: '31',
  lyon: '1041',
  'manchester city': '281',
  'manchester united': '985',
  marseille: '244',
  monaco: '162',
  napoli: '6195',
  'newcastle united': '762',
  parma: '130',
  'paris saint-germain': '583',
  porto: '720',
  psv: '383',
  'rb leipzig': '23826',
  'real madrid': '418',
  roma: '12',
  'schalke 04': '33',
  sevilla: '368',
  'sporting cp': '336',
  'tottenham hotspur': '148',
  valencia: '1049',
  'vfb stuttgart': '79',
  villarreal: '1050',
  'werder bremen': '86',
};
const args = parseArgs(process.argv.slice(2));

if (!args.club && !args.clubId) {
  throw new Error('Provide --club "Club Name" or --club-id 123.');
}

const clubId = args.clubId ?? getKnownClubId(args.club) ?? await searchClubId(args.club) ?? await searchDatasetClubId(args.datasetSource, args.club);
if (!clubId) throw new Error(`Could not resolve club "${args.club}".`);

const profile = await fetchJson<ClubProfileResponse>(`/clubs/${encodeURIComponent(clubId)}/profile`);
const clubName = normalizeClubName(profile?.name ?? args.club);
const logoUrl = profile?.image ?? '';
const league = args.league ?? profile?.league?.name ?? profile?.league?.id ?? 'Unknown League';

if (!args.apiFirst) {
  const datasetTeam = await findDatasetFallback(args.datasetSource, {
    clubId,
    clubName,
    requestedClub: args.club,
    season: args.season,
    league,
  });

  if (datasetTeam) {
    const enrichedDatasetTeam = await new TransfermarktBackupService().enrichTeamData(datasetTeam);
    await outputTeam(enrichedDatasetTeam, datasetTeam.clubId ?? clubId, args.provider, args.difficulty ?? datasetTeam.difficulty ?? getDifficulty(args.season));
    process.exit(0);
  }
}

const squad = await fetchJson<ClubPlayersResponse>(`/clubs/${encodeURIComponent(clubId)}/players?season_id=${encodeURIComponent(args.season)}`);
const rawPlayers = squad?.players ?? [];

if (rawPlayers.length < 11) {
  const seedTeam = await findSeedFallback(args.seedPath, {
    clubId,
    clubName,
    requestedClub: args.club,
    season: args.season,
  });

  if (!seedTeam) {
    const datasetTeam = await findDatasetFallback(args.datasetSource, {
      clubId,
      clubName,
      requestedClub: args.club,
      season: args.season,
      league,
    });

    if (!datasetTeam) {
      throw new Error(`Transfermarkt returned only ${rawPlayers.length} players for ${clubName} ${args.season}, and no local seed or dataset fallback matched.`);
    }

    const enrichedDatasetTeam = await new TransfermarktBackupService().enrichTeamData(datasetTeam);
    await outputTeam(enrichedDatasetTeam, datasetTeam.clubId ?? clubId, args.provider, args.difficulty ?? datasetTeam.difficulty ?? getDifficulty(args.season));
    process.exit(0);
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
    datasetSource: String(values.get('dataset-source') ?? 'data/transfermarkt'),
    apiFirst: values.has('api-first'),
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

async function findDatasetFallback(
  source: string,
  input: { clubId: string; clubName: string; requestedClub: string; season: string; league: string },
): Promise<SeedTeam | null> {
  const season = Number(input.season);
  if (!Number.isFinite(season)) return null;

  const clubs = await readDatasetClubs(source);
  const club = clubs.get(input.clubId) ?? findClubByName(clubs, input.clubName) ?? findClubByName(clubs, input.requestedClub);
  if (!club) return null;

  const games = await readDatasetGames(source, club.clubId, season);
  if (games.length === 0) return null;

  const lineups = await readDatasetLineups(source, new Set(games.map((game) => game.gameId)), club.clubId);
  const selectedGame = games.find((game) => (lineups.get(game.gameId)?.length ?? 0) >= 11);
  if (!selectedGame) return null;

  const starters = lineups.get(selectedGame.gameId)?.slice(0, 11) ?? [];
  const players = await readDatasetPlayers(source, new Set(starters.map((starter) => starter.playerId)));
  const seedPlayers = starters
    .map((starter, index) => toDatasetSeedPlayer(starter, index, season, players, club))
    .filter((player): player is InternalPlayer => Boolean(player));

  if (seedPlayers.length !== 11) return null;

  const formation = selectedGame.homeClubId === club.clubId
    ? selectedGame.homeFormation
    : selectedGame.awayFormation;

  return {
    id: `${slugify(club.name)}-${season}`,
    sourceGameId: selectedGame.gameId,
    clubId: club.clubId,
    name: club.name,
    season: String(season),
    league: input.league || club.competitionId || selectedGame.competitionId,
    logoUrl: getTransfermarktLogoUrl(club.clubId),
    formation: formation || inferFormation(seedPlayers),
    difficulty: getDifficulty(String(season)),
    players: seedPlayers,
  };
}

function parseDifficulty(value: string | boolean | undefined): Difficulty | undefined {
  return value === 'easy' || value === 'medium' || value === 'hard' ? value : undefined;
}

async function readDatasetClubs(source: string) {
  const clubs = new Map<string, DatasetClub>();

  for await (const row of readCsv(resolveCsv(source, 'clubs'))) {
    const clubId = get(row, 'club_id');
    const name = get(row, 'pretty_name') || get(row, 'name');
    if (!clubId || !name) continue;

    clubs.set(clubId, {
      clubId,
      name: normalizeClubName(name),
      competitionId: get(row, 'domestic_competition_id'),
    });
  }

  return clubs;
}

function findClubByName(clubs: Map<string, DatasetClub>, clubName: string) {
  const normalized = normalizeName(clubName);
  return [...clubs.values()].find((club) => normalizeName(club.name) === normalized)
    ?? [...clubs.values()].find((club) => normalizeName(club.name).includes(normalized) || normalized.includes(normalizeName(club.name)))
    ?? null;
}

async function readDatasetGames(source: string, clubId: string, season: number) {
  const games: DatasetGame[] = [];

  for await (const row of readCsv(resolveCsv(source, 'games'))) {
    if (Number(get(row, 'season')) !== season) continue;
    const homeClubId = get(row, 'home_club_id');
    const awayClubId = get(row, 'away_club_id');
    if (homeClubId !== clubId && awayClubId !== clubId) continue;

    games.push({
      gameId: get(row, 'game_id'),
      season,
      date: get(row, 'date'),
      competitionId: get(row, 'competition_id'),
      homeClubId,
      awayClubId,
      homeFormation: get(row, 'home_club_formation'),
      awayFormation: get(row, 'away_club_formation'),
    });
  }

  return games
    .filter((game) => game.gameId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

async function readDatasetLineups(source: string, gameIds: Set<string>, clubId: string) {
  const lineups = new Map<string, DatasetLineupPlayer[]>();

  for await (const row of readCsv(resolveCsv(source, 'game_lineups'))) {
    const gameId = get(row, 'game_id');
    if (!gameIds.has(gameId)) continue;
    if (get(row, 'club_id') !== clubId) continue;
    if (!get(row, 'type').toLowerCase().includes('starting')) continue;

    const playerId = get(row, 'player_id');
    if (!playerId) continue;

    const lineup = lineups.get(gameId) ?? [];
    lineup.push({
      playerId,
      position: get(row, 'position'),
    });
    lineups.set(gameId, lineup);
  }

  return lineups;
}

async function readDatasetPlayers(source: string, playerIds: Set<string>) {
  const players = new Map<string, DatasetPlayer>();

  for await (const row of readCsv(resolveCsv(source, 'players'))) {
    const playerId = get(row, 'player_id');
    if (!playerIds.has(playerId)) continue;

    players.set(playerId, {
      playerId,
      name: get(row, 'name'),
      position: get(row, 'sub_position') || get(row, 'position') || 'Unknown',
      ...getNationalities(row),
    });
  }

  return players;
}

function toDatasetSeedPlayer(
  lineupPlayer: DatasetLineupPlayer,
  formationSlot: number,
  season: number,
  players: Map<string, DatasetPlayer>,
  club: DatasetClub,
): InternalPlayer | null {
  const player = players.get(lineupPlayer.playerId);
  if (!player?.name) return null;

  return {
    id: player.playerId,
    name: player.name,
    position: mapPosition(lineupPlayer.position || player.position),
    nationality: player.nationality,
    nationality2: player.nationality2,
    nationalityFlag: player.nationality,
    formationSlot,
    career: [{
      clubId: club.clubId,
      clubName: club.name,
      logoUrl: getTransfermarktLogoUrl(club.clubId),
      fromYear: season,
      toYear: null,
    }],
  };
}

async function searchClubId(clubName: string) {
  const response = await fetchJson<ClubSearchResponse>(`/clubs/search/${encodeURIComponent(clubName)}`);
  const normalized = normalizeName(clubName);
  return response?.results?.find((club) => normalizeName(club.name ?? '') === normalized)?.id
    ?? response?.results?.[0]?.id
    ?? null;
}

function getKnownClubId(clubName: string) {
  return KNOWN_CLUB_IDS[normalizeReadableName(clubName)] ?? null;
}

async function searchDatasetClubId(source: string, clubName: string) {
  try {
    const clubs = await readDatasetClubs(source);
    return findClubByName(clubs, clubName)?.clubId ?? null;
  } catch {
    return null;
  }
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

  const apiEnrichedTeam = await new TransfermarktBackupService().enrichTeamData(team);
  return enrichThinCareersFromDataset(args.datasetSource, apiEnrichedTeam);
}

function toTeamSeasonRow(team: TeamData, clubId: string, provider: string, difficulty: Difficulty) {
  return {
    id: team.id,
    club_id: clubId,
    source_game_id: (team as TeamData & { sourceGameId?: string }).sourceGameId ?? null,
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

  if (error) {
    const hint = error.message.includes("Could not find the table 'public.team_seasons'")
      ? ' Run supabase/migrations/0004_create_team_seasons.sql in the Supabase SQL editor for this project, then retry.'
      : '';
    throw new Error(`Supabase upsert failed: ${error.message}.${hint}`);
  }
  console.log(`Built and synced ${team.name} ${team.season} (${team.formation}) with ${team.players.length} starters.`);
}

async function enrichThinCareersFromDataset(source: string, team: TeamData): Promise<TeamData> {
  const thinPlayers = team.players.filter((player) => player.career.length <= 1);
  if (thinPlayers.length === 0) return team;

  const careers = await readDatasetTransfers(source, new Set(thinPlayers.map((player) => player.id)));
  if (careers.size === 0) return team;

  return {
    ...team,
    players: team.players.map((player) => {
      if (player.career.length > 1) return player;

      const datasetCareer = careers.get(player.id);
      if (!datasetCareer || datasetCareer.length <= player.career.length) return player;

      return {
        ...player,
        career: datasetCareer,
      };
    }),
  };
}

async function readDatasetTransfers(source: string, playerIds: Set<string>) {
  const byPlayer = new Map<string, CareerClub[]>();

  try {
    for await (const row of readCsv(resolveCsv(source, 'transfers'))) {
      const playerId = get(row, 'player_id');
      if (!playerIds.has(playerId)) continue;

      const year = getTransferYearFromDataset(get(row, 'transfer_date'), get(row, 'transfer_season'));
      if (!year || year > new Date().getFullYear()) continue;

      const career = byPlayer.get(playerId) ?? [];
      const fromClubId = get(row, 'from_club_id');
      const fromClubName = get(row, 'from_club_name');
      const toClubId = get(row, 'to_club_id');
      const toClubName = get(row, 'to_club_name');

      if (fromClubId && fromClubName && !isDatasetFreeAgent(fromClubName)) {
        career.push({
          clubId: fromClubId,
          clubName: normalizeClubName(fromClubName),
          logoUrl: getTransfermarktLogoUrl(fromClubId),
          fromYear: year,
          toYear: year,
        });
      }

      if (toClubId && toClubName && !isDatasetFreeAgent(toClubName)) {
        career.push({
          clubId: toClubId,
          clubName: normalizeClubName(toClubName),
          logoUrl: getTransfermarktLogoUrl(toClubId),
          fromYear: year,
          toYear: null,
        });
      }

      byPlayer.set(playerId, career);
    }
  } catch {
    return new Map<string, CareerClub[]>();
  }

  return new Map(
    [...byPlayer.entries()]
      .map(([playerId, career]) => [playerId, closeDatasetCareer(compactDatasetCareer(career))] as const)
      .filter(([, career]) => career.length > 0),
  );
}

function compactDatasetCareer(career: CareerClub[]) {
  const byClub = new Map<string, CareerClub>();

  for (const item of career.sort((a, b) => a.fromYear - b.fromYear)) {
    const existing = byClub.get(item.clubId);
    if (!existing) {
      byClub.set(item.clubId, { ...item });
      continue;
    }

    existing.fromYear = Math.min(existing.fromYear, item.fromYear);
    existing.toYear = item.toYear === null || existing.toYear === null
      ? null
      : Math.max(existing.toYear, item.toYear);
  }

  return [...byClub.values()].sort((a, b) => a.fromYear - b.fromYear);
}

function closeDatasetCareer(career: CareerClub[]) {
  for (let index = 0; index < career.length - 1; index += 1) {
    const current = career[index];
    const next = career[index + 1];
    if (current.toYear === null || current.toYear > next.fromYear) {
      current.toYear = next.fromYear;
    }
  }

  return career;
}

function getTransferYearFromDataset(date: string, season: string) {
  const dateYear = Number(date.slice(0, 4));
  if (Number.isFinite(dateYear) && dateYear > 1900) return dateYear;
  const seasonYear = Number(season.match(/\d{2}\/(\d{2})/)?.[1]);
  if (Number.isFinite(seasonYear)) return seasonYear > 50 ? 1900 + seasonYear : 2000 + seasonYear;
  return null;
}

function isDatasetFreeAgent(name: string) {
  return ['without club', 'retired', 'vereinslos', 'career break', '-'].includes(name.trim().toLowerCase());
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

function getNationalities(row: Row) {
  const citizenship = get(row, 'country_of_citizenship');
  const birthCountry = get(row, 'country_of_birth');
  const nationality = citizenship || birthCountry || 'Unknown';
  const nationality2 = birthCountry && birthCountry !== nationality && isUsableCountry(birthCountry)
    ? birthCountry
    : undefined;

  return { nationality, nationality2 };
}

function isUsableCountry(country: string) {
  return !['CSSR', 'UdSSR', 'Jugoslawien (SFR)', 'East Germany (GDR)', 'Unknown'].includes(country);
}

function getTransfermarktLogoUrl(clubId: string | undefined) {
  if (!clubId || !/^\d+$/.test(clubId)) return '';
  return `https://tmssl.akamaized.net/images/wappen/big/${clubId}.png`;
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

function normalizeReadableName(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
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

async function* readCsv(filePath: string): AsyncGenerator<Row> {
  const stream = filePath.endsWith('.gz')
    ? createReadStream(filePath).pipe(createGunzip())
    : createReadStream(filePath);
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let headers: string[] | null = null;

  for await (const line of lines) {
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }

    const values = parseCsvLine(line);
    const row: Row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    yield row;
  }
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}

function get(row: Row, key: string) {
  return row[key]?.trim() ?? '';
}

function resolveCsv(source: string, name: string) {
  const csv = path.join(source, `${name}.csv`);
  const gz = `${csv}.gz`;

  if (existsSync(csv)) return csv;
  if (existsSync(gz)) return gz;
  throw new Error(`Missing ${name}.csv or ${name}.csv.gz in ${source}`);
}
