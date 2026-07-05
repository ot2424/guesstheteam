import { describe, expect, it } from 'vitest';
import { OnlineMatchupService } from './OnlineMatchupService';
import type { InternalPlayer, TeamData } from '../types';
import type { PublicProfile } from './ProfileService';

const USER_A = '00000000-0000-0000-0000-000000000001';
const USER_B = '00000000-0000-0000-0000-000000000002';

function profile(id: string, username: string): PublicProfile {
  return {
    id,
    username,
    firstName: username,
    lastName: '',
    email: `${username}@example.com`,
    xp: 0,
    level: 25,
    lp: 0,
    rank: 'Bronze 3',
    badges: [],
    matchesPlayed: 0,
    matchesWon: 0,
    winStreak: 0,
    bestWinStreak: 0,
    inventory: { skipShields: 0, autoSolveJokers: 0 },
    unlockedRewards: [],
    prestige: { emblem: 'bronze', nameGlow: null },
  };
}

function player(index: number, name: string): InternalPlayer {
  return {
    id: `p-${index}`,
    name,
    position: index === 1 ? 'GK' : 'ST',
    nationality: 'Germany',
    nationalityFlag: 'DE',
    formationSlot: index - 1,
    career: [{ clubId: 'club', clubName: 'Club', logoUrl: 'https://example.com/logo.svg', fromYear: 2020, toYear: null }],
  };
}

function team(): TeamData {
  return {
    id: 'team-online',
    name: 'Online FC',
    season: '2024',
    league: 'Bundesliga',
    logoUrl: 'https://example.com/team.svg',
    formation: '4-3-3',
    players: [
      player(1, 'Manuel Neuer'),
      player(2, 'Thomas Mueller'),
      player(3, 'Toni Kroos'),
      player(4, 'Kai Havertz'),
    ],
  };
}

describe('OnlineMatchupService', () => {
  it('lets friends play the same team and decides by solved players', async () => {
    const profiles = new Map([
      ['token-a', profile(USER_A, 'spieler1')],
      ['token-b', profile(USER_B, 'spieler2')],
    ]);
    const profileService = {
      getProfile: async (token?: string) => profiles.get(token ?? '') ?? null,
    };
    const teamSeedService = {
      selectTeam: async () => team(),
    };
    const service = new OnlineMatchupService(profileService as never, teamSeedService as never);

    const created = await service.create('token-a', USER_B);
    expect('error' in created).toBe(false);
    if ('error' in created) return;

    const joined = await service.join('token-b', created.id);
    expect(joined?.status).toBe('active');

    const firstGuess = await service.guess('token-a', created.id, 'Neuer');
    const secondGuess = await service.guess('token-a', created.id, 'Toni Kroos');
    const rivalGuess = await service.guess('token-b', created.id, 'Kai Havertz');
    expect(firstGuess?.correct).toBe(true);
    expect(secondGuess?.matchup.self.solved).toBe(2);
    expect(rivalGuess?.matchup.self.solved).toBe(1);

    const aFinished = await service.finish('token-a', created.id);
    expect(aFinished?.self.finished).toBe(true);
    const completed = await service.finish('token-b', created.id);

    expect(completed?.status).toBe('completed');
    expect(completed?.winnerId).toBe(USER_A);
  });
});
