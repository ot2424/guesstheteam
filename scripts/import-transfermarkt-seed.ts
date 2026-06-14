import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';

type Row = Record<string, string>;

interface ClubRecord {
  clubId: string;
  name: string;
  competitionId: string;
}

interface PlayerRecord {
  playerId: string;
  name: string;
  position: string;
  nationality: string;
  nationality2?: string;
  imageUrl?: string;
}

interface GameRecord {
  gameId: string;
  season: number;
  date: string;
  competitionId: string;
  homeClubId: string;
  awayClubId: string;
}

interface LineupPlayer {
  playerId: string;
  position: string;
}

interface CareerClub {
  clubId: string;
  clubName: string;
  fromYear: number;
  toYear: number | null;
}

interface SeedPlayer {
  id: string;
  name: string;
  position: string;
  nationality: string;
  nationality2?: string;
  nationalityFlag: string;
  formationSlot: number;
  career: CareerClub[];
}

interface SeedTeam {
  id: string;
  sourceGameId: string;
  clubId: string;
  name: string;
  season: string;
  league: string;
  logoUrl: string;
  formation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  players: SeedPlayer[];
}

interface Args {
  source: string;
  out: string;
  limit: number;
  minSeason: number;
  maxSeason: number;
  competitions: Set<string>;
  logos: 'thesportsdb' | 'none';
  logoCache: string;
  logoDelayMs: number;
}

const DEFAULT_COMPETITIONS = ['L1', 'GB1', 'ES1', 'IT1', 'FR1', 'CL'];
const THESPORTSDB_SEARCH_URL = 'https://www.thesportsdb.com/api/v1/json/123/searchteams.php';
const SPORTSDB_QUERY_ALIASES: Record<string, string> = {
  'Association Football Club Bournemouth': 'Bournemouth',
  'Associazione Calcio Milan': 'AC Milan',
  'Associazione Sportiva Roma': 'Roma',
  'Athletic Club Bilbao': 'Athletic Bilbao',
  'Bayern Muenchen': 'Bayern Munich',
  'Calcio Como': 'Como',
  'Chelsea FC': 'Chelsea',
  'Crystal Palace FC': 'Crystal Palace',
  'Football Club Lorient-Bretagne Sud': 'Lorient',
  'Football Club de Metz': 'Metz',
  'Futbol Club Barcelona': 'Barcelona',
  'Leeds United Association FC': 'Leeds',
  'Newcastle United FC': 'Newcastle',
  "Olympique Gymnaste Club Nice Côte d'Azur": 'Nice',
  'Olympique de Marseille': 'Marseille',
  'Paris Saint-Germain FC': 'PSG',
  'Real Betis Balompié': 'Real Betis',
  'Real Madrid Club de Fútbol': 'Real Madrid',
  'Società Sportiva Calcio Napoli': 'Napoli',
  'Società Sportiva Lazio S.p.A.': 'Lazio',
  'Torino Calcio': 'Torino',
  'Unione Sportiva Lecce': 'Lecce',
  'Verona Hellas FC': 'Hellas Verona',
};
const CLUB_NAME_ALIASES: Record<string, string> = {
  '3': '1. FC Koeln',
  '4': '1. FC Nuernberg',
  '15': 'Bayer Leverkusen',
  '16': 'Borussia Dortmund',
  '18': 'Borussia Moenchengladbach',
  '24': 'Eintracht Frankfurt',
  '27': 'Bayern Muenchen',
  '33': 'Schalke 04',
  '39': 'Mainz 05',
  '41': 'Hamburger SV',
  '44': 'Hertha BSC',
  '60': 'SC Freiburg',
  '79': 'VfB Stuttgart',
  '82': 'VfL Wolfsburg',
  '86': 'Werder Bremen',
  '89': 'Union Berlin',
  '167': 'FC Augsburg',
  '533': 'TSG Hoffenheim',
  '23826': 'RB Leipzig',
};
const POSITION_MAP: Record<string, string> = {
  Goalkeeper: 'GK',
  Defender: 'CB',
  'Left-Back': 'LB',
  'Right-Back': 'RB',
  'Centre-Back': 'CB',
  Midfield: 'CM',
  'Defensive Midfield': 'CDM',
  'Central Midfield': 'CM',
  'Attacking Midfield': 'CAM',
  Attack: 'ST',
  'Left Winger': 'LW',
  'Right Winger': 'RW',
  'Centre-Forward': 'ST',
  'Second Striker': 'CF',
};

