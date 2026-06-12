import { PlayerMatchService } from './PlayerMatchService';
import { TeamSeedService } from './TeamSeedService';

export class PlayerSearchService {
  private matcher = new PlayerMatchService();

  constructor(private teamSeedService = new TeamSeedService()) {}

  search(query: string, limit: number) {
    const normalizedQuery = this.matcher.normalize(query);
    if (normalizedQuery.length < 2) return [];

    return this.teamSeedService
      .searchPlayers(query, limit)
      .filter((result) => this.matcher.normalize(result.name).includes(normalizedQuery));
  }
}
