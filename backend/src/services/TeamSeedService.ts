import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { query } from '../db/pool';
import { env } from '../config/env';
import { HttpError } from '../middleware/errorHandler';
import { REAL_MADRID_2223, PLAYER_SEARCH_POOL } from '../data/mockTeams';
import { WORLD_CUP_TEAMS } from '../data/worldCupTeams';
import type { Difficulty, PlayMode, TeamData } from '../types';
import { TransfermarktBackupService } from './TransfermarktBackupService';

interface SeedFile {
  teams: SeedTeam[];
  players?: Array<{ name: string }>;
}

type SeedTeam = TeamData & {
  difficulty?: Difficulty;
  clubId?: string;
};

interface TeamSeasonRow {
  team: SeedTeam;
  difficulty: Difficulty;
}

interface TeamSelectionOptions {
  playMode: PlayMode;
  difficulty: Difficulty;
  leagueId?: string;
  excludeTeamIds?: string[];
  recentTeamIds?: string[];
}

const DEFAULT_SEED_PATH = path.resolve(process.cwd(), 'data/seeds/guesstheteam-seed.json');
const LEGACY_SEED_PATH = path.resolve(process.cwd(), 'data/seeds/footyguesser-seed.json');
const CLUB_NAME_ALIASES: Record<string, string> = {
  '3': '1. FC Koeln',
  '4': '1. FC Nuernberg',
  '35': 'St. Pauli',
  '38': 'Fortuna Dusseldorf',
  '39': 'Mainz 05',
  '42': 'Hannover 96',
  '60': 'SC Freiburg',
  '80': 'VfL Bochum',
  '167': 'FC Augsburg',
  '533': 'TSG Hoffenheim',
  '15': 'Bayer Leverkusen',
  '16': 'Borussia Dortmund',
  '18': 'Borussia Moenchengladbach',
  '24': 'Eintracht Frankfurt',
  '27': 'Bayern Muenchen',
  '33': 'Schalke 04',
  '41': 'Hamburger SV',
  '44': 'Hertha BSC',
  '79': 'VfB Stuttgart',
  '82': 'VfL Wolfsburg',
  '86': 'Werder Bremen',
  '89': 'Union Berlin',
  '23826': 'RB Leipzig',
  '46': 'Inter Milan',
  '5': 'AC Milan',
  '506': 'Juventus',
  '131': 'Barcelona',
  '418': 'Real Madrid',
  '13': 'Atletico Madrid',
  '621': 'Athletic Bilbao',
  '681': 'Real Sociedad',
  '150': 'Real Betis',
  '940': 'Celta Vigo',
  '583': 'Paris Saint-Germain',
  '244': 'Marseille',
  '1041': 'Lyon',
  '1082': 'Lille',
  '162': 'Monaco',
  '399': 'Leeds United',
  '985': 'Manchester United',
  '631': 'Chelsea',
  '31': 'Liverpool',
  '11': 'Arsenal',
  '281': 'Manchester City',
  '762': 'Newcastle United',
  '148': 'Tottenham Hotspur',
  '1003': 'Leicester City',
  '405': 'Aston Villa',
  '703': 'Nottingham Forest',
  '180': 'Southampton',
  '289': 'Sunderland',
  '379': 'West Ham United',
  '29': 'Everton',
  '294': 'Benfica',
  '720': 'Porto',
  '610': 'Ajax',
  '383': 'PSV',
  '234': 'Feyenoord',
  '368': 'Sevilla',
  '1049': 'Valencia',
  '336': 'Sporting CP',
  '430': 'Fiorentina',
  '1025': 'Bologna',
  '1038': 'Sampdoria',
  '416': 'Torino',
  '417': 'Nice',
  '618': 'Saint-Etienne',
};

export class TeamSeedService {
  private seed: SeedFile | null | undefined;
  private databaseTeams: SeedTeam[] | null | undefined;

  constructor(
    private seedPath = process.env.GUESSTHETEAM_SEED_PATH ?? process.env.FOOTYGUESSER_SEED_PATH ?? getDefaultSeedPath(),
    private transfermarktBackup = new TransfermarktBackupService(),
  ) {}

  async selectTeam(options: TeamSelectionOptions): Promise<TeamData> {
    if (options.playMode === 'worldcup') return this.selectWorldCupTeam(options);

    const teams = await this.getTeams();
    if (teams.length === 0) return REAL_MADRID_2223;

    const identities = new Set<string>();
    const uniqueTeams = teams.filter(team => {
      const identity = `${getDisplayClubName(team.clubId, team.name).toLowerCase().replace(/[^a-z0-9]/g, '')}:${parseInt(team.season, 10)}`;
      if (identities.has(identity)) return false;
      identities.add(identity);
      return true;
    });
    const filtered = this.filterTeams(uniqueTeams, options);
    const pool = selectUnplayedPool(filtered, options);
    const index = Math.floor(Math.random() * pool.length);

    const team = this.toDisplayTeam(pool[index]);
    if (!needsLiveEnrichment(team)) return team;

    return this.transfermarktBackup.enrichTeam(team);
  }

