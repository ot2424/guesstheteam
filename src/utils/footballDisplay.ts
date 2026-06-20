import type { Position } from '../types';

const LEAGUE_LABELS: Record<string, string> = {
  L1: 'Bundesliga',
  GB1: 'Premier League',
  ES1: 'La Liga',
  IT1: 'Serie A',
  FR1: 'Ligue 1',
  CL: 'Champions League',
};

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: 'Torwart',
  defender: 'Verteidiger',
  midfielder: 'Mittelfeld',
  attacker: 'Angreifer',
};

const DETAILED_POSITION_LABELS: Record<Position, string> = {
  GK: 'TW',
  CB: 'IV',
  LB: 'LV',
  RB: 'RV',
  CDM: 'DM',
  CM: 'ZM',
  CAM: 'OM',
  LW: 'LF',
  RW: 'RF',
  ST: 'ST',
  CF: 'HS',
};

export type PositionGroup = keyof typeof POSITION_LABELS;

export function getLeagueLabel(league: string) {
  return LEAGUE_LABELS[league] ?? league;
}

export function getPositionGroup(position: Position): PositionGroup {
  if (position === 'GK') return 'goalkeeper';
  if (position === 'CB' || position === 'LB' || position === 'RB') return 'defender';
  if (position === 'CDM' || position === 'CM' || position === 'CAM') return 'midfielder';
  return 'attacker';
}

export function getPositionLabel(position: Position) {
  return POSITION_LABELS[getPositionGroup(position)];
}

export function getDetailedPositionLabel(position: Position) {
  return DETAILED_POSITION_LABELS[position] ?? position;
}
