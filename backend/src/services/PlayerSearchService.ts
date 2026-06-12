import { PLAYER_SEARCH_POOL } from '../data/mockTeams';
import { PlayerMatchService } from './PlayerMatchService';

export class PlayerSearchService {
  private matcher = new PlayerMatchService();

  search(query: string, limit: number) {
    const normalizedQuery = this.matcher.normalize(query);
    if (normalizedQuery.length < 2) return [];

    return PLAYER_SEARCH_POOL
      .filter((name) => this.matcher.normalize(name).includes(normalizedQuery))
      .slice(0, limit)
      .map((name) => ({ name }));
  }
}
