import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RankBadge } from '../components/ui/RankBadge';
import { XPBar } from '../components/ui/XPBar';
import { AmbientPreview } from '../components/GameplayPreview';
import { RANKED_UNLOCK_LEVEL, isRankedUnlocked } from '../data/mockUser';
import { useAuth } from '../lib/useAuth';
import { clearSavedGame, getSavedGameUrl, loadSavedGame } from '../lib/savedGame';

const DIFFICULTIES = [
  { id: 'easy',   label: 'Leicht', icon: '🟢', desc: 'Feste Liga · moderne Top-Teams · 2018-2026',        xp: 'Nur XP', color: '#22C55E' },
  { id: 'medium', label: 'Mittel', icon: '🟡', desc: 'Ligen-Mix · etablierte Euro-Clubs · 2010-2026',     xp: 'Nur XP', color: '#F59E0B' },
  { id: 'hard',   label: 'Schwer', icon: '🔴', desc: 'Ligen-Mix · historische Nostalgie-Teams · 2000-2015', xp: 'Nur XP', color: '#EF4444' },
];

const MATCH_TYPES = [
  { id: 'single', label: 'Einzel-Match',    desc: '1 Team · alle 11 Spieler erraten' },
  { id: 'series', label: '3er-Match Serie', desc: '3 Teams · mindestens 2 von 3 lösen' },
] as const;

