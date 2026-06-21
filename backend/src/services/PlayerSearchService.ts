import { PlayerMatchService } from './PlayerMatchService';
import { TeamSeedService } from './TeamSeedService';

export class PlayerSearchService {
  private matcher = new PlayerMatchService();

  constructor(private teamSeedService = new TeamSeedService()) {}

  async search(query: string, limit: number) {
    const normalizedQuery = this.matcher.normalize(query);
    if (normalizedQuery.length < 2) return [];

    const candidates = await this.teamSeedService.searchPlayers(query, limit);
    return candidates.filter((result) => this.matcher.normalize(result.name).includes(normalizedQuery));
  }
}
