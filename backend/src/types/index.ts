export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'tutorial' | 'single' | 'series';
export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST' | 'CF';

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
  mode: GameMode;
  difficulty: Difficulty;
  startedAt: number;
  team: Omit<TeamData, 'players'> & { players: PublicPlayer[] };
  players: Record<string, SessionPlayer>;
}

export interface AuthenticatedRequestUser {
  id: string;
}
