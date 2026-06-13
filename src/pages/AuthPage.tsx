import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';

type AuthMode = 'login' | 'register';

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, isSupabaseReady } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await signIn({ email, password });
        navigate('/');
        return;
      }

      const signUpMessage = await signUp({ username, firstName, lastName, email, password });
      if (signUpMessage) {
        setMessage(signUpMessage);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--night)' }}>
      <div className="w-full max-w-md rounded-xl border border-gray-800 p-6" style={{ background: '#111827' }}>
        <div className="mb-6">
          <div className="bebas text-3xl tracking-wider text-white">
            {mode === 'login' ? 'Einloggen' : 'Account erstellen'}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login'
              ? 'Melde dich an, damit Level, Rang und Fortschritt gespeichert werden.'
              : 'Erstelle dein Spielerprofil fuer Fortschritt, Rang und spaetere Freischaltungen.'}
          </p>
        </div>

        {!isSupabaseReady && (
          <div className="mb-4 rounded-lg border border-yellow-800/60 px-3 py-2 text-xs text-yellow-300" style={{ background: 'rgba(245,158,11,0.08)' }}>
            Supabase ist noch nicht konfiguriert. Setze `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                Username
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  minLength={3}
                  className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs text-gray-500">
                  Vorname
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                    className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-500">
                  Nachname
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                    className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
                  />
                </label>
              </div>
            </>
          )}

          <label className="flex flex-col gap-1 text-xs text-gray-500">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-gray-500">
            Passwort
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
            />
          </label>

          {error && <div className="text-xs text-red-400">{error}</div>}
          {message && <div className="text-xs text-green-300">{message}</div>}

          <button
            type="submit"
            disabled={submitting || !isSupabaseReady}
            className="mt-2 rounded-lg px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: '#22C55E', color: '#0A0E1A' }}
          >
            {submitting ? 'Bitte warten...' : mode === 'login' ? 'Einloggen' : 'Registrieren'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
            setMessage(null);
          }}
          className="mt-4 w-full text-xs text-gray-400 hover:text-gray-200"
        >
          {mode === 'login' ? 'Noch keinen Account? Registrieren' : 'Schon registriert? Einloggen'}
        </button>
      </div>
    </div>
  );
}
