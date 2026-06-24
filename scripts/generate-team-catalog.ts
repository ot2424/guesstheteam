import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Difficulty } from '../backend/src/types';

interface Args {
  out: string;
  block: number;
  blockSize: number;
  total: number;
  easy: number;
  medium: number;
  hard: number;
  append: boolean;
  deterministic: boolean;
}

interface TeamCatalogItem {
  id: number;
  team_name: string;
  season: string;
  season_id: string;
  league: string;
  difficulty: Difficulty;
}

type ClubPoolItem = {
  team_name: string;
  league: string;
  minYear?: number;
  maxYear?: number;
  excludeYears?: number[];
};

const DIFFICULTY_RULES: Record<Difficulty, { minYear: number; maxYear: number }> = {
  easy: { minYear: 2018, maxYear: 2025 },
  medium: { minYear: 2016, maxYear: 2025 },
  hard: { minYear: 2013, maxYear: 2017 },
};
const ALLOWED_LEAGUES = new Set([
  'Bundesliga',
  'Premier League',
  'La Liga',
  'Serie A',
  'Ligue 1',
  'Eredivisie',
  'Liga Portugal',
]);

const CLUB_POOLS: Record<Difficulty, ClubPoolItem[]> = {
  easy: [
    { team_name: 'Bayern Munich', league: 'Bundesliga' },
    { team_name: 'Real Madrid', league: 'La Liga' },
    { team_name: 'Barcelona', league: 'La Liga' },
    { team_name: 'Manchester City', league: 'Premier League' },
    { team_name: 'Liverpool', league: 'Premier League' },
    { team_name: 'Paris Saint-Germain', league: 'Ligue 1' },
    { team_name: 'Juventus', league: 'Serie A' },
    { team_name: 'Inter Milan', league: 'Serie A' },
    { team_name: 'AC Milan', league: 'Serie A' },
    { team_name: 'Arsenal', league: 'Premier League' },
    { team_name: 'Chelsea', league: 'Premier League' },
    { team_name: 'Atletico Madrid', league: 'La Liga' },
    { team_name: 'Manchester United', league: 'Premier League' },
    { team_name: 'Borussia Dortmund', league: 'Bundesliga' },
    { team_name: 'Tottenham Hotspur', league: 'Premier League' },
    { team_name: 'Napoli', league: 'Serie A' },
    { team_name: 'Roma', league: 'Serie A' },
    { team_name: 'Bayer Leverkusen', league: 'Bundesliga' },
    { team_name: 'Benfica', league: 'Liga Portugal' },
    { team_name: 'Porto', league: 'Liga Portugal' },
    { team_name: 'RB Leipzig', league: 'Bundesliga', minYear: 2016 },
    { team_name: 'Ajax', league: 'Eredivisie' },
    { team_name: 'Sevilla', league: 'La Liga' },
    { team_name: 'Valencia', league: 'La Liga' },
    { team_name: 'Lyon', league: 'Ligue 1' },
    { team_name: 'Marseille', league: 'Ligue 1' },
    { team_name: 'Monaco', league: 'Ligue 1' },
    { team_name: 'Sporting CP', league: 'Liga Portugal' },
  ],
  medium: [
    { team_name: 'Bayern Munich', league: 'Bundesliga' },
    { team_name: 'Real Madrid', league: 'La Liga' },
    { team_name: 'Barcelona', league: 'La Liga' },
    { team_name: 'Manchester City', league: 'Premier League' },
    { team_name: 'Liverpool', league: 'Premier League' },
    { team_name: 'Paris Saint-Germain', league: 'Ligue 1' },
    { team_name: 'Juventus', league: 'Serie A' },
    { team_name: 'Inter Milan', league: 'Serie A' },
    { team_name: 'AC Milan', league: 'Serie A' },
    { team_name: 'Manchester United', league: 'Premier League' },
    { team_name: 'Borussia Dortmund', league: 'Bundesliga' },
    { team_name: 'Arsenal', league: 'Premier League' },
    { team_name: 'Chelsea', league: 'Premier League' },
    { team_name: 'Tottenham Hotspur', league: 'Premier League' },
    { team_name: 'Atletico Madrid', league: 'La Liga' },
    { team_name: 'Bayer Leverkusen', league: 'Bundesliga' },
    { team_name: 'RB Leipzig', league: 'Bundesliga', minYear: 2016 },
    { team_name: 'Sevilla', league: 'La Liga' },
    { team_name: 'Valencia', league: 'La Liga' },
    { team_name: 'Villarreal', league: 'La Liga' },
    { team_name: 'Roma', league: 'Serie A' },
    { team_name: 'Napoli', league: 'Serie A' },
    { team_name: 'Lazio', league: 'Serie A' },
    { team_name: 'Atalanta', league: 'Serie A', minYear: 2011 },
    { team_name: 'Fiorentina', league: 'Serie A' },
    { team_name: 'Lyon', league: 'Ligue 1' },
    { team_name: 'Marseille', league: 'Ligue 1' },
    { team_name: 'Monaco', league: 'Ligue 1', minYear: 2013 },
    { team_name: 'Lille', league: 'Ligue 1' },
    { team_name: 'Ajax', league: 'Eredivisie' },
    { team_name: 'PSV', league: 'Eredivisie' },
    { team_name: 'Feyenoord', league: 'Eredivisie' },
    { team_name: 'Porto', league: 'Liga Portugal' },
    { team_name: 'Benfica', league: 'Liga Portugal' },
    { team_name: 'Sporting CP', league: 'Liga Portugal' },
    { team_name: 'Athletic Bilbao', league: 'La Liga' },
    { team_name: 'Real Sociedad', league: 'La Liga' },
    { team_name: 'Newcastle United', league: 'Premier League' },
    { team_name: 'Everton', league: 'Premier League' },
  ],
  hard: [
    { team_name: 'Werder Bremen', league: 'Bundesliga' },
    { team_name: 'Schalke 04', league: 'Bundesliga' },
    { team_name: 'Bayern Munich', league: 'Bundesliga' },
    { team_name: 'Borussia Dortmund', league: 'Bundesliga' },
    { team_name: 'Bayer Leverkusen', league: 'Bundesliga' },
    { team_name: 'Hamburger SV', league: 'Bundesliga' },
    { team_name: 'VfB Stuttgart', league: 'Bundesliga' },
    { team_name: 'VfL Wolfsburg', league: 'Bundesliga' },
    { team_name: 'Borussia Monchengladbach', league: 'Bundesliga' },
    { team_name: 'Eintracht Frankfurt', league: 'Bundesliga' },
    { team_name: 'Arsenal', league: 'Premier League' },
    { team_name: 'Manchester United', league: 'Premier League' },
    { team_name: 'Manchester City', league: 'Premier League' },
    { team_name: 'Chelsea', league: 'Premier League' },
    { team_name: 'Liverpool', league: 'Premier League' },
    { team_name: 'Tottenham Hotspur', league: 'Premier League' },
    { team_name: 'Newcastle United', league: 'Premier League', excludeYears: [2009] },
    { team_name: 'Leicester City', league: 'Premier League' },
    { team_name: 'West Ham United', league: 'Premier League' },
    { team_name: 'Everton', league: 'Premier League' },
    { team_name: 'Real Madrid', league: 'La Liga' },
    { team_name: 'Barcelona', league: 'La Liga' },
    { team_name: 'Valencia', league: 'La Liga' },
    { team_name: 'Atletico Madrid', league: 'La Liga', minYear: 2002 },
    { team_name: 'Athletic Bilbao', league: 'La Liga' },
    { team_name: 'Real Sociedad', league: 'La Liga' },
    { team_name: 'Real Betis', league: 'La Liga' },
    { team_name: 'Celta Vigo', league: 'La Liga' },
    { team_name: 'Sevilla', league: 'La Liga' },
    { team_name: 'Villarreal', league: 'La Liga' },
    { team_name: 'AC Milan', league: 'Serie A' },
    { team_name: 'Inter Milan', league: 'Serie A' },
    { team_name: 'Juventus', league: 'Serie A' },
    { team_name: 'Roma', league: 'Serie A' },
    { team_name: 'Napoli', league: 'Serie A' },
    { team_name: 'Lazio', league: 'Serie A' },
    { team_name: 'Atalanta', league: 'Serie A', minYear: 2011 },
    { team_name: 'Fiorentina', league: 'Serie A' },
    { team_name: 'Parma', league: 'Serie A' },
    { team_name: 'Sampdoria', league: 'Serie A' },
    { team_name: 'Torino', league: 'Serie A' },
    { team_name: 'Lyon', league: 'Ligue 1' },
    { team_name: 'Marseille', league: 'Ligue 1' },
    { team_name: 'Monaco', league: 'Ligue 1', excludeYears: [2011, 2012] },
    { team_name: 'Paris Saint-Germain', league: 'Ligue 1' },
    { team_name: 'Lille', league: 'Ligue 1' },
    { team_name: 'Nice', league: 'Ligue 1' },
    { team_name: 'Saint-Etienne', league: 'Ligue 1' },
    { team_name: 'Ajax', league: 'Eredivisie' },
    { team_name: 'PSV', league: 'Eredivisie' },
    { team_name: 'Feyenoord', league: 'Eredivisie' },
    { team_name: 'Porto', league: 'Liga Portugal' },
    { team_name: 'Benfica', league: 'Liga Portugal' },
    { team_name: 'Sporting CP', league: 'Liga Portugal' },
  ],
};
const CLUB_LEAGUES = new Map(
  Object.values(CLUB_POOLS)
    .flat()
    .map((club) => [normalizeKey(club.team_name), club.league]),
);

