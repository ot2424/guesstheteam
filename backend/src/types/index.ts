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
  toYear: number | null;
}

export interface InternalPlayer {
  id: string;
  name: string;
  position: Position;
  nationality: string;
  nationalityFlag: string;
  formationSlot: number;
  career: CareerClub[];
}

export interface PublicPlayer {
  id: string;
  position: Position;
  nationality: string;
  nationalityFlag: string;
  formationSlot: number;
  career: CareerClub[];
}

export interface TeamData {
  id: string;
  name: string;
  season: string;
  league: string;
  logoUrl: string;
  formation: string;
  players: InternalPlayer[];
}

export interface SessionPlayer {
  name: string;
  solved: boolean;
  wrongAttempts: number;
}

export interface GameSession {
  sessionId: string;
  userId: string;
  playMode: PlayMode;
  matchType: MatchType;
  difficulty: Difficulty;
  rank: Rank;
  startedAt: number;
  team: Omit<TeamData, 'players'> & { players: PublicPlayer[] };
  players: Record<string, SessionPlayer>;
}

export interface AuthenticatedRequestUser {
  id: string;
}