const args = parseArgs(process.argv.slice(2));

const clubs = await readClubs(args);
const players = await readPlayers(args);
const games = await readGames(args);
const lineups = await readLineups(args, new Set(games.map((game) => game.gameId)));
const selectedTeams = selectTeams({ args, clubs, players, games, lineups });
const careers = await readCareers(args, new Set(selectedTeams.flatMap((team) => team.players.map((player) => player.id))), clubs);
const logoLookup = args.logos === 'thesportsdb'
  ? await createTheSportsDbLogoLookup(args.logoCache)
  : null;
const teamLogos = new Map<string, string>();

if (logoLookup) {
  for (const teamName of new Set(selectedTeams.map((team) => team.name))) {
    teamLogos.set(teamName, await logoLookup.getBadge(teamName));
    if (args.logoDelayMs > 0) await delay(args.logoDelayMs);
  }
}

const teams = selectedTeams.map((team) => ({
  ...team,
  logoUrl: teamLogos.get(team.name) ?? team.logoUrl,
  players: team.players.map((player) => ({
    ...player,
    career: careers.get(player.id) ?? player.career,
  })),
}));

await logoLookup?.save();

await mkdir(path.dirname(args.out), { recursive: true });
await writeFile(
  args.out,
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: {
      provider: 'dcaribou/transfermarkt-datasets',
      minSeason: args.minSeason,
      maxSeason: args.maxSeason,
      competitions: [...args.competitions],
      logos: args.logos,
    },
    teams,
    players: [...new Map(teams.flatMap((team) => team.players).map((player) => [player.id, {
      id: player.id,
      name: player.name,
      position: player.position,
      nationality: player.nationality,
      nationality2: player.nationality2,
    }])).values()],
  }, null, 2)}\n`,
);

console.log(`Wrote ${teams.length} team seasons to ${args.out}`);

function parseArgs(argv: string[]): Args {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    values.set(token.slice(2), argv[index + 1] ?? '');
    index += 1;
  }

  return {
    source: values.get('source') ?? 'data/transfermarkt',
    out: values.get('out') ?? 'data/seeds/guesstheteam-seed.json',
    limit: Number(values.get('limit') ?? 80),
    minSeason: Number(values.get('min-season') ?? 2018),
    maxSeason: Number(values.get('max-season') ?? 2026),
    competitions: new Set((values.get('competitions') ?? DEFAULT_COMPETITIONS.join(',')).split(',').map((value) => value.trim()).filter(Boolean)),
    logos: values.get('logos') === 'none' ? 'none' : 'thesportsdb',
    logoCache: values.get('logo-cache') ?? 'data/cache/thesportsdb-team-logos.json',
    logoDelayMs: Number(values.get('logo-delay-ms') ?? 300),
  };
}

async function readClubs(options: Args) {
  const clubs = new Map<string, ClubRecord>();

  for await (const row of readCsv(resolveCsv(options.source, 'clubs'))) {
    const clubId = get(row, 'club_id');
    if (!clubId) continue;

    clubs.set(clubId, {
      clubId,
      name: getDisplayClubName(clubId, get(row, 'pretty_name') || get(row, 'name') || `Club ${clubId}`),
      competitionId: get(row, 'domestic_competition_id'),
    });
  }

  return clubs;
}

async function readPlayers(options: Args) {
  const players = new Map<string, PlayerRecord>();

  for await (const row of readCsv(resolveCsv(options.source, 'players'))) {
    const playerId = get(row, 'player_id');
    const name = get(row, 'name');
    if (!playerId || !name) continue;

    players.set(playerId, {
      playerId,
      name,
      position: get(row, 'sub_position') || get(row, 'position') || 'Unknown',
      ...getNationalities(row),
      imageUrl: get(row, 'image_url'),
    });
  }

  return players;
}

async function readGames(options: Args) {
  const games: GameRecord[] = [];

  for await (const row of readCsv(resolveCsv(options.source, 'games'))) {
    const season = Number(get(row, 'season'));
    const competitionId = get(row, 'competition_id');
    if (!season || season < options.minSeason || season > options.maxSeason) continue;
    if (options.competitions.size > 0 && !options.competitions.has(competitionId)) continue;

    games.push({
      gameId: get(row, 'game_id'),
      season,
      date: get(row, 'date'),
      competitionId,
      homeClubId: get(row, 'home_club_id'),
      awayClubId: get(row, 'away_club_id'),
    });
  }

  return games.filter((game) => game.gameId && game.homeClubId && game.awayClubId);
}

async function readLineups(options: Args, gameIds: Set<string>) {
  const lineups = new Map<string, LineupPlayer[]>();

  for await (const row of readCsv(resolveCsv(options.source, 'game_lineups'))) {
    const gameId = get(row, 'game_id');
    if (!gameIds.has(gameId)) continue;

    const type = get(row, 'type').toLowerCase();
    if (type && !type.includes('starting')) continue;

    const clubId = get(row, 'club_id');
    const playerId = get(row, 'player_id');
    if (!clubId || !playerId) continue;

    const key = `${gameId}:${clubId}`;
    const playersForTeam = lineups.get(key) ?? [];
    playersForTeam.push({
      playerId,
      position: get(row, 'position'),
    });
    lineups.set(key, playersForTeam);
  }

  return lineups;
}

function selectTeams(input: {
  args: Args;
  clubs: Map<string, ClubRecord>;
  players: Map<string, PlayerRecord>;
  games: GameRecord[];
  lineups: Map<string, LineupPlayer[]>;
}) {
  const teams: SeedTeam[] = [];
  const seenTeamSeasons = new Set<string>();

  for (const game of input.games.sort((a, b) => b.date.localeCompare(a.date))) {
    for (const clubId of [game.homeClubId, game.awayClubId]) {
      const club = input.clubs.get(clubId);
      if (!club) continue;

      const teamSeasonKey = `${clubId}:${game.season}`;
      if (seenTeamSeasons.has(teamSeasonKey)) continue;

      const starters = input.lineups.get(`${game.gameId}:${clubId}`) ?? [];
      if (starters.length < 11) continue;

      const seedPlayers = starters
        .slice(0, 11)
        .map((lineupPlayer, index) => toSeedPlayer(lineupPlayer, index, game.season, input.players, club))
        .filter((player): player is SeedPlayer => Boolean(player));

      if (seedPlayers.length !== 11) continue;

      seenTeamSeasons.add(teamSeasonKey);
      teams.push({
        id: `${clubId}-${game.season}`,
        sourceGameId: game.gameId,
        clubId,
        name: club.name,
        season: String(game.season),
        league: game.competitionId,
        logoUrl: '',
        formation: '4-3-3',
        difficulty: getDifficulty(game.season),
        players: seedPlayers,
      });
    }
  }

  return spreadTeamsBySeason(teams, input.args.limit);
}

function toSeedPlayer(lineupPlayer: LineupPlayer, formationSlot: number, season: number, players: Map<string, PlayerRecord>, club: ClubRecord): SeedPlayer | null {
  const player = players.get(lineupPlayer.playerId);
  if (!player) return null;

  const mappedPosition = POSITION_MAP[lineupPlayer.position] ?? POSITION_MAP[player.position] ?? inferPosition(formationSlot);

  return {
    id: player.playerId,
    name: player.name,
    position: mappedPosition,
    nationality: player.nationality,
    nationality2: player.nationality2,
    nationalityFlag: player.nationality,
    formationSlot,
    career: [{
      clubId: club.clubId,
      clubName: club.name,
      fromYear: season,
      toYear: null,
    }],
  };
}

async function readCareers(options: Args, playerIds: Set<string>, clubs: Map<string, ClubRecord>) {
  const transferPath = tryResolveCsv(options.source, 'transfers');
  const careers = new Map<string, CareerClub[]>();

  if (!transferPath) return careers;

  for await (const row of readCsv(transferPath)) {
    const playerId = get(row, 'player_id');
    if (!playerIds.has(playerId)) continue;

    const transferSeason = get(row, 'transfer_season');
    const fromYear = Number(transferSeason.slice(0, 4)) || Number(get(row, 'transfer_date').slice(0, 4)) || 0;
    const fromClubId = get(row, 'from_club_id');
    const toClubId = get(row, 'to_club_id');
    const fromClubName = get(row, 'from_club_name') || clubs.get(fromClubId)?.name;
    const toClubName = get(row, 'to_club_name') || clubs.get(toClubId)?.name;

    const current = careers.get(playerId) ?? [];

    if (fromClubId && fromClubName && fromYear) {
      current.push({ clubId: fromClubId, clubName: fromClubName, fromYear, toYear: fromYear });
    }

    if (toClubId && toClubName && fromYear) {
      current.push({ clubId: toClubId, clubName: toClubName, fromYear, toYear: null });
    }

    careers.set(playerId, compactCareer(current));
  }

  return careers;
}

function compactCareer(career: CareerClub[]) {
  const byClub = new Map<string, CareerClub>();

  for (const item of career.sort((a, b) => a.fromYear - b.fromYear)) {
    const existing = byClub.get(item.clubId);
    if (!existing) {
      byClub.set(item.clubId, { ...item });
      continue;
    }

    existing.fromYear = Math.min(existing.fromYear, item.fromYear);
    existing.toYear = item.toYear === null || existing.toYear === null ? null : Math.max(existing.toYear, item.toYear);
  }

  return [...byClub.values()].sort((a, b) => a.fromYear - b.fromYear);
}

function getDifficulty(season: number): 'easy' | 'medium' | 'hard' {
  if (season >= 2018) return 'easy';
  if (season >= 2010) return 'medium';
  return 'hard';
}

function inferPosition(index: number) {
  if (index === 0) return 'GK';
  if (index <= 4) return 'CB';
  if (index <= 7) return 'CM';
  return 'ST';
}

function spreadTeamsBySeason(teams: SeedTeam[], limit: number) {
  const bySeason = new Map<string, SeedTeam[]>();

  for (const team of teams) {
    const seasonTeams = bySeason.get(team.season) ?? [];
    seasonTeams.push(team);
    bySeason.set(team.season, seasonTeams);
  }

  const seasons = [...bySeason.keys()].sort((a, b) => Number(b) - Number(a));
  const selected: SeedTeam[] = [];
  let offset = 0;

  while (selected.length < limit) {
    let added = false;

    for (const season of seasons) {
      const team = bySeason.get(season)?.[offset];
      if (!team) continue;
      selected.push(team);
      added = true;
      if (selected.length >= limit) break;
    }

    if (!added) break;
    offset += 1;
  }

  return selected;
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

async function createTheSportsDbLogoLookup(cachePath: string) {
  let cache: Record<string, string | null> = {};

  try {
    cache = JSON.parse(await readFile(cachePath, 'utf8')) as Record<string, string | null>;
  } catch {
    cache = {};
  }

  return {
    async getBadge(teamName: string) {
    const query = getSportsDbQuery(teamName);
      if (!query) return '';
      if (query in cache) return cache[query] ?? '';

      try {
        const url = `${THESPORTSDB_SEARCH_URL}?t=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`TheSportsDB returned ${response.status}`);

        const text = await response.text();
        if (text.includes('error code: 1015')) throw new Error('TheSportsDB rate limited the request');

        const body = JSON.parse(text) as { teams?: SportsDbTeam[] | null };
        const badge = selectSportsDbBadge(body.teams ?? [], query);
        cache[query] = badge || null;
        return badge;
      } catch {
        return '';
      }
    },

    async save() {
      await mkdir(path.dirname(cachePath), { recursive: true });
      await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
    },
  };
}