function getRankedDifficultyLabel(rank: string) {
  if (rank.startsWith('Bronze')) return 'Leicht';
  if (rank.startsWith('Silber') || rank.startsWith('Silver')) return 'Mittel';
  return 'Schwer / Nostalgie';
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const cardStyle = { background: 'linear-gradient(180deg,#0e141d,#0a0e16)', borderColor: 'rgba(255,255,255,0.08)' } as const;

export function HomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const rankedUnlocked = isAuthenticated && isRankedUnlocked(user.level);
  const storedGame = loadSavedGame();
  const savedGame = isAuthenticated && storedGame?.userId === user.id ? storedGame : null;

  const startNewGame = (url: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    clearSavedGame();
    navigate(url);
  };

  const scrollToModes = () => {
    const el = document.getElementById('modes');
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#06090f' }}>

      {/* ═══════════ HERO (full-width, Video im Hintergrund) ═══════════ */}
      <header className="relative overflow-hidden" style={{ minHeight: '74vh' }}>
        {/* Ambient gameplay loop as background */}
        <div className="absolute inset-0 z-0">
          <AmbientPreview />
        </div>
        {/* scrims */}
        <div className="absolute inset-0 z-[1]" style={{ background: 'linear-gradient(90deg, rgba(6,9,15,0.94) 0%, rgba(6,9,15,0.78) 34%, rgba(6,9,15,0.24) 68%, rgba(6,9,15,0.38) 100%)' }} />
        <div className="absolute inset-0 z-[1]" style={{ background: 'linear-gradient(180deg, rgba(6,9,15,0.42) 0%, transparent 28%, transparent 58%, #06090f 100%)' }} />

        <div className="relative z-[2] max-w-6xl mx-auto px-4 w-full flex items-center" style={{ minHeight: '74vh' }}>
          <div className="grid w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_430px] gap-8 items-center py-24">
            <div className="max-w-2xl">
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
                <span className="text-xs font-bold tracking-[0.22em]" style={{ color: '#7ee2a8' }}>DAS FUSSBALL-RÄTSEL</span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.06 }}
                className="bebas text-white leading-[0.9] tracking-wide mb-5"
                style={{ fontSize: 'clamp(64px, 9vw, 116px)', textShadow: '0 8px 60px rgba(0,0,0,0.7)' }}>
                Erkenne<br />die <span style={{ color: '#22c55e', textShadow: '0 0 70px rgba(34,197,94,0.55)' }}>Elf</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}
                className="text-lg leading-relaxed mb-9 max-w-xl" style={{ color: '#aeb7c4' }}>
                Errate komplette Mannschaften – nur aus Position, Nationalität und Karriere-Stationen. Sammle XP, steig in der Rangliste auf, werde zur Legende.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.18 }}
                className="flex flex-wrap gap-3.5 items-center">
                <button onClick={scrollToModes}
                  className="inline-flex items-center gap-3 font-extrabold text-base px-8 py-4 rounded-xl active:scale-95 transition-transform"
                  style={{ background: '#22c55e', color: '#04130a', boxShadow: '0 14px 34px rgba(34,197,94,0.4)' }}>
                  Jetzt spielen <span className="text-lg">→</span>
                </button>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.24 }}
                className="flex flex-wrap gap-7 mt-10">
                {['Kostenlos spielbar', 'Freizeit & Ranked', 'Fortschritt speichern'].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm" style={{ color: '#8b95a5' }}>
                    <span style={{ color: '#22c55e' }}>✓</span> {t}
                  </div>
                ))}
              </motion.div>
            </div>

            <HeroCareerTip />
          </div>
        </div>
      </header>

      {/* ═══════════ Hauptinhalt ═══════════ */}
      <div className="max-w-6xl mx-auto px-4 pb-12 flex gap-6 -mt-6 relative z-[3]">
        <main className="flex-1 min-w-0">

          {isAuthenticated ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="rounded-2xl border p-4 mb-5 flex flex-wrap items-center gap-4" style={cardStyle}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid #15803d', color: '#7ee2a8', boxShadow: '0 0 18px rgba(34,197,94,0.22)' }}>
                  {user.username[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{user.username}</div>
                  <div className="text-xs text-gray-500">{user.matchesPlayed} Matches · {user.winStreak}er Serie</div>
                </div>
              </div>
              <RankBadge rank={user.rank} />
              <div className="flex-1 min-w-40">
                <XPBar xp={user.xp} level={user.level} />
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="rounded-2xl border p-4 mb-5 flex flex-wrap items-center justify-between gap-4" style={cardStyle}>
              <div>
                <div className="text-sm font-semibold text-white">Melde dich an, um zu spielen</div>
                <div className="text-xs text-gray-500 mt-1">Level, Rang, gespeicherte Spiele und Fortschritt brauchen einen Account.</div>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="rounded-xl px-4 py-2.5 text-sm font-extrabold"
                style={{ background: '#22C55E', color: '#04130a' }}
              >
                Einloggen
              </button>
            </motion.div>
          )}

          {isAuthenticated && user.matchesPlayed === 0 && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22 }}
              onClick={() => navigate('/tutorial')}
              className="w-full mb-5 flex items-center gap-4 rounded-2xl border p-4 text-left hover:border-green-500 transition-all group"
              style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.45)' }}
            >
              <span className="text-2xl">🎓</span>
              <div className="flex-1">
                <div className="text-green-300 font-semibold">Starter-Tutorial abschließen</div>
                <div className="text-xs text-gray-500 mt-0.5">Einmalige Einführung mit gutem XP-Bonus für deinen Start.</div>
              </div>
              <span className="text-gray-600 group-hover:text-gray-400 transition-colors">→</span>
            </motion.button>
          )}

          {/* Resume saved game */}
          {savedGame && (
            <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
              onClick={() => navigate(getSavedGameUrl(savedGame))}
              className="w-full mb-5 flex items-center gap-4 rounded-2xl border p-4 hover:border-green-500 transition-all group"
              style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.5)' }}>
              <span className="text-2xl">▶</span>
              <div className="text-left flex-1">
                <div className="text-green-300 font-semibold">Spiel fortsetzen</div>
                <div className="text-xs text-gray-500">
                  {savedGame.team.name} · {savedGame.team.season} · {Object.values(savedGame.guesses).filter(g => g.solved).length}/{savedGame.team.players.length}
                </div>
              </div>
              <span className="text-gray-600 group-hover:text-gray-400 transition-colors">→</span>
            </motion.button>
          )}

          {/* ─── Spielmodi ─── */}
          <div id="modes" className="scroll-mt-20">
            <div className="text-xs tracking-[0.26em] text-green-400 mb-4">SPIELMODI</div>
          </div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-10%' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

            {/* Freizeit */}
            <motion.div variants={item} className="rounded-2xl border overflow-hidden relative" style={{ ...cardStyle, borderColor: 'rgba(90,140,255,0.22)' }}>
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(90,140,255,0.16), transparent 70%)' }} />
              <div className="px-5 py-4 border-b relative" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.16em] mb-2 px-3 py-1 rounded-full" style={{ color: '#9fb3ff', background: 'rgba(90,140,255,0.12)', border: '1px solid rgba(90,140,255,0.3)' }}>🎮 ENTSPANNT</div>
                <div className="bebas tracking-wider text-white text-2xl">Freizeit-Modus</div>
                <p className="text-xs text-gray-500 mt-0.5">Solo ohne Rang · XP-Gewinn · kein LP-Verlust</p>
              </div>
              <div className="p-4 flex flex-col gap-2 relative">
                {DIFFICULTIES.map(d => (
                  <button key={d.id}
                    onClick={() => startNewGame(`/play?playMode=casual&matchType=single&difficulty=${d.id}&leagueId=L1`)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border hover:border-gray-500 transition-all text-left"
                    style={{ background: '#161d29', borderColor: 'rgba(255,255,255,0.07)' }}>
                    <span className="text-xl">{d.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{d.label}</div>
                      <div className="text-xs text-gray-500">{d.desc}</div>
                    </div>
                    <span className="text-xs tabular-nums" style={{ color: d.color }}>{d.xp}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Ranked */}
            <motion.div variants={item} className="rounded-2xl border overflow-hidden relative" style={{ ...cardStyle, borderColor: 'rgba(34,197,94,0.3)' }}>
              <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.2), transparent 70%)' }} />
              <div className="px-5 py-4 border-b relative" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.16em] mb-2 px-3 py-1 rounded-full" style={{ color: '#7ee2a8', background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.4)' }}>🏆 KOMPETITIV</div>
                <div className="flex items-center gap-2">
                  <span className="bebas tracking-wider text-white text-2xl">Solo-Rangliste</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#F59E0B20', color: '#F59E0B' }}>
                  {isAuthenticated ? (rankedUnlocked ? getRankedDifficultyLabel(user.rank) : `Ab Level ${RANKED_UNLOCK_LEVEL}`) : 'Login benötigt'}
                </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Schwierigkeit aus deinem Rang · LP &amp; Siegesserien</p>
              </div>
              <div className="p-4 flex flex-col gap-2 relative">
                {MATCH_TYPES.map(match => (
                  <button key={match.id}
                    onClick={() => {
                      if (!rankedUnlocked) return;
                      startNewGame(`/play?playMode=ranked&matchType=${match.id}&rank=${encodeURIComponent(user.rank)}&winStreak=${user.winStreak}`);
                    }}
                    disabled={!rankedUnlocked}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border hover:border-gray-500 transition-all text-left disabled:opacity-45 disabled:cursor-not-allowed"
                    style={{ background: '#161d29', borderColor: 'rgba(255,255,255,0.07)' }}>
                    <span className="text-xl font-bold text-gray-300">{match.id === 'series' ? '3' : '1'}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{match.label}</div>
                      <div className="text-xs text-gray-500">{match.desc}</div>
                    </div>
                    <span className="text-xs tabular-nums text-green-400">{rankedUnlocked ? (match.id === 'series' ? 'LP x1.5' : 'Streak-Bonus') : 'Gesperrt'}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* ─── Bald verfügbar ─── */}
          <div className="text-xs tracking-[0.24em] text-gray-600 mb-3 mt-7">BALD VERFÜGBAR</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            {[
              { icon: '🌐', title: 'ONLINE-DUELL', desc: 'Tritt live gegen andere Spieler an — wer löst die Elf zuerst?' },
              { icon: '🌍', title: 'WM-MODUS', desc: 'Errate die Spieler nicht über die Nationalität, sondern anhand ihrer Vereine.' },
            ].map((m) => (
              <div key={m.title} className="relative rounded-2xl border p-6 overflow-hidden" style={{ background: '#0a0e16', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.014) 0 11px, transparent 11px 22px)' }} />
                <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.14em] px-3 py-1.5 rounded-full" style={{ color: '#9aa4b2', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.13)' }}>🔒 BALD</div>
                <div className="relative">
                  <div className="text-2xl mb-3" style={{ filter: 'grayscale(0.35)', opacity: 0.8 }}>{m.icon}</div>
                  <div className="bebas text-2xl tracking-wider mb-2" style={{ color: '#aeb7c4' }}>{m.title}</div>
                  <p className="text-sm leading-relaxed" style={{ color: '#7b8595' }}>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Rang-Leiter ─── */}
          <div className="rounded-2xl border p-6 mt-6 mb-2 relative overflow-hidden" style={cardStyle}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(50% 80% at 80% 20%, rgba(34,197,94,0.1), transparent 70%)' }} />
            <div className="relative">
              <div className="text-xs tracking-[0.26em] text-green-400 mb-2">DEIN ZIEL IN RANKED</div>
              <div className="bebas text-3xl text-white mb-4">Vom Neuling zur Legende</div>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Bronze', col: '#cd7f32', bg: 'rgba(205,127,50,0.12)', bd: 'rgba(205,127,50,0.4)', tx: '#e3a878' },
                  { label: 'Silber', col: '#c2cbd6', bg: 'rgba(180,190,200,0.1)', bd: 'rgba(180,190,200,0.32)', tx: '#cfd6e0' },
                  { label: 'Gold',   col: '#f5d142', bg: 'rgba(245,209,66,0.1)', bd: 'rgba(245,209,66,0.34)', tx: '#f5d142' },
                  { label: 'Platin', col: '#67d6c9', bg: 'rgba(103,214,201,0.1)', bd: 'rgba(103,214,201,0.36)', tx: '#8fe6dc' },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl" style={{ background: r.bg, border: `1px solid ${r.bd}` }}>
                    <span className="w-3.5 h-3.5 rounded" style={{ background: r.col }} />
                    <span className="text-sm font-bold" style={{ color: r.tx }}>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>

      </div>
    </div>
  );
}

function HeroCareerTip() {
  const clubs = [
    { name: 'Hertha BSC Youth', years: '2002 – 2003', tag: 'Nachwuchs', mark: false },
    { name: 'Hamburger SV', years: '2007 – 2010', tag: null, mark: false },
    { name: 'Manchester City', years: '2010 – 2011', tag: null, mark: false },
    { name: 'Bayern Munich', years: '2011 – heute', tag: 'Aktuell', mark: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 34, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: 0.28, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className="hidden lg:block"
    >
      <motion.div
        animate={{ y: [0, -8, 0], opacity: [0.88, 1, 0.88] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative pl-5"
        style={{
          filter: 'drop-shadow(0 26px 58px rgba(0,0,0,0.52))',
        }}
      >
        <div className="absolute left-0 top-8 bottom-8 w-px bg-gradient-to-b from-transparent via-green-400/50 to-transparent" />
        <div
          className="relative rounded-2xl px-4 py-4"
          style={{
            background: 'linear-gradient(90deg, rgba(12,17,25,0.72), rgba(12,17,25,0.36))',
            backdropFilter: 'blur(6px)',
          }}
        >
        <div className="relative flex items-start justify-between gap-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-16 items-center">
              <span className="absolute left-0 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-red-700 text-lg">🇩🇪</span>
              <span className="absolute left-7 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-black text-lg">🇬🇭</span>
            </div>
            <div>
              <div className="text-sm font-extrabold text-blue-300">Karriere-Tipp</div>
              <div className="text-xs text-gray-400">Deutschland / Ghana · Verteidiger</div>
            </div>
          </div>
          <div className="rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-[11px] font-bold text-green-300">
            Tipp offen
          </div>
        </div>

        <div className="relative mt-4 space-y-3">
          {clubs.map((club, index) => (
            <motion.div
              key={club.name}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + index * 0.13, duration: 0.45 }}
              className="flex items-center gap-3 rounded-2xl px-3 py-3"
              style={{
                background: club.mark ? 'rgba(34,197,94,0.16)' : 'rgba(255,255,255,0.055)',
                boxShadow: club.mark ? 'inset 0 0 0 1px rgba(34,197,94,0.28)' : 'inset 0 0 0 1px rgba(255,255,255,0.065)',
              }}
            >
              <div className="flex flex-col items-center">
                <div
                  className="h-3 w-3 rounded-full border-2"
                  style={{
                    borderColor: club.mark ? '#22C55E' : '#59626f',
                    background: club.mark ? '#22C55E' : 'transparent',
                    boxShadow: club.mark ? '0 0 12px rgba(34,197,94,0.8)' : 'none',
                  }}
                />
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gray-900 text-xs font-black text-gray-300">
                {club.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white">{club.name}</div>
                <div className="text-xs text-gray-500">{club.years}</div>
              </div>
              {club.tag && (
                <span className="rounded-lg bg-white/8 px-2 py-1 text-[10px] uppercase tracking-wider text-gray-400">
                  {club.tag}
                </span>
              )}
            </motion.div>
          ))}
        </div>

        <div className="relative mt-4 flex items-center gap-3 rounded-2xl bg-green-500/10 px-4 py-3">
          <span className="text-lg">↳</span>
          <div className="text-sm font-semibold text-green-200">Erkenne ihn anhand der Karriere des gesuchten Spielers.</div>
        </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
