/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { hasSupabase, supabase } from './supabase';

interface AuthUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

interface SignUpPayload {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  displayName: string;
  authReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (payload: SignUpPayload) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    username: typeof user.user_metadata?.username === 'string' ? user.user_metadata.username : undefined,
    firstName: typeof user.user_metadata?.first_name === 'string' ? user.user_metadata.first_name : undefined,
    lastName: typeof user.user_metadata?.last_name === 'string' ? user.user_metadata.last_name : undefined,
  };
}

function mapAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'E-Mail oder Passwort stimmt nicht. Falls du dich gerade registriert hast, bestätige bitte zuerst deine E-Mail.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Bitte bestätige zuerst deine E-Mail. Danach kannst du dich einloggen.';
  }

  if (normalized.includes('user already registered') || normalized.includes('already registered')) {
    return 'Für diese E-Mail gibt es bereits einen Account. Bitte logge dich ein.';
  }

  if (normalized.includes('password')) {
    return 'Das Passwort erfüllt die Anforderungen nicht. Nutze mindestens 6 Zeichen.';
  }

  return message || 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.';
}

function getAuthRedirectUrl() {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}/auth`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!hasSupabase) {
      queueMicrotask(() => {
        if (active) setLoading(false);
      });
      return () => { active = false; };
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ? mapUser(data.session.user) : null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapUser(session.user) : null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    if (!hasSupabase) return { error: 'Supabase ist noch nicht konfiguriert.' };

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    return { error: error ? mapAuthError(error.message) : null };
  };

  const signUp: AuthContextValue['signUp'] = async ({ email, password, username, firstName, lastName }) => {
    if (!hasSupabase) return { error: 'Supabase ist noch nicht konfiguriert.' };

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: {
          username: username.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });

    if (error) return { error: mapAuthError(error.message) };
    return { error: null, needsEmailConfirmation: !data.session };
  };

  const signOut = async () => {
    if (hasSupabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(() => {
    const displayName = user?.username || user?.email.split('@')[0] || 'Gast';
    return {
      user,
      loading,
      isAuthenticated: Boolean(user),
      displayName,
      authReady: hasSupabase,
      signIn,
      signUp,
      signOut,
    };
  }, [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
