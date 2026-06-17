import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { JerseyIcon } from '../components/ui/JerseyIcon';
import { useAuth } from '../lib/useAuth';

type Mode = 'login' | 'register';

const cardStyle = { background: 'linear-gradient(180deg,#0e141d,#0a0e16)', borderColor: 'rgba(255,255,255,0.08)' } as const;
const inputStyle = { background: '#0f1722', borderColor: 'rgba(255,255,255,0.1)' } as const;

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, isSupabaseReady } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
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
      setError(getAuthErrorMessage(err, mode));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden" style={{ background: '#06090f' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(50% 50% at 50% 28%, rgba(34,197,94,0.1), transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-4xl rounded-3xl border overflow-hidden flex flex-col md:flex-row"
        style={{ ...cardStyle, boxShadow: '0 30px 80px rgba(0,0,0,0.55)' }}
      >
        {/* ── Marken-Panel ── */}
        <div className="relative md:w-[44%] p-8 sm:p-10 overflow-hidden flex flex-col" style={{ background: 'linear-gradient(160deg,#0c1a12,#0a0e16)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 50% at 30% 18%, rgba(34,197,94,0.16), transparent 70%)' }} />
          <div className="absolute -left-16 -bottom-16 w-80 h-80 rounded-full pointer-events-none" style={{ border: '2px solid rgba(255,255,255,0.05)' }} />
          <div className="absolute left-5 bottom-10 w-60 h-60 rounded-full pointer-events-none" style={{ border: '2px solid rgba(255,255,255,0.05)' }} />

          <div className="relative flex items-center gap-3">
            <JerseyIcon size={34} color="#22c55e" />
            <span className="font-extrabold tracking-[0.14em] text-white">GUESSTHETEAM</span>
          </div>

          <div className="relative mt-auto pt-12">
            <h2 className="bebas text-white leading-[0.94] tracking-wide mb-4" style={{ fontSize: 'clamp(40px, 5vw, 54px)' }}>
              {mode === 'login' ? <>Willkommen<br />zurück</> : <>Werde<br />zur Legende</>}
            </h2>
            <p className="text-sm leading-relaxed mb-6 max-w-xs" style={{ color: '#9aa4b2' }}>
              {mode === 'login'
                ? 'Melde dich an, damit Level, Rang und Fortschritt gespeichert werden.'
                : 'Erstelle deinen Account und sichere dir XP, Rang und Abzeichen.'}
            </p>
            <div className="flex flex-col gap-2.5">
              {['Dein Level & XP gespeichert', 'Ranglisten-Platzierung', 'Abzeichen & Match-Verlauf'].map((t) => (
                <div key={t} className="flex items-center gap-2.5 text-sm" style={{ color: '#cfd6e0' }}>
                  <span style={{ color: '#22c55e' }}>✓</span> {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Formular-Panel ── */}
        <div className="flex-1 p-8 sm:p-12 flex flex-col justify-center">
          {/* Tabs */}
          <div className="flex gap-1.5 p-1.5 rounded-xl mb-7" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className="flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition-all"
                style={mode === m
                  ? { background: '#22C55E', color: '#04130a' }
                  : { background: 'transparent', color: '#8b95a5' }}
              >
                {m === 'login' ? 'Einloggen' : 'Registrieren'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col">
            {!isSupabaseReady && (
              <div className="mb-4 rounded-xl border border-yellow-800/60 px-3 py-2 text-xs text-yellow-300" style={{ background: 'rgba(245,158,11,0.08)' }}>
                Supabase ist noch nicht konfiguriert. Setze VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY.
              </div>
            )}

            {mode === 'register' && (
              <>
                <label className="text-xs font-semibold mb-1.5" style={{ color: '#8b95a5' }}>Benutzername</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="dein_name"
                  className="h-12 rounded-xl border px-3.5 mb-4 text-[15px] text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
                  style={inputStyle}
                  autoComplete="username"
                  required
                  minLength={3}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8b95a5' }}>Vorname</label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Max"
                      className="h-12 w-full rounded-xl border px-3.5 mb-4 text-[15px] text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
                      style={inputStyle}
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8b95a5' }}>Nachname</label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Mustermann"
                      className="h-12 w-full rounded-xl border px-3.5 mb-4 text-[15px] text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
                      style={inputStyle}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <label className="text-xs font-semibold mb-1.5" style={{ color: '#8b95a5' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="max@beispiel.de"
              className="h-12 rounded-xl border px-3.5 mb-4 text-[15px] text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
              style={inputStyle}
              autoComplete="email"
              required
            />

            <label className="text-xs font-semibold mb-1.5" style={{ color: '#8b95a5' }}>Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 rounded-xl border px-3.5 mb-6 text-[15px] text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
              style={inputStyle}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />

            {error && <div className="text-sm text-red-400 mb-4">{error}</div>}
            {message && <div className="text-sm text-green-300 mb-4">{message}</div>}

            <button
              type="submit"
              disabled={loading || !isSupabaseReady}
              className="h-13 py-3.5 rounded-xl font-extrabold text-base transition-all active:scale-95 disabled:opacity-50"
              style={{ background: '#22C55E', color: '#04130a', boxShadow: '0 12px 28px rgba(34,197,94,0.3)' }}
            >
              {loading ? 'Bitte warten…' : mode === 'login' ? 'Einloggen' : 'Account erstellen'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-3 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Zur Startseite →
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function getAuthErrorMessage(error: unknown, mode: Mode) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('invalid login credentials')) {
    return 'Email oder Passwort ist falsch. Falls du noch keinen Account hast, registriere dich bitte zuerst.';
  }

  if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
    return 'Bitte bestaetige zuerst deine Email-Adresse und versuche es danach erneut.';
  }

  if (message.includes('user already registered') || message.includes('already registered') || message.includes('already exists')) {
    return 'Mit dieser Email existiert bereits ein Account. Bitte logge dich ein.';
  }

  if (message.includes('signup disabled')) {
    return 'Registrierung ist aktuell deaktiviert.';
  }

  if (message.includes('password')) {
    return mode === 'register'
      ? 'Das Passwort ist zu schwach oder zu kurz. Bitte nutze mindestens 6 Zeichen.'
      : 'Das Passwort ist falsch.';
  }

  if (message.includes('email')) {
    return 'Bitte pruefe die Email-Adresse.';
  }

  return mode === 'login'
    ? 'Einloggen fehlgeschlagen. Bitte pruefe deine Daten.'
    : 'Registrierung fehlgeschlagen. Bitte pruefe deine Angaben.';
}
