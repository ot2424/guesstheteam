import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RankBadge } from '../components/ui/RankBadge';
import { XPBar } from '../components/ui/XPBar';
import { AdSlot } from '../components/ui/AdSlot';
import { MOCK_USER } from '../data/mockUser';
import { clearSavedGame, getSavedGameUrl, loadSavedGame, type SavedGame } from '../lib/savedGame';

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
  const [savedGame, setSavedGame] = useState<SavedGame | null>(() => loadSavedGame());

  const startNewGame = (url: string) => {
    clearSavedGame();
    setSavedGame(null);
    navigate(url);
  };

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
                {MOCK_USER.username[0]}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{MOCK_USER.username}</div>
                <div className="text-xs text-gray-500">{MOCK_USER.matchesPlayed} Matches · {MOCK_USER.winStreak}🔥 Serie</div>
              </div>
            </div>
            <RankBadge rank={MOCK_USER.rank} />
            <div className="flex-1 min-w-40">
              <XPBar xp={MOCK_USER.xp} level={MOCK_USER.level} />
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
                  {getRankedDifficultyLabel(MOCK_USER.rank)}
                </span>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <p className="text-xs text-gray-500">
                  Deine Schwierigkeit wird automatisch aus deinem Rang bestimmt. Divisionen brauchen mehr LP, Siegesserien geben Bonus-LP.
                </p>
                {MATCH_TYPES.map(match => (
                  <button
                    key={match.id}
                    onClick={() => startNewGame(`/play?playMode=ranked&matchType=${match.id}&rank=${encodeURIComponent(MOCK_USER.rank)}&winStreak=${MOCK_USER.winStreak}`)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-700 hover:border-gray-500 transition-all text-left group"
                    style={{ background: '#1F2937' }}
                  >
                    <span className="text-xl">{match.id === 'series' ? '3' : '1'}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{match.label}</div>
                      <div className="text-xs text-gray-500">{match.desc}</div>
                    </div>
                    <span className="text-xs tabular-nums text-green-400">
                      {match.id === 'series' ? 'LP x1.5' : 'Streak-Bonus'}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Rewarded Ad placeholder */}
          <AdSlot type="rewarded" />
        </main>

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-4" style={{ width: '180px' }}>
          <AdSlot type="sidebar" />
        </aside>
      </div>
    </div>
  );
}
