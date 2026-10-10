import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { JerseyIcon } from '../components/ui/JerseyIcon';
import { request } from '../lib/api';
import { parseAuthLink } from '../lib/authLinks';
import { useAuth } from '../lib/useAuth';

type Mode = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'verify-email';

const cardStyle = { background: 'linear-gradient(180deg,#0e141d,#0a0e16)', borderColor: 'rgba(255,255,255,0.08)' } as const;
const inputStyle = { background: '#0f1722', borderColor: 'rgba(255,255,255,0.1)' } as const;

export function AuthPage() {
  const navigate = useNavigate();
  const { authReady, signIn, signUp, clearSession } = useAuth();
  const [link, setLink] = useState(() => parseAuthLink(window.location.hash));
  const [mode, setMode] = useState<Mode>(() => parseAuthLink(window.location.hash)?.action ?? 'login');
  const [confirmation, setConfirmation] = useState('');
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) { setError(error); return; }
        navigate('/');
      } else if (mode === 'register') {
        const { error, needsEmailConfirmation } = await signUp({
          email,
          password,
          username,
          firstName,
          lastName,
        });
        if (error) { setError(error); return; }
        if (needsEmailConfirmation) {
          setInfo('Fast geschafft! Bitte bestätige deine E-Mail. Danach kannst du dich einloggen.');
          setMode('login');
        } else {
          navigate('/');
        }
      } else if (mode === 'forgot-password') {
        const response = await request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
        setInfo(response.message);
        setMode('login');
      } else if (mode === 'verify-email') {
        await request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: link?.token }) });
        setInfo('Deine E-Mail ist bestätigt. Du kannst dich jetzt einloggen.');
        setLink(null);
        setMode('login');
      } else {
        if (password !== confirmation) { setError('Die Passwörter stimmen nicht überein.'); return; }
        await request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: link?.token, password }) });
        clearSession();
        setPassword('');
        setConfirmation('');
        setLink(null);
        setInfo('Dein Passwort wurde geändert. Bitte melde dich neu an.');
        setMode('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.');
    } finally {
      setLoading(false);
    }
  };

  const accountAction = ['forgot-password', 'reset-password', 'verify-email'].includes(mode);

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
        <div className={`relative md:w-[44%] p-8 sm:p-10 overflow-hidden flex-col ${accountAction ? 'hidden md:flex' : 'flex'}`} style={{ background: 'linear-gradient(160deg,#0c1a12,#0a0e16)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 50% at 30% 18%, rgba(34,197,94,0.16), transparent 70%)' }} />
          <div className="absolute -left-16 -bottom-16 w-80 h-80 rounded-full pointer-events-none" style={{ border: '2px solid rgba(255,255,255,0.05)' }} />
          <div className="absolute left-5 bottom-10 w-60 h-60 rounded-full pointer-events-none" style={{ border: '2px solid rgba(255,255,255,0.05)' }} />

          <div className="relative flex items-center gap-3">
            <JerseyIcon size={34} color="#22c55e" />
            <span className="font-extrabold tracking-[0.14em] text-white">GUESSTHETEAM</span>
          </div>

          <div className="relative mt-auto pt-12">
            <h2 className="bebas text-white leading-[0.94] tracking-wide mb-4" style={{ fontSize: 'clamp(40px, 5vw, 54px)' }}>
              {mode === 'register' ? <>Werde<br />zur Legende</> : accountAction ? <>Zurück<br />ins Spiel.</> : <>Willkommen<br />zurück</>}
            </h2>
            <p className="text-sm leading-relaxed mb-6 max-w-xs" style={{ color: '#9aa4b2' }}>
              {accountAction ? 'Dein Account. Dein Fortschritt. Dein Fußballwissen. In wenigen Schritten bist du wieder dabei.' : mode === 'login'
                ? 'Melde dich an, damit Level, Rang und Fortschritt gespeichert werden.'
                : 'Erstelle deinen Account und sichere dir XP, Rang und Abzeichen.'}
            </p>
            <div className="flex flex-col gap-2.5">
              {(accountAction ? ['Dein Fortschritt bleibt gespeichert', 'Sicherer Zugang zu deinem Account', 'Bereit für das nächste Match'] : ['Dein Level & XP gespeichert', 'Ranglisten-Platzierung', 'Abzeichen & Match-Verlauf']).map((t) => (
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
          {!accountAction && <div className="flex gap-1.5 p-1.5 rounded-xl mb-7" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setLink(null); setError(null); setInfo(null); }}
                className="flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition-all"
                style={mode === m
                  ? { background: '#22C55E', color: '#04130a' }
                  : { background: 'transparent', color: '#8b95a5' }}
              >
                {m === 'login' ? 'Einloggen' : 'Registrieren'}
              </button>
            ))}
          </div>}

          {accountAction && <div className="mb-7"><p className="text-xs font-bold tracking-[0.18em] text-green-400 mb-3">DEIN ACCOUNT</p><h1 className="bebas text-4xl text-white">{mode === 'reset-password' ? 'Neues Passwort setzen' : mode === 'forgot-password' ? 'Passwort vergessen?' : 'E-Mail bestätigen'}</h1><p className="text-sm text-gray-400 mt-3 leading-relaxed">{mode === 'reset-password' ? 'Wähle ein neues Passwort mit mindestens 12 Zeichen. Danach kannst du dich wieder anmelden.' : 'Nur noch ein Schritt bis zum nächsten Match.'}</p></div>}

          <form onSubmit={handleSubmit} className="flex flex-col">
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
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#8b95a5' }}>Vorname</label>
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
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#8b95a5' }}>Nachname</label>
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

            {mode === 'login' && (
              <div className="text-xs mb-4 rounded-xl border px-3.5 py-3" style={{ color: '#8b95a5', borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)' }}>
                Nutze deine E-Mail-Adresse und dein Passwort.
              </div>
            )}

            {mode === 'verify-email' && <p className="text-sm text-gray-300 mb-5">Bestätige deine E-Mail-Adresse, um deinen Account freizuschalten.</p>}
            {mode === 'forgot-password' && <p className="text-sm text-gray-300 mb-5">Wir senden dir einen Link, mit dem du ein neues Passwort setzen kannst.</p>}
            {['login', 'register', 'forgot-password'].includes(mode) && <>
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

            </>}
            {['login', 'register', 'reset-password'].includes(mode) && <>
            <label className="text-xs font-semibold mb-1.5" style={{ color: '#8b95a5' }}>{mode === 'login' ? 'Passwort' : 'Passwort (mindestens 12 Zeichen)'}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 rounded-xl border px-3.5 mb-6 text-[15px] text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
              style={inputStyle}
              minLength={mode === 'login' ? 1 : 12}
              maxLength={256}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />

            </>}
            {mode === 'reset-password' && <>
              <label className="text-xs font-semibold mb-1.5 text-gray-400">Neues Passwort wiederholen</label>
              <input type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)}
                minLength={12} maxLength={256} autoComplete="new-password" required
                className="h-12 rounded-xl border px-3.5 mb-6 text-white focus:outline-none focus:border-green-500/50 transition-colors" style={inputStyle} />
            </>}
            {error && <div role="alert" className="text-sm text-red-400 mb-4">{error}</div>}
            {info && <div className="text-sm mb-4" style={{ color: '#2bd46a' }}>{info}</div>}
            {!authReady && (
              <div className="text-sm text-yellow-300 mb-4">
                Der Anmeldedienst ist gerade nicht verfügbar.
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !authReady}
              className="h-13 py-3.5 rounded-xl font-extrabold text-base transition-all active:scale-95 disabled:opacity-50"
              style={{ background: '#22C55E', color: '#04130a', boxShadow: '0 12px 28px rgba(34,197,94,0.3)' }}
            >
              {loading ? 'Bitte warten…' : mode === 'login' ? 'Einloggen' : mode === 'register' ? 'Account erstellen' : mode === 'forgot-password' ? 'Reset-Link senden' : mode === 'verify-email' ? 'E-Mail bestätigen' : 'Neues Passwort speichern'}
            </button>

            {mode === 'login' && <>
              <button type="button" disabled={loading} onClick={() => { setMode('forgot-password'); setError(null); setInfo(null); }}
                className="mt-4 text-sm text-green-400">Passwort vergessen?</button>
              <button type="button" disabled={loading} className="mt-3 text-sm text-gray-400" onClick={async () => {
                setError(null); setInfo(null);
                if (!email.trim()) { setError('Bitte gib oben deine E-Mail-Adresse ein.'); return; }
                setLoading(true);
                try {
                  const result = await request<{ message: string }>('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
                  setInfo(result.message);
                } catch (error) { setError(error instanceof Error ? error.message : 'Versand fehlgeschlagen.'); }
                finally { setLoading(false); }
              }}>Bestätigungs-Mail erneut senden</button>
            </>}
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
