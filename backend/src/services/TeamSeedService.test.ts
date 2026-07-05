import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env';
import { WORLD_CUP_TEAMS } from '../data/worldCupTeams';
import { TeamSeedService } from './TeamSeedService';

describe('TeamSeedService', () => {
  beforeEach(() => {
    env.GUESSTHETEAM_TEAM_SOURCE = 'seed';
  });

  it('selects World Cup teams from the national-team pool', async () => {
    const enrichTeam = vi.fn();
    const service = new TeamSeedService('/tmp/missing-guesstheteam-seed.json', { enrichTeam } as never);
    const target = WORLD_CUP_TEAMS.find((team) => team.id === 'worldcup-france-2022');
    const excludeTeamIds = WORLD_CUP_TEAMS
      .filter((team) => team.id !== target?.id)
      .map((team) => team.id);

    const team = await service.selectTeam({
      playMode: 'worldcup',
      difficulty: 'medium',
      excludeTeamIds,
    });

    expect(team).toMatchObject({
      id: 'worldcup-france-2022',
      name: 'Frankreich',
      league: 'WM-Modus',
    });
    expect(team.players).toHaveLength(11);
    expect(team.players.every((player) => player.career.length > 0)).toBe(true);
    expect(team.players.every((player) => player.career[0].logoUrl)).toBe(true);
    expect(enrichTeam).not.toHaveBeenCalled();
  });

  it('includes World Cup players in the search pool', async () => {
    const service = new TeamSeedService('/tmp/missing-guesstheteam-seed.json');

    const results = await service.searchPlayers('mbappe', 5);

    expect(results).toContainEqual({ name: 'Kylian Mbappe' });
  });
});
