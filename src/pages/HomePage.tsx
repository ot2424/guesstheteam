import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RankBadge } from '../components/ui/RankBadge';
import { XPBar } from '../components/ui/XPBar';
import { RANKED_UNLOCK_LEVEL, isRankedUnlocked } from '../data/mockUser';
import { useAuth } from '../lib/useAuth';
import { clearSavedGame, getSavedGameUrl, loadSavedGame } from '../lib/savedGame';
import heroImage from '../assets/hero.png';

const DIFFICULTIES = [
  {
    id: 'easy',
    label: 'Leicht',
    icon: '🟢',
    desc: 'Feste Liga · moderne Top-Teams · 2018-2026',
    xp: 'Nur XP',
    color: '#22C55E',
  },
  {
    id: 'medium',
    label: 'Mittel',
    icon: '🟡',
    desc: 'Ligen-Mix · etablierte Euro-Clubs · 2010-2026',
    xp: 'Nur XP',
    color: '#F59E0B',
  },
  {
    id: 'hard',
    label: 'Schwer',
    icon: '🔴',
    desc: 'Ligen-Mix · historische Nostalgie-Teams · 2000-2015',
    xp: 'Nur XP',
    color: '#EF4444',
  },
];

const MATCH_TYPES = [
  { id: 'single', label: 'Einzel-Match', desc: '1 Team · alle 11 Spieler erraten' },
  { id: 'series', label: '3er-Match Serie', desc: '3 Teams · mindestens 2 von 3 lösen' },
] as const;

function getRankedDifficultyLabel(rank: string) {
  if (rank.startsWith('Bronze')) return 'Leicht';
  if (rank.startsWith('Silver')) return 'Mittel';
  return 'Schwer / Nostalgie';
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0 },
};

