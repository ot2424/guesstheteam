/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { request } from './api';

interface AuthUser {
  id: string;
  email: string;
  username?: string;
  role?: 'user' | 'admin';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    request<{ user: AuthUser }>('/auth/me')
      .then(({ user }) => { if (active) setUser(user); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    try {
      const { user } = await request<{ user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) });
      setUser(user);
      return { error: null };
    } catch (error) { return { error: error instanceof Error ? error.message : 'Anmeldung fehlgeschlagen.' }; }
  };
  const signUp: AuthContextValue['signUp'] = async (payload) => {
    try {
      await request<{ needsEmailConfirmation: boolean }>('/auth/register', { method: 'POST', body: JSON.stringify({ ...payload, email: payload.email.trim(), username: payload.username.trim(), firstName: payload.firstName.trim(), lastName: payload.lastName.trim() }) });
      return { error: null, needsEmailConfirmation: true };
    } catch (error) { return { error: error instanceof Error ? error.message : 'Registrierung fehlgeschlagen.' }; }
  };
  const signOut = async () => {
    await request('/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(() => {
    const displayName = user?.username || user?.email.split('@')[0] || 'Gast';
    return {
      user,
      loading,
      isAuthenticated: Boolean(user),
      displayName,
      authReady: true,
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
