import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { MatchType, PlayMode, SeriesProgress, UserProfile } from '../types';

export type AuthContextValue = {
  user: UserProfile;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSupabaseReady: boolean;
  signIn: (payload: { email: string; password: string }) => Promise<void>;
  signUp: (payload: { username: string; firstName: string; lastName: string; email: string; password: string }) => Promise<string | null>;
  signOut: () => Promise<void>;
  syncProfile: (profile: UserProfile) => void;
  applyMatchResult: (result: {
    resultId: string;
    playMode?: PlayMode;
    matchType?: MatchType;
    series?: SeriesProgress;
    isWin: boolean;
    xpGained: number;
    lpChange: number;
  }) => Promise<UserProfile>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
