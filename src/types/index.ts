export type Difficulty = 'easy' | 'medium' | 'hard';
export type PlayMode = 'casual' | 'ranked';
export type MatchType = 'single' | 'series';
export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST' | 'CF';
export type Rank = 'Bronze 3' | 'Bronze 2' | 'Bronze 1' | 'Silver 3' | 'Silver 2' | 'Silver 1' | 'Gold 3' | 'Gold 2' | 'Gold 1' | 'Platinum 3' | 'Platinum 2' | 'Platinum 1';

export interface CareerClub {
  clubId: string;
  clubName: string;
  logoUrl: string;
  fromYear: number;
  toYear: number | null; // null = present
  appearances?: number;
}

export interface PlayerCard {
  id: string;
  position: Position;
  nationality: string;        // e.g. "Spain"
  nationality2?: string;      // second nationality, if any
  nationalityFlag: string;    // emoji flag or URL
  formationSlot: number;      // 0–10 (for formation layout)
  career: CareerClub[];
  // name is NEVER sent here in real app — backend only
  // For mock/tutorial we include it
  name?: string;
}

export interface Formation {
  name: string; // "4-3-3"
  slots: Array<{
    slot: number;
    position: Position;
    x: number; // 0–100 percent
    y: number; // 0–100 percent
  }>;
}

export interface Team {
  id: string;
  name: string;
  season: string;
  league: string;
  logoUrl: string;
  formation: string;
  players: PlayerCard[];
}

export interface GuessState {
  playerId: string;
  solved: boolean;
  guessedName?: string;
  attempts: number;
  revealed: boolean; // flip open
}

export interface GameSession {
  sessionId: string;
  team: Omit<Team, 'players'> & { players: Omit<PlayerCard, 'name'>[] };
  guesses: Record<string, GuessState>;
  startedAt: number;
  finishedAt?: number;
  playMode: PlayMode;
  matchType: MatchType;
  difficulty: Difficulty;
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  xp: number;
  level: number;
  lp: number;
  rank: Rank;
  badges: string[];
  matchesPlayed: number;
  matchesWon: number;
  winStreak: number;
}

export interface MatchResult {
  teamName: string;
  teamLogo: string;
  season: string;
  solved: number;
  total: number;
  durationSec: number;
  isWin: boolean;
  xpGained: number;
  lpChange: number;
}