  async searchPlayers(query: string, limit: number) {
    const normalizedQuery = query.toLowerCase().trim();
    const teamPlayers = (await this.getTeams())
      .flatMap((team) => team.players)
      .map((player) => player.name);
    const worldCupPlayers = (await this.getWorldCupTeams())
      .flatMap((team) => team.players)
      .map((player) => player.name);
    const seedPlayers = this.getSeed()?.players?.map((player) => player.name) ?? [];
    const pool = uniqueNames([
      ...teamPlayers,
      ...worldCupPlayers,
      ...(seedPlayers.length > 0 ? seedPlayers : PLAYER_SEARCH_POOL),
    ]);

    return pool
      .filter((name) => name.toLowerCase().includes(normalizedQuery))
      .slice(0, limit)
      .map((name) => ({ name }));
  }

  private async selectWorldCupTeam(options: TeamSelectionOptions): Promise<TeamData> {
    const teams = await this.getWorldCupTeams();
    const pool = selectUnplayedPool(teams, options);
    const index = Math.floor(Math.random() * pool.length);
    return this.toDisplayTeam(pool[index] ?? WORLD_CUP_TEAMS[0]);
  }

  private filterTeams(teams: SeedTeam[], options: TeamSelectionOptions) {
    const byDifficulty = teams.filter((team) => team.difficulty === options.difficulty);

    if (options.playMode === 'casual' && options.difficulty === 'easy' && options.leagueId) {
      const fixedLeagueTeams = byDifficulty.filter((team) => team.league === options.leagueId);
      return fixedLeagueTeams;
    }

    return byDifficulty;
  }

  private async getTeams() {
    if (env.GUESSTHETEAM_TEAM_SOURCE === 'postgres') {
      const databaseTeams = await this.getDatabaseTeams();
      const clubTeams = databaseTeams.filter(team => !isWorldCupTeam(team));
      if (clubTeams.length > 0) return clubTeams;
    }

    return this.getSeed()?.teams ?? [];
  }

  private async getWorldCupTeams() {
    if (env.GUESSTHETEAM_TEAM_SOURCE === 'postgres') {
      const databaseTeams = await this.getDatabaseTeams();
      const nationalTeams = databaseTeams.filter(isWorldCupTeam);
      if (nationalTeams.length > 0) return nationalTeams;
    }

    return WORLD_CUP_TEAMS;
  }

  private async getDatabaseTeams() {
    if (this.databaseTeams !== undefined) return this.databaseTeams ?? [];

    const rows = await query<TeamSeasonRow>('SELECT team, difficulty FROM team_seasons ORDER BY season DESC');
    this.databaseTeams = rows.map(row => ({ ...row.team, difficulty: row.difficulty }));
    return this.databaseTeams;
  }

  private getSeed() {
    if (this.seed !== undefined) return this.seed;

    try {
      this.seed = JSON.parse(readFileSync(this.seedPath, 'utf8')) as SeedFile;
    } catch {
      this.seed = null;
    }

    return this.seed;
  }

  private toDisplayTeam(team: SeedTeam): TeamData {
    const displayName = getDisplayClubName(team.clubId, team.name);

    return {
      ...team,
      name: displayName,
      players: team.players.map((player) => ({
        ...player,
        career: player.career.map((club) => ({
          ...club,
          clubName: getDisplayClubName(club.clubId, club.clubName),
          logoUrl: club.logoUrl ?? '',
        })),
      })),
    };
  }
}


function getDefaultSeedPath() {
  return existsSync(DEFAULT_SEED_PATH) ? DEFAULT_SEED_PATH : LEGACY_SEED_PATH;
}

function needsLiveEnrichment(team: TeamData) {
  if (!team.logoUrl) return true;

  const playersWithThinCareers = team.players.filter((player) => player.career.length <= 1).length;
  const careerClubs = team.players.flatMap((player) => player.career);
  const realCareerClubs = careerClubs.filter((club) => club.clubId !== 'career-ended' && club.clubId !== 'free-agent');
  const clubsMissingLogos = realCareerClubs.filter((club) => !club.logoUrl).length;

  return playersWithThinCareers > 0 || clubsMissingLogos / Math.max(1, realCareerClubs.length) > 0.2;
}

function excludeTeams(teams: SeedTeam[], excludeTeamIds: string[]) {
  if (excludeTeamIds.length === 0) return teams;
  const excluded = new Set(excludeTeamIds);
  return teams.filter((team) => !excluded.has(team.id));
}

