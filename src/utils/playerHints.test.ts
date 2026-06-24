import { describe, expect, it } from 'vitest';
import { getClubInitials, getCurrentClub } from './playerHints';
import type { PlayerCard } from '../types';

function player(career: PlayerCard['career']): PlayerCard {
  return {
    id: 'p1',
    position: 'CM',
    nationality: 'Germany',
    nationalityFlag: '🇩🇪',
    formationSlot: 5,
    career,
  };
}

describe('playerHints', () => {
  it('returns the latest real current club and ignores non-club career entries', () => {
    expect(getCurrentClub(player([
      { clubId: 'bayern', clubName: 'Bayern Munich', logoUrl: 'bayern.png', fromYear: 2018, toYear: 2023 },
      { clubId: 'free-agent', clubName: 'Vereinslos', logoUrl: '', fromYear: 2023, toYear: 2024 },
      { clubId: 'real', clubName: 'Real Madrid', logoUrl: 'real.png', fromYear: 2024, toYear: null },
    ]))?.clubName).toBe('Real Madrid');
  });

  it('falls back to the last real club for retired players', () => {
    expect(getCurrentClub(player([
      { clubId: 'inter', clubName: 'Inter Milan', logoUrl: 'inter.png', fromYear: 2014, toYear: 2022 },
      { clubId: 'career-ended', clubName: 'Karriereende', logoUrl: '', fromYear: 2022, toYear: 2022 },
    ]))?.clubName).toBe('Inter Milan');
  });

  it('creates compact club initials for logo fallbacks', () => {
    expect(getClubInitials('Football Club Internazionale Milano S.p.A.')).toBe('IM');
    expect(getClubInitials('FC Barcelona Youth')).toBe('B');
    expect(getClubInitials('')).toBe('GT');
  });
});