export function HomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const rankedUnlocked = isRankedUnlocked(user.level);
  const storedGame = loadSavedGame();
  const savedGame = isAuthenticated && storedGame?.userId === user.id ? storedGame : null;

  const startNewGame = (url: string) => {
    clearSavedGame();
    navigate(url);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--night)' }}>
        <main className="max-w-6xl mx-auto px-4 py-10">
          <section className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-8 items-center mb-10">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-xs uppercase tracking-[0.3em] text-green-400 mb-3">FootyGuesser</div>
              <h1 className="bebas text-5xl sm:text-7xl tracking-wider text-white leading-none mb-4">
                Erkenne die Elf
              </h1>
              <p className="text-gray-400 max-w-xl">
                Errate Fußballer anhand von Position, Nationalität und Karriere-Stationen. Sammle XP, schalte Rangliste frei und kämpfe dich durch moderne und historische Teams.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/login')}
                  className="rounded-lg px-5 py-3 text-sm font-semibold"
                  style={{ background: '#22C55E', color: '#0A0E1A' }}
                >
                  Einloggen oder registrieren
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="rounded-lg border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800"
                >
                  Fortschritt speichern
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12 }}
              className="overflow-hidden rounded-xl border border-gray-800"
              style={{ background: '#111827' }}
            >
              <img src={heroImage} alt="FootyGuesser Gameplay" className="h-72 w-full object-cover" />
              <div className="border-t border-gray-800 p-4">
                <div className="text-sm font-semibold text-white">Gameplay-Vorschau</div>
                <div className="text-xs text-gray-500 mt-1">Karriere lesen, Namen suchen, Elf vervollständigen.</div>
              </div>
            </motion.div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Hinweise lesen', text: 'Du siehst Position, Nationalitäten und Karriere-Stationen statt Spielernamen.' },
              { title: 'Spieler erraten', text: 'Autocomplete hilft nur beim Namen. Club-Hints bleiben verborgen.' },
              { title: 'Aufsteigen', text: 'XP erhöht dein Level. Ab Level 5 öffnet sich die Rangliste.' },
            ].map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.08 }}
                className="rounded-xl border border-gray-800 p-5"
                style={{ background: '#111827' }}
              >
                <GameplayMiniPreview index={index} />
                <div className="mt-4 text-sm font-semibold text-white">{card.title}</div>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{card.text}</p>
              </motion.div>
            ))}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--night)' }}>
      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-6">
        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="bebas text-5xl sm:text-6xl tracking-wider text-white mb-2">
              Wer spielt hier?
            </h1>
            <p className="text-gray-400 text-base max-w-lg">
              Erkenne Fußballer anhand ihrer Karriere und Nationalität. Steige auf, sammle Ränge, schalte Inhalte frei.
            </p>
          </motion.div>

          {/* User stats bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-gray-800 p-4 mb-6 flex flex-wrap items-center gap-4"
            style={{ background: '#111827' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-900 border border-green-700 flex items-center justify-center text-green-300 font-bold">
                {user.username[0]}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{user.username}</div>
                <div className="text-xs text-gray-500">{user.matchesPlayed} Matches · {user.winStreak}🔥 Serie</div>
              </div>
            </div>
            <RankBadge rank={user.rank} />
            <div className="flex-1 min-w-40">
              <XPBar xp={user.xp} level={user.level} />
            </div>
          </motion.div>

          {/* Tutorial CTA */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            onClick={() => navigate('/tutorial')}
            className="w-full mb-4 flex items-center gap-4 rounded-xl border border-dashed border-green-800 p-4 hover:border-green-600 transition-all group"
            style={{ background: 'rgba(34,197,94,0.05)' }}
          >
            <span className="text-3xl">🎓</span>
            <div className="text-left flex-1">
              <div className="text-green-400 font-semibold">Tutorial spielen</div>
              <div className="text-xs text-gray-500">Lerne das Spielprinzip mit Real Madrid 2022/23 · Kein XP/LP-Einfluss</div>
            </div>
            <span className="text-gray-600 group-hover:text-gray-400 transition-colors">→</span>
          </motion.button>

          {savedGame && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => navigate(getSavedGameUrl(savedGame))}
              className="w-full mb-4 flex items-center gap-4 rounded-xl border border-green-700 p-4 hover:border-green-500 transition-all group"
              style={{ background: 'rgba(34,197,94,0.08)' }}
            >
              <span className="text-2xl">▶</span>
              <div className="text-left flex-1">
                <div className="text-green-300 font-semibold">Spiel fortsetzen</div>
                <div className="text-xs text-gray-500">
                  {savedGame.team.name} · {savedGame.team.season} · {Object.values(savedGame.guesses).filter(guess => guess.solved).length}/{savedGame.team.players.length}
                </div>
              </div>
              <span className="text-gray-600 group-hover:text-gray-400 transition-colors">→</span>
            </motion.button>
          )}

          {/* Game modes */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
          >
            {/* Freizeit */}
            <motion.div variants={item} className="rounded-xl border border-gray-800 overflow-hidden" style={{ background: '#111827' }}>
              <div className="px-4 py-3 border-b border-gray-800">
                <span className="bebas tracking-wider text-white text-lg">Freizeit-Modus</span>
                <p className="text-xs text-gray-500 mt-0.5">Solo ohne Rang · XP-Gewinn · kein LP-Verlust</p>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.id}
                    onClick={() => startNewGame(`/play?playMode=casual&matchType=single&difficulty=${d.id}&leagueId=L1`)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-700 hover:border-gray-500 transition-all text-left group"
                    style={{ background: '#1F2937' }}
                  >
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

            {/* Rangliste */}
            <motion.div variants={item} className="rounded-xl border border-gray-800 overflow-hidden" style={{ background: '#111827' }}>
              <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                <span className="bebas tracking-wider text-white text-lg">Solo-Rangliste</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#F59E0B20', color: '#F59E0B' }}>
                  {rankedUnlocked ? getRankedDifficultyLabel(user.rank) : `Ab Level ${RANKED_UNLOCK_LEVEL}`}
                </span>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <p className="text-xs text-gray-500">
                  {rankedUnlocked
                    ? 'Deine Schwierigkeit wird automatisch aus deinem Rang bestimmt. Divisionen brauchen mehr LP, Siegesserien geben Bonus-LP.'
                    : 'Sammle im Freizeit-Modus XP und steige auf, um Rangliste, LP und Siegesserien freizuschalten.'}
                </p>
                {MATCH_TYPES.map(match => (
                  <button
                    key={match.id}
                    onClick={() => {
                      if (!rankedUnlocked) return;
                      startNewGame(`/play?playMode=ranked&matchType=${match.id}&rank=${encodeURIComponent(user.rank)}&winStreak=${user.winStreak}`);
                    }}
                    disabled={!rankedUnlocked}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-700 hover:border-gray-500 transition-all text-left group disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-gray-700"
                    style={{ background: '#1F2937' }}
                  >
                    <span className="text-xl">{match.id === 'series' ? '3' : '1'}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{match.label}</div>
                      <div className="text-xs text-gray-500">{match.desc}</div>
                    </div>
                    <span className="text-xs tabular-nums text-green-400">
                      {rankedUnlocked ? (match.id === 'series' ? 'LP x1.5' : 'Streak-Bonus') : 'Gesperrt'}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>

        </main>
      </div>
    </div>
  );
}

function GameplayMiniPreview({ index }: { index: number }) {
  return (
    <div className="relative h-28 overflow-hidden rounded-lg border border-gray-800" style={{ background: '#0F172A' }}>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,197,94,0.16),transparent_55%)]" />
      {[0, 1, 2].map((slot) => (
        <motion.div
          key={slot}
          className="absolute h-10 w-8 rounded border border-gray-700 bg-gray-900"
          style={{ left: `${18 + slot * 25}%`, top: `${26 + (slot % 2) * 24}%` }}
          animate={{ y: index === slot ? [0, -5, 0] : [0, 3, 0] }}
          transition={{ duration: 1.6 + slot * 0.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="mx-auto mt-2 h-3 w-5 rounded-sm bg-green-500" />
          <div className="mx-auto mt-2 h-1 w-4 rounded bg-gray-700" />
        </motion.div>
      ))}
      <motion.div
        className="absolute bottom-3 left-4 right-4 h-2 rounded bg-gray-800"
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
    </div>
  );
}