interface SportsDbTeam {
  strTeam?: string;
  strTeamAlternate?: string;
  strSport?: string;
  strGender?: string;
  strBadge?: string;
}

function selectSportsDbBadge(teams: SportsDbTeam[], query: string) {
  const soccerTeams = teams.filter((team) => team.strSport === 'Soccer' && team.strBadge);
  const maleTeams = soccerTeams.filter((team) => team.strGender !== 'Female');
  const pool = maleTeams.length > 0 ? maleTeams : soccerTeams;
  const normalizedQuery = normalizeTeamName(query);

  const exact = pool.find((team) => [
    team.strTeam,
    ...(team.strTeamAlternate?.split(',') ?? []),
  ].some((name) => normalizeTeamName(name ?? '') === normalizedQuery));

  return exact?.strBadge ?? pool[0]?.strBadge ?? '';
}

function getSportsDbQuery(teamName: string) {
  if (SPORTSDB_QUERY_ALIASES[teamName]) return SPORTSDB_QUERY_ALIASES[teamName];

  return teamName
    .replace(/\bFC\b$/i, '')
    .replace(/\bCF\b$/i, '')
    .replace(/\bS\.?p\.?A\.?$/i, '')
    .replace(/\bS\.?p\.?a\.?$/i, '')
    .replace(/\bCalcio\b$/i, '')
    .replace(/\bFootball Club\b$/i, '')
    .replace(/\bFutbol Club\b$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeTeamName(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\b(fc|cf|football club|futbol club|calcio)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getDisplayClubName(clubId: string | undefined, name: string) {
  if (clubId && CLUB_NAME_ALIASES[clubId]) return CLUB_NAME_ALIASES[clubId];

  return name
    .replace(/^1\.\s*Fussball-\s*und\s*Sportverein\s*/i, '')
    .replace(/^1\.\s*Fu\u00dfball-\s*und\s*Sportverein\s*/i, '')
    .replace(/^Sportverein\s+Werder\s+Bremen\s+von\s+1899$/i, 'Werder Bremen')
    .replace(/^Fussball-Club\s+Bayern\s+Muenchen.*$/i, 'Bayern Muenchen')
    .replace(/^Fu\u00dfball-Club\s+Bayern\s+M\u00fcnchen.*$/i, 'Bayern Muenchen')
    .replace(/^Ballspielverein\s+Borussia\s+09\s+Dortmund.*$/i, 'Borussia Dortmund')
    .replace(/^RasenBallsport\s+Leipzig.*$/i, 'RB Leipzig')
    .replace(/\s+Football Club$/i, ' FC')
    .replace(/\s+Futbol Club$/i, ' FC')
    .replace(/\s+Club de Futbol$/i, ' CF')
    .replace(/\s+S\.?\s*A\.?\s*D\.?$/i, '')
    .replace(/\s+a\.?s\.?$/i, '')
    .replace(/\s+von\s+\d{4}$/i, '')
    .replace(/\s+\(-\d{4}\)$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
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
  const resolved = tryResolveCsv(source, name);
  if (!resolved) {
    throw new Error(`Missing ${name}.csv or ${name}.csv.gz in ${source}`);
  }

  return resolved;
}

function tryResolveCsv(source: string, name: string) {
  const csv = path.join(source, `${name}.csv`);
  const gz = path.join(source, `${name}.csv.gz`);

  if (existsSync(csv)) return csv;
  if (existsSync(gz)) return gz;
  return null;
}