const args = parseArgs(process.argv.slice(2));
const apiKey = process.env.OPENAI_API_KEY;

if (!args.deterministic && !apiKey) {
  throw new Error('OPENAI_API_KEY is required to generate the team catalog.');
}

const existing = args.append ? await readExisting(args.out) : [];
const generated = await generateBalancedBlock(args, existing);
const merged = mergeCatalog(existing, generated);
validateCatalogNoDuplicates(merged);

await mkdir(path.dirname(args.out), { recursive: true });
await writeFile(args.out, `${JSON.stringify(merged, null, 2)}\n`);
console.log(`Wrote ${generated.length} teams for block ${args.block} to ${args.out}. Total in file: ${merged.length}.`);

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
    out: String(values.get('out') ?? 'data/seeds/team-season-catalog.json'),
    block: Number(values.get('block') ?? 1),
    blockSize: Number(values.get('block-size') ?? 100),
    total: Number(values.get('total') ?? 500),
    easy: Number(values.get('easy') ?? 34),
    medium: Number(values.get('medium') ?? 33),
    hard: Number(values.get('hard') ?? 33),
    append: values.has('append'),
    deterministic: values.has('deterministic'),
  };
}

async function readExisting(out: string): Promise<TeamCatalogItem[]> {
  try {
    return JSON.parse(await readFile(out, 'utf8')) as TeamCatalogItem[];
  } catch {
    return [];
  }
}

