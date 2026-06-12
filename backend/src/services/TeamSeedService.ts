import { readFileSync } from 'node:fs';
import path from 'node:path';
import { REAL_MADRID_2223, PLAYER_SEARCH_POOL } from '../data/mockTeams';
import type { Difficulty, PlayMode, TeamData } from '../types';

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
}

const DEFAULT_SEED_PATH = path.resolve(process.cwd(), 'data/seeds/footyguesser-seed.json');

export class TeamSeedService {
  private seed: SeedFile | null | undefined;

  constructor(private seedPath = process.env.FOOTYGUESSER_SEED_PATH ?? DEFAULT_SEED_PATH) {}

  selectTeam(options: TeamSelectionOptions): TeamData {
    const teams = this.getTeams();
    if (teams.length === 0) return REAL_MADRID_2223;

    const filtered = this.filterTeams(teams, options);
    const pool = filtered.length > 0 ? filtered : teams;
    const index = Math.floor(Math.random() * pool.length);

    return pool[index];
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
}
