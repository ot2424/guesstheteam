import { describe, expect, it } from 'vitest';
import { getDetailedPositionLabel, getLeagueLabel, getPositionGroup, getPositionLabel } from './footballDisplay';

describe('footballDisplay', () => {
  it('prints readable league labels from Transfermarkt competition codes', () => {
    expect(getLeagueLabel('L1')).toBe('Bundesliga');
    expect(getLeagueLabel('GB1')).toBe('Premier League');
    expect(getLeagueLabel('IT1')).toBe('Serie A');
    expect(getLeagueLabel('Unknown League')).toBe('Unknown League');
  });

  it('groups positions into the general labels used on cards', () => {
    expect(getPositionLabel('GK')).toBe('Torwart');
    expect(getPositionLabel('CB')).toBe('Verteidiger');
    expect(getPositionLabel('CDM')).toBe('Mittelfeld');
    expect(getPositionLabel('LW')).toBe('Angreifer');
    expect(getPositionGroup('CAM')).toBe('midfielder');
  });

  it('shows detailed football abbreviations on the board', () => {
    expect(getDetailedPositionLabel('GK')).toBe('TW');
    expect(getDetailedPositionLabel('CDM')).toBe('ZDM');
    expect(getDetailedPositionLabel('CAM')).toBe('ZOM');
    expect(getDetailedPositionLabel('ST')).toBe('MS');
    expect(getDetailedPositionLabel('LW')).toBe('LF');
    expect(getDetailedPositionLabel('RW')).toBe('RF');
  });
});
