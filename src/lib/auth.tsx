import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { MatchType, PlayMode, Rank, SeriesProgress, UserProfile } from '../types';
import { AuthContext, type AuthContextValue } from './authContext';
import { applyMatchProgress, createStarterProfile, hasAppliedResult, loadUserProfile, markResultApplied, saveUserProfile } from './localUser';
import { isSupabaseConfigured, supabase } from './supabase';

type ProfileRow = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  xp: number;
  level: number;
  lp: number;
  rank: Rank;
  badges: string[] | null;
  matches_played: number;
  matches_won: number;
  win_streak: number;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile>(() => loadUserProfile());
  const [loading, setLoading] = useState(Boolean(supabase));

  const loadProfile = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    if (!supabase || !nextSession?.user) {
      setUser(loadUserProfile());
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', nextSession.user.id)
      .maybeSingle<ProfileRow>();

    if (error) throw error;

    const nextUser = data
      ? mapProfileRow(data)
      : await createMissingProfile(nextSession);

    saveUserProfile(nextUser);
    setUser(nextUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    void supabase.auth.getSession().then(({ data }) => loadProfile(data.session)).catch(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadProfile(nextSession).catch(() => setLoading(false));
    });

    return () => data.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (payload: { email: string; password: string }) => {
    if (!supabase) throw new Error('Supabase ist noch nicht konfiguriert.');

    const { data, error } = await supabase.auth.signInWithPassword(payload);
    if (error) throw error;
    await loadProfile(data.session);
  }, [loadProfile]);

  const signUp = useCallback(async (payload: { username: string; firstName: string; lastName: string; email: string; password: string }) => {
    if (!supabase) throw new Error('Supabase ist noch nicht konfiguriert.');

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          username: payload.username,
          first_name: payload.firstName,
          last_name: payload.lastName,
        },
      },
    });
    if (error) throw error;

    if (!data.session || !data.user) {
      return 'Account erstellt. Bitte bestaetige deine Email, bevor du dich einloggst.';
    }

    const profile = mapUserToProfileRow(createStarterProfile({
      id: data.user.id,
      username: payload.username,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
    }));

    const { error: profileError } = await supabase.from('profiles').upsert(profile);
    if (profileError) throw profileError;
    await loadProfile(data.session);
    return null;
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setUser(loadUserProfile());
  }, []);

  const syncProfile = useCallback((profile: UserProfile) => {
    saveUserProfile(profile);
    setUser(profile);
  }, []);

  const applyMatchResult = useCallback(async (result: {
    resultId: string;
    playMode?: PlayMode;
    matchType?: MatchType;
    series?: SeriesProgress;
    isWin: boolean;
    xpGained: number;
    lpChange: number;
  }) => {
    if (hasAppliedResult(result.resultId)) return loadUserProfile();

    const nextUser = applyMatchProgress(loadUserProfile(), result);
    saveUserProfile(nextUser);
    markResultApplied(result.resultId);
    setUser(nextUser);

    if (supabase && session?.user) {
      const { error } = await supabase
        .from('profiles')
        .update(mapUserToProfileProgressUpdate(nextUser))
        .eq('id', session.user.id);
      if (error) throw error;
    }

    return nextUser;
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    isAuthenticated: Boolean(session),
    isSupabaseReady: isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    syncProfile,
    applyMatchResult,
  }), [applyMatchResult, loading, session, signIn, signOut, signUp, syncProfile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    xp: row.xp,
    level: row.level,
    lp: row.lp,
    rank: row.rank,
    badges: row.badges ?? [],
    matchesPlayed: row.matches_played,
    matchesWon: row.matches_won,
    winStreak: row.win_streak,
  };
}

async function createMissingProfile(session: Session): Promise<UserProfile> {
  const profile: UserProfile = {
    ...createStarterProfile({
      id: session.user.id,
      username: String(session.user.user_metadata.username ?? session.user.email?.split('@')[0] ?? 'Player'),
      firstName: String(session.user.user_metadata.first_name ?? ''),
      lastName: String(session.user.user_metadata.last_name ?? ''),
      email: session.user.email ?? '',
    }),
  };

  if (!supabase) return profile;

  const { error } = await supabase.from('profiles').upsert(mapUserToProfileRow(profile));
  if (error) throw error;
  return profile;
}

function mapUserToProfileRow(user: UserProfile) {
  return {
    id: user.id,
    username: user.username,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    xp: user.xp,
    level: user.level,
    lp: user.lp,
    rank: user.rank,
    badges: user.badges,
    matches_played: user.matchesPlayed,
    matches_won: user.matchesWon,
    win_streak: user.winStreak,
  };
}

function mapUserToProfileProgressUpdate(user: UserProfile) {
  return {
    xp: user.xp,
    level: user.level,
    lp: user.lp,
    rank: user.rank,
    badges: user.badges,
    matches_played: user.matchesPlayed,
    matches_won: user.matchesWon,
    win_streak: user.winStreak,
  };
}
