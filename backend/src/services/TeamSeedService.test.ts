import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env';
import { WORLD_CUP_TEAMS } from '../data/worldCupTeams';
import { TeamSeedService } from './TeamSeedService';
import { REAL_MADRID_2223 } from '../data/mockTeams';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('TeamSeedService', () => {
  beforeEach(() => {
    env.GUESSTHETEAM_TEAM_SOURCE = 'seed';
  });

  it('keeps a varied World Cup pool across countries and years', () => {
    expect(WORLD_CUP_TEAMS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(WORLD_CUP_TEAMS.map((team) => team.name)).size).toBeGreaterThanOrEqual(8);
    expect(new Set(WORLD_CUP_TEAMS.map((team) => team.season)).size).toBeGreaterThanOrEqual(8);
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

  it('avoids account history and never returns an explicitly skipped team', async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'gtt-selection-'));
    try {
      const file = path.join(directory, 'seed.json');
      const teams = ['a', 'b', 'c'].map(id => ({ ...REAL_MADRID_2223, id, name: `Team ${id}`, difficulty: 'easy' }));
      writeFileSync(file, JSON.stringify({ teams }));
      const service = new TeamSeedService(file, { enrichTeam: async (team: unknown) => team } as never);
      expect((await service.selectTeam({ playMode: 'casual', difficulty: 'easy', recentTeamIds: ['a', 'b'] })).id).toBe('c');
      expect((await service.selectTeam({ playMode: 'casual', difficulty: 'easy', recentTeamIds: ['c', 'b', 'a'], excludeTeamIds: ['c'] })).id).toBe('a');
      await expect(service.selectTeam({ playMode: 'casual', difficulty: 'easy', excludeTeamIds: ['a', 'b', 'c'] })).rejects.toThrow('kein anderes Team');
      await expect(service.selectTeam({ playMode: 'casual', difficulty: 'hard' })).rejects.toThrow('kein anderes Team');
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
