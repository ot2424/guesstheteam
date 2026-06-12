import type { UserProfile, Rank, MatchResult } from '../types';

export const RANKS: Rank[] = [
  'Bronze 3', 'Bronze 2', 'Bronze 1',
  'Silver 3', 'Silver 2', 'Silver 1',
  'Gold 3', 'Gold 2', 'Gold 1',
  'Platinum 3', 'Platinum 2', 'Platinum 1',
];

export const RANK_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  Bronze:   { text: '#CD7F32', bg: '#2A1A0A', border: '#CD7F32' },
  Silver:   { text: '#C0C0C0', bg: '#1A1A2A', border: '#C0C0C0' },
  Gold:     { text: '#F59E0B', bg: '#2A1E00', border: '#F59E0B' },
  Platinum: { text: '#22D3EE', bg: '#001A2A', border: '#22D3EE' },
};

export function getRankTier(rank: Rank) {
  return rank.split(' ')[0] as keyof typeof RANK_COLORS;
}

export function getLevelFromXP(xp: number): number {
  // Every 500 XP = 1 level
  return Math.floor(xp / 500) + 1;
}

export function getXPToNextLevel(xp: number): { current: number; needed: number } {
  return { current: xp % 500, needed: 500 };
}

export function getRankFromLP(lp: number): Rank {
  const index = Math.min(Math.floor(lp / 100), RANKS.length - 1);
  return RANKS[Math.max(0, index)];
}

export const MOCK_USER: UserProfile = {
  id: 'user-1',
  username: 'FootballFan99',
  xp: 1340,
  level: 3,
  lp: 285,
  rank: 'Silver 3',
  badges: ['first_win', 'speed_demon', 'hat_trick'],
  matchesPlayed: 24,
  matchesWon: 14,
  winStreak: 3,
};

export const BADGES: Record<string, { name: string; description: string; icon: string }> = {
  first_win:    { name: 'Erster Sieg',          description: 'Erstes Match gewonnen',             icon: '🏆' },
  speed_demon:  { name: 'Blitzrater',            description: 'Team in unter 60 Sekunden gelöst', icon: '⚡' },
  hat_trick:    { name: 'Hat-Trick',             description: '3 Matches in Folge gewonnen',      icon: '🎩' },
  iron_will:    { name: 'Eiserner Wille',        description: '10 Matches gespielt',              icon: '💪' },
  eagle_eye:    { name: 'Adlerauge',             description: '5× alle 11 Spieler erraten',       icon: '🦅' },
  globetrotter: { name: 'Weltenbummler',         description: 'Team aus 5 verschiedenen Ligen',   icon: '🌍' },
};

export const MOCK_MATCH_HISTORY: MatchResult[] = [
  { teamName: 'Real Madrid', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', season: '2022/23', solved: 11, total: 11, durationSec: 187, isWin: true,  xpGained: 150, lpChange: 25  },
  { teamName: 'Real Madrid', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', season: '2022/23', solved: 7,  total: 11, durationSec: 310, isWin: false, xpGained: 50,  lpChange: -20 },
  { teamName: 'Real Madrid', teamLogo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', season: '2022/23', solved: 11, total: 11, durationSec: 245, isWin: true,  xpGained: 150, lpChange: 25  },
];
