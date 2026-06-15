import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { REAL_MADRID_2223, PLAYER_SEARCH_POOL } from '../data/mockTeams';
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

interface TeamSelectionOptions {
  playMode: PlayMode;
  difficulty: Difficulty;
  leagueId?: string;
  excludeTeamIds?: string[];
}

const DEFAULT_SEED_PATH = path.resolve(process.cwd(), 'data/seeds/guesstheteam-seed.json');
const LEGACY_SEED_PATH = path.resolve(process.cwd(), 'data/seeds/footyguesser-seed.json');
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
  '399': 'Leeds United',
  '985': 'Manchester United',
  '631': 'Chelsea',
  '31': 'Liverpool',
  '11': 'Arsenal',
  '281': 'Manchester City',
  '762': 'Newcastle United',
  '148': 'Tottenham Hotspur',
};

export class TeamSeedService {
  private seed: SeedFile | null | undefined;

  constructor(
    private seedPath = process.env.GUESSTHETEAM_SEED_PATH ?? process.env.FOOTYGUESSER_SEED_PATH ?? getDefaultSeedPath(),
    private transfermarktBackup = new TransfermarktBackupService(),
  ) {}

  async selectTeam(options: TeamSelectionOptions): Promise<TeamData> {
    const teams = this.getTeams();
    if (teams.length === 0) return REAL_MADRID_2223;

    const filtered = this.filterTeams(teams, options);
    const filteredWithoutRecent = excludeTeams(filtered, options.excludeTeamIds ?? []);
    const allWithoutRecent = excludeTeams(teams, options.excludeTeamIds ?? []);
    const pool = filteredWithoutRecent.length > 0
      ? filteredWithoutRecent
      : filtered.length > 0
        ? filtered
        : allWithoutRecent.length > 0
          ? allWithoutRecent
          : teams;
    const index = Math.floor(Math.random() * pool.length);

    return this.transfermarktBackup.enrichTeam(this.toDisplayTeam(pool[index]));
  }

  searchPlayers(query: string, limit: number) {
    const normalizedQuery = query.toLowerCase().trim();
    const seedPlayers = this.getSeed()?.players?.map((player) => player.name) ?? [];
    const pool = seedPlayers.length > 0 ? seedPlayers : PLAYER_SEARCH_POOL;

    return pool
      .filter((name) => name.toLowerCase().includes(normalizedQuery))
      .slice(0, limit)
      .map((name) => ({ name }));
  }

  private filterTeams(teams: SeedTeam[], options: TeamSelectionOptions) {
    const byDifficulty = teams.filter((team) => team.difficulty === options.difficulty);

    if (options.playMode === 'casual' && options.difficulty === 'easy' && options.leagueId) {
      const fixedLeagueTeams = byDifficulty.filter((team) => team.league === options.leagueId);
      if (fixedLeagueTeams.length > 0) return fixedLeagueTeams;
    }

    return byDifficulty;
  }

  private getTeams() {
    return this.getSeed()?.teams ?? [];
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

function excludeTeams(teams: SeedTeam[], excludeTeamIds: string[]) {
  if (excludeTeamIds.length === 0) return teams;
  const excluded = new Set(excludeTeamIds);
  return teams.filter((team) => !excluded.has(team.id));
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
    .replace(/\s+S\.?\s*A\.?\s*D\.?$/i, '')
    .replace(/\s+a\.?s\.?$/i, '')
    .replace(/\s+von\s+\d{4}$/i, '')
    .replace(/\s+\(-\d{4}\)$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