async function generateBalancedBlock(options: Args, existing: TeamCatalogItem[]) {
  const startId = (options.block - 1) * options.blockSize + 1;
  const easy = options.easy > 0
    ? await generateSegmentWithRetries(options, 'easy', options.easy, startId, existing)
    : [];
  const medium = options.medium > 0
    ? await generateSegmentWithRetries(options, 'medium', options.medium, startId + options.easy, [...existing, ...easy])
    : [];
  const hard = options.hard > 0
    ? await generateSegmentWithRetries(options, 'hard', options.hard, startId + options.easy + options.medium, [...existing, ...easy, ...medium])
    : [];
  return validateBlock([...easy, ...medium, ...hard], options);
}

async function generateSegmentWithRetries(
  options: Args,
  difficulty: Difficulty,
  count: number,
  startId: number,
  excluded: TeamCatalogItem[],
) {
  if (options.deterministic) return deterministicSegment(difficulty, count, startId, excluded);

  let lastError: unknown;

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      return await generateSegment(options, difficulty, count, startId, excluded);
    } catch (error) {
      lastError = error;
      console.warn(`${difficulty} catalog attempt ${attempt} failed: ${(error as Error).message}`);
    }
  }

  console.warn(`${difficulty} catalog fell back to deterministic pool after OpenAI retries: ${(lastError as Error).message}`);
  return deterministicSegment(difficulty, count, startId, excluded);
}