function selectUnplayedPool(teams: SeedTeam[], options: TeamSelectionOptions) {
  const available = excludeTeams(teams, options.excludeTeamIds ?? []);
  if (!available.length) throw new HttpError(409, 'Für diese Auswahl ist gerade kein anderes Team verfügbar. Wähle eine andere Liga oder Schwierigkeit.');
  const recent = options.recentTeamIds ?? [];
  const unseen = excludeTeams(available, recent);
  if (unseen.length) return unseen;
  // Once the account has seen the whole pool, replay the least recently seen team.
  const oldest = Math.max(...available.map(team => recent.indexOf(team.id)));
  return available.filter(team => recent.indexOf(team.id) === oldest);
}

function uniqueNames(names: string[]) {
  return [...new Set(names)];
}

function isWorldCupTeam(team: SeedTeam) {
  return team.league === 'WM-Modus' || team.id.startsWith('worldcup-') || team.id.startsWith('national-');
}

function getDisplayClubName(clubId: string | undefined, name: string) {
  if (clubId && CLUB_NAME_ALIASES[clubId]) return CLUB_NAME_ALIASES[clubId];

  return name
    .replace(/^1\.\s*Fussball-\s*und\s*Sportverein\s*/i, '')
    .replace(/^1\.\s*Fu\u00dfball-\s*und\s*Sportverein\s*/i, '')
    .replace(/^Football\s+Club\s+Internazionale\s+Milano.*$/i, 'Inter Milan')
    .replace(/^Associazione\s+Calcio\s+Milan.*$/i, 'AC Milan')
    .replace(/^Associazione\s+Sportiva\s+Roma.*$/i, 'Roma')
    .replace(/^Societ[aà]\s+Sportiva\s+Calcio\s+Napoli.*$/i, 'Napoli')
    .replace(/^Societ[aà]\s+Sportiva\s+Lazio.*$/i, 'Lazio')
    .replace(/^Unione\s+Sportiva\s+Cremonese.*$/i, 'Cremonese')
    .replace(/^Atalanta\s+Bergamasca\s+Calcio.*$/i, 'Atalanta')
    .replace(/^Calcio\s+Como.*$/i, 'Como')
    .replace(/^Juventus\s+Football\s+Club.*$/i, 'Juventus')
    .replace(/^Paris\s+Saint-Germain\s+Football\s+Club$/i, 'Paris Saint-Germain')
    .replace(/^Olympique\s+de\s+Marseille$/i, 'Marseille')
    .replace(/^Club\s+Atl[eé]tico\s+de\s+Madrid.*$/i, 'Atletico Madrid')
    .replace(/^Real\s+Madrid\s+Club\s+de\s+F[uú]tbol$/i, 'Real Madrid')
    .replace(/^Sportverein\s+Werder\s+Bremen\s+von\s+1899$/i, 'Werder Bremen')
    .replace(/^Fussball-Club\s+Bayern\s+Muenchen.*$/i, 'Bayern Muenchen')
    .replace(/^Fu\u00dfball-Club\s+Bayern\s+M\u00fcnchen.*$/i, 'Bayern Muenchen')
    .replace(/^Ballspielverein\s+Borussia\s+09\s+Dortmund.*$/i, 'Borussia Dortmund')
    .replace(/^RasenBallsport\s+Leipzig.*$/i, 'RB Leipzig')
    .replace(/^Leeds\s+United\s+Association\s+FC$/i, 'Leeds United')
    .replace(/^Newcastle\s+United\s+FC$/i, 'Newcastle United')
    .replace(/^Manchester\s+United\s+Football\s+Club$/i, 'Manchester United')
    .replace(/^Manchester\s+City\s+Football\s+Club$/i, 'Manchester City')
    .replace(/^Chelsea\s+Football\s+Club$/i, 'Chelsea')
    .replace(/^Liverpool\s+Football\s+Club$/i, 'Liverpool')
    .replace(/^Arsenal\s+Football\s+Club$/i, 'Arsenal')
    .replace(/\s+Association\s+FC$/i, '')
    .replace(/\s+Football Club$/i, ' FC')
    .replace(/\s+Futbol Club$/i, ' FC')
    .replace(/\s+Club de Futbol$/i, ' CF')
    .replace(/^Associazione\s+Calcio\s+/i, '')
    .replace(/^Unione\s+Sportiva\s+/i, '')
    .replace(/^Societ[aà]\s+Sportiva\s+/i, '')
    .replace(/\s+Calcio$/i, '')
    .replace(/\s+S\.?\s*A\.?\s*D\.?$/i, '')
    .replace(/\s+a\.?s\.?$/i, '')
    .replace(/\s+von\s+\d{4}$/i, '')
    .replace(/\s+\(-\d{4}\)$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
