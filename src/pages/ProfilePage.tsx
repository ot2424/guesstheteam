import { motion } from 'framer-motion';
import { RankBadge } from '../components/ui/RankBadge';
import { XPBar } from '../components/ui/XPBar';
import { AdSlot } from '../components/ui/AdSlot';
import { MOCK_USER, MOCK_MATCH_HISTORY, BADGES, RANKS, getRankFromLP, getRankProgress, getRankTier, RANK_COLORS } from '../data/mockUser';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export function ProfilePage() {
  const user = MOCK_USER;
  const winRate = user.matchesPlayed > 0
    ? Math.round((user.matchesWon / user.matchesPlayed) * 100)
    : 0;

  const lp = user.lp;
  const rank = getRankFromLP(lp);
  const currentRankIndex = RANKS.indexOf(rank);
  const rankProgress = getRankProgress(lp, rank);

  return (
    <div className="min-h-screen" style={{ background: 'var(--night)' }}>
      <div className="max-w-5xl mx-auto px-4 py-8 flex gap-6">
        <main className="flex-1 min-w-0">
          {/* Profile header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-800 p-6 mb-5 flex flex-wrap items-center gap-5"
            style={{ background: '#111827' }}
          >
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-2 border-green-700 flex-shrink-0"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}
            >
              {user.username[0]}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="bebas text-3xl tracking-wider text-white">{user.username}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <RankBadge rank={rank} size="md" />
                <span className="text-xs text-gray-500">Level {user.level}</span>
                {user.winStreak >= 3 && (
                  <span className="text-xs text-orange-400">🔥 {user.winStreak}er-Serie</span>
                )}
              </div>
              <div className="mt-3 max-w-xs">
                <XPBar xp={user.xp} level={user.level} />
              </div>
            </div>
          </motion.div>

          {/* Stats grid */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5"
          >
            {[
              { label: 'Matches', value: user.matchesPlayed },
              { label: 'Siege', value: user.matchesWon },
              { label: 'Winrate', value: `${winRate}%` },
              { label: 'Gesamte XP', value: user.xp.toLocaleString() },
            ].map(({ label, value }) => (
              <motion.div
                key={label}
                variants={item}
                className="rounded-xl p-4 text-center"
                style={{ background: '#1F2937' }}
              >
                <div className="bebas text-2xl text-white">{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Rank progress */}
          <motion.div
            variants={item}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-gray-800 p-5 mb-5"
            style={{ background: '#111827' }}
          >
            <h2 className="bebas text-lg tracking-wider text-white mb-4">Rang-Fortschritt</h2>
            <div className="flex items-center gap-4 mb-3">
              <RankBadge rank={rank} size="lg" />
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{rankProgress.current} LP</span>
                  <span>{rankProgress.needed} LP</span>
                </div>
                <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${RANK_COLORS[getRankTier(rank)].border}80, ${RANK_COLORS[getRankTier(rank)].border})`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${rankProgress.percent}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
              {currentRankIndex < RANKS.length - 1 && (
                <RankBadge rank={RANKS[currentRankIndex + 1]} size="sm" />
              )}
            </div>
            <p className="text-xs text-gray-600">
              Sieg: +14 bis +18 LP · Streak-Bonus bis +8 LP · Divisionen brauchen mehr LP
            </p>
          </motion.div>

          {/* Badges */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-xl border border-gray-800 p-5 mb-5"
            style={{ background: '#111827' }}
          >
            <h2 className="bebas text-lg tracking-wider text-white mb-4">Achievements & Badges</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(BADGES).map(([key, badge]) => {
                const unlocked = user.badges.includes(key);
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                    style={{
                      background: unlocked ? 'rgba(245,158,11,0.08)' : '#1F2937',
                      borderColor: unlocked ? '#F59E0B40' : '#374151',
                      opacity: unlocked ? 1 : 0.45,
                    }}
                  >
                    <span className="text-2xl">{badge.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{badge.name}</div>
                      <div className="text-xs text-gray-600 leading-snug">{badge.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Match history */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-gray-800 p-5"
            style={{ background: '#111827' }}
          >
            <h2 className="bebas text-lg tracking-wider text-white mb-4">Match-Verlauf</h2>
            <div className="flex flex-col gap-3">
              {MOCK_MATCH_HISTORY.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{
                    background: '#1F2937',
                    borderColor: m.isWin ? '#22C55E30' : '#EF444430',
                  }}
                >
                  <img
                    src={m.teamLogo}
                    alt={m.teamName}
                    className="w-8 h-8 object-contain flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{m.teamName}</div>
                    <div className="text-xs text-gray-500">{m.season} · {m.solved}/{m.total} Spieler</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div
                      className="text-xs font-semibold"
                      style={{ color: m.isWin ? '#22C55E' : '#EF4444' }}
                    >
                      {m.isWin ? 'Sieg' : 'Niederlage'}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: m.lpChange >= 0 ? '#22C55E' : '#EF4444' }}
                    >
                      {m.lpChange >= 0 ? '+' : ''}{m.lpChange} LP
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </main>

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-4 flex-shrink-0" style={{ width: '180px' }}>
          <AdSlot type="sidebar" />
        </aside>
      </div>
    </div>
  );
}