async function generateSegment(
  options: Args,
  difficulty: Difficulty,
  count: number,
  startId: number,
  excluded: TeamCatalogItem[],
): Promise<TeamCatalogItem[]> {
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
          content: [
            'Du bist ein erfahrener Fussball-Historiker und Daten-Analyst.',
            'Du kuratierst Team-Saisons fuer ein Fussball-Quizspiel.',
            'Gib nur valide JSON-Daten aus, keine Erklaerungen.',
            'Jeder Eintrag muss spaeter per Transfermarkt-API zu einem Club und einer Saison aufloesbar sein.',
          ].join(' '),
        },
        {
          role: 'user',
          content: buildSegmentPrompt(options, difficulty, count, startId, excluded),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'team_catalog_segment',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              teams: {
                type: 'array',
                minItems: count,
                maxItems: count,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    id: { type: 'integer', minimum: startId, maximum: startId + count - 1 },
                    team_name: { type: 'string' },
                    season: { type: 'string', pattern: '^\\d{4}/\\d{4}$' },
                    season_id: { type: 'string', pattern: '^\\d{4}$' },
                    league: { type: 'string' },
                    difficulty: { type: 'string', enum: [difficulty] },
                  },
                  required: ['id', 'team_name', 'season', 'season_id', 'league', 'difficulty'],
                },
              },
            },
            required: ['teams'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAI catalog generation failed (${response.status}): ${text}`);
  }

  const body = await response.json() as Record<string, unknown>;
  const parsed = parseOpenAiCatalog(body);
  return validateSegment(parsed.teams, difficulty, count, startId, excluded);
}

function buildSegmentPrompt(
  options: Args,
  difficulty: Difficulty,
  count: number,
  startId: number,
  excluded: TeamCatalogItem[],
) {
  const endId = startId + count - 1;
  const rangeText = difficulty === 'easy'
    ? 'Saisons 2018/2019 bis 2025/2026. Nur sehr bekannte moderne Top-Clubs: Bayern Munich, Real Madrid, Barcelona, Manchester City, Liverpool, PSG, Juventus, Inter Milan, AC Milan, Arsenal, Chelsea, Atletico Madrid, Manchester United, Borussia Dortmund, Tottenham Hotspur, Napoli, Roma, Bayer Leverkusen, Benfica, Porto, RB Leipzig, Ajax.'
    : difficulty === 'medium'
      ? 'Saisons 2016/2017 bis 2025/2026. Bekannte Euro-Dauergaeste und starke Champions-/Europa-League-Teams. Keine Nischenclubs wie Rennes oder Anderlecht.'
      : 'Saisons 2013/2014 bis 2017/2018. Aeltere, aber in der lokalen Datenquelle voll abgedeckte Top- und Nostalgie-Clubs. Noch aeltere 2000er-Ikonen brauchen spaeter einen separaten manuell geprueften Legacy-Seed.';

  return `
Erzeuge Block ${options.block} eines 500er-Katalogs fuer mein Fussball-Quizspiel.

Gib exakt ${count} Teams aus.
IDs muessen exakt von ${startId} bis ${endId} laufen.
Jeder Eintrag muss difficulty "${difficulty}" haben.
Erlaubter Bereich: ${rangeText}

Datenstruktur:
- team_name: Transfermarkt-tauglicher Vereinsname, z.B. "Real Madrid", "Bayern Munich", "Inter Milan"
- season: Anzeigeformat "YYYY/YYYY", z.B. "2003/2004"
- season_id: erstes Jahr der Saison als Transfermarkt season_id, z.B. "2003"
- league: "Bundesliga", "Premier League", "La Liga", "Serie A", "Ligue 1", "Eredivisie" oder "Liga Portugal"
- difficulty: exakt "${difficulty}"

Regeln:
- Keine Nationalteams.
- Keine Fantasienamen.
- Keine doppelten Kombinationen aus team_name + season.
- Die folgenden Team-Saisons sind VERBOTEN und duerfen exakt nicht nochmal vorkommen: ${excluded.length > 0 ? excluded.map((team) => `${team.team_name} ${team.season}`).join('; ') : 'keine'}.
- Pruefe vor der Antwort selbst, dass in deinen ${count} Eintraegen keine team_name + season Kombination doppelt ist.
- Verschiedene Saisons desselben Vereins sind erlaubt.
- Jedes Team muss eine historisch eindeutige Stammelf oder klare Kernelf besitzen.
- Antworte nur als JSON-Objekt mit Property "teams".
`.trim();
}

function validateSegment(
  teams: TeamCatalogItem[],
  difficulty: Difficulty,
  count: number,
  startId: number,
  excluded: TeamCatalogItem[],
) {
  if (teams.length !== count) {
    throw new Error(`Expected ${count} ${difficulty} teams, got ${teams.length}.`);
  }

  const endId = startId + count - 1;
  const seenIds = new Set<number>();
  const seenTeams = new Set(excluded.map((team) => `${normalizeKey(team.team_name)}-${team.season}`));

  for (const team of teams) {
    if (team.difficulty !== difficulty) throw new Error(`${team.team_name} has difficulty ${team.difficulty}, expected ${difficulty}.`);
    if (!ALLOWED_LEAGUES.has(team.league)) throw new Error(`${team.team_name} uses unsupported league ${team.league}.`);
    if (!isKnownClubLeague(team)) throw new Error(`${team.team_name} uses mismatching league ${team.league}.`);
    if (team.id < startId || team.id > endId) throw new Error(`${team.team_name} has id ${team.id}, expected ${startId}-${endId}.`);
    if (seenIds.has(team.id)) throw new Error(`Duplicate id ${team.id}.`);
    seenIds.add(team.id);

    const year = Number(team.season_id);
    const rule = DIFFICULTY_RULES[difficulty];
    if (year < rule.minYear || year > rule.maxYear) {
      throw new Error(`${team.team_name} ${team.season} violates ${difficulty} season range.`);
    }

    if (!team.season.startsWith(team.season_id)) {
      throw new Error(`${team.team_name} has mismatching season ${team.season} and season_id ${team.season_id}.`);
    }

    const key = `${normalizeKey(team.team_name)}-${team.season}`;
    if (seenTeams.has(key)) throw new Error(`Duplicate team-season ${team.team_name} ${team.season}.`);
    seenTeams.add(key);
  }

  return teams.sort((a, b) => a.id - b.id);
}

function parseOpenAiCatalog(body: Record<string, unknown>): { teams: TeamCatalogItem[] } {
  if (typeof body.output_text === 'string') return JSON.parse(body.output_text) as { teams: TeamCatalogItem[] };

  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== 'object') continue;
      const text = (contentItem as { text?: unknown }).text;
      if (typeof text === 'string') return JSON.parse(text) as { teams: TeamCatalogItem[] };
    }
  }

  throw new Error('OpenAI response did not contain parseable JSON.');
}

function validateBlock(teams: TeamCatalogItem[], options: Args) {
  const startId = (options.block - 1) * options.blockSize + 1;
  const endId = Math.min(options.total, startId + options.blockSize - 1);

  if (teams.length !== options.blockSize) {
    throw new Error(`Expected ${options.blockSize} teams, got ${teams.length}.`);
  }

  const seenIds = new Set<number>();
  const seenTeams = new Set<string>();
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };

  for (const team of teams) {
    if (seenIds.has(team.id)) throw new Error(`Duplicate id ${team.id}.`);
    seenIds.add(team.id);

    if (team.id < startId || team.id > endId) {
      throw new Error(`Team id ${team.id} is outside block range ${startId}-${endId}.`);
    }
    if (!ALLOWED_LEAGUES.has(team.league)) throw new Error(`${team.team_name} uses unsupported league ${team.league}.`);
    if (!isKnownClubLeague(team)) throw new Error(`${team.team_name} uses mismatching league ${team.league}.`);

    const year = Number(team.season_id);
    const rule = DIFFICULTY_RULES[team.difficulty];
    if (!rule || year < rule.minYear || year > rule.maxYear) {
      throw new Error(`${team.team_name} ${team.season} violates ${team.difficulty} season range.`);
    }
    counts[team.difficulty] += 1;

    if (!team.season.startsWith(team.season_id)) {
      throw new Error(`${team.team_name} has mismatching season ${team.season} and season_id ${team.season_id}.`);
    }

    const key = `${normalizeKey(team.team_name)}-${team.season}`;
    if (seenTeams.has(key)) throw new Error(`Duplicate team-season ${team.team_name} ${team.season}.`);
    seenTeams.add(key);
  }

  if (counts.easy !== options.easy || counts.medium !== options.medium || counts.hard !== options.hard) {
    throw new Error(`Expected difficulty counts easy=${options.easy}, medium=${options.medium}, hard=${options.hard}; got easy=${counts.easy}, medium=${counts.medium}, hard=${counts.hard}.`);
  }

  return teams.sort((a, b) => a.id - b.id);
}

function mergeCatalog(existing: TeamCatalogItem[], generated: TeamCatalogItem[]) {
  const byId = new Map<number, TeamCatalogItem>();

  for (const item of existing) byId.set(item.id, item);
  for (const item of generated) byId.set(item.id, item);

  return [...byId.values()].sort((a, b) => a.id - b.id);
}

function validateCatalogNoDuplicates(items: TeamCatalogItem[]) {
  const seen = new Set<string>();

  for (const item of items) {
    const key = `${normalizeKey(item.team_name)}-${item.season}`;
    if (seen.has(key)) throw new Error(`Duplicate team-season across catalog: ${item.team_name} ${item.season}.`);
    seen.add(key);
  }
}

function isKnownClubLeague(item: Pick<TeamCatalogItem, 'team_name' | 'league'>) {
  return CLUB_LEAGUES.get(normalizeKey(item.team_name)) === item.league;
}

function deterministicSegment(
  difficulty: Difficulty,
  count: number,
  startId: number,
  excluded: TeamCatalogItem[],
) {
  const seen = new Set(excluded.map((team) => `${normalizeKey(team.team_name)}-${team.season}`));
  const years = getYearsForDifficulty(difficulty);
  const teams: TeamCatalogItem[] = [];

  for (const year of years) {
    for (const club of CLUB_POOLS[difficulty]) {
      if (teams.length >= count) return teams;
      if (!isClubSeasonAllowed(club, year)) continue;
      const season = formatSeason(year);
      const key = `${normalizeKey(club.team_name)}-${season}`;
      if (seen.has(key)) continue;

      seen.add(key);
      teams.push({
        id: startId + teams.length,
        team_name: club.team_name,
        season,
        season_id: String(year),
        league: club.league,
        difficulty,
      });
    }
  }

  if (teams.length >= count) return teams;
  throw new Error(`Deterministic pool could only fill ${teams.length}/${count} ${difficulty} teams.`);
}

function isClubSeasonAllowed(club: ClubPoolItem, year: number) {
  if (club.minYear !== undefined && year < club.minYear) return false;
  if (club.maxYear !== undefined && year > club.maxYear) return false;
  if (club.excludeYears?.includes(year)) return false;
  return true;
}

function getYearsForDifficulty(difficulty: Difficulty) {
  const rule = DIFFICULTY_RULES[difficulty];
  const years = [];
  for (let year = rule.minYear; year <= rule.maxYear; year += 1) {
    years.push(year);
  }
  return years;
}

function formatSeason(year: number) {
  return `${year}/${year + 1}`;
}

function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}
