import { motion } from 'framer-motion';
import { RankBadge } from '../components/ui/RankBadge';
import { XPBar } from '../components/ui/XPBar';
import { AdSlot } from '../components/ui/AdSlot';
import { MOCK_USER, MOCK_MATCH_HISTORY, BADGES, RANKS, getRankTier, RANK_COLORS } from '../data/mockUser';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

// Unified premium surfaces (matches Homepage look)
const CARD = 'rounded-2xl border';
const cardStyle = { background: 'linear-gradient(180deg,#0e141d,#0a0e16)', borderColor: 'rgba(255,255,255,0.08)' } as const;
const innerStyle = { background: '#161d29', borderColor: 'rgba(255,255,255,0.06)' } as const;

export function ProfilePage() {
  const user = MOCK_USER;
  const winRate = user.matchesPlayed > 0
    ? Math.round((user.matchesWon / user.matchesPlayed) * 100)
    : 0;

  const currentRankIndex = RANKS.indexOf(user.rank);
  const lp = user.lp;
  const lpInTier = lp % 100;

  return (
    <div className="min-h-screen" style={{ background: '#06090f' }}>
      <div className="max-w-5xl mx-auto px-4 py-8 flex gap-6">
        <main className="flex-1 min-w-0">
          {/* Profile header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${CARD} p-6 mb-5 flex flex-wrap items-center gap-5 relative overflow-hidden`}
            style={cardStyle}
          >
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.14), transparent 70%)' }} />
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-2 flex-shrink-0 relative"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', borderColor: '#15803d', boxShadow: '0 0 22px rgba(34,197,94,0.25)' }}
            >
              {user.username[0]}
            </div>

            <div className="flex-1 min-w-0 relative">
              <h1 className="bebas text-3xl tracking-wider text-white">{user.username}</h1>
              {user.unlockedRewards.find((reward) => reward.kind === 'user_title') && (
                <div className="text-xs text-green-300 mt-0.5">
                  {user.unlockedRewards.filter((reward) => reward.kind === 'user_title').at(-1)?.name}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <RankBadge rank={user.rank} size="md" />
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
              { label: 'Matches', value: user.matchesPlayed, color: '#fff' },
              { label: 'Siege', value: user.matchesWon, color: '#fff' },
              { label: 'Winrate', value: `${winRate}%`, color: '#2bd46a' },
              { label: 'Gesamte XP', value: user.xp.toLocaleString(), color: '#fff' },
            ].map(({ label, value, color }) => (
              <motion.div
                key={label}
                variants={item}
                className="rounded-xl p-4 text-center border"
                style={innerStyle}
              >
                <div className="bebas text-3xl" style={{ color }}>{value}</div>
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
            className={`${CARD} p-5 mb-5`}
            style={cardStyle}
          >
            <div className="text-xs tracking-[0.22em] text-green-400 mb-3">RANG-FORTSCHRITT</div>
            <div className="flex items-center gap-4 mb-3">
              <RankBadge rank={user.rank} size="lg" />
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{lpInTier} LP</span>
                  <span>100 LP</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-800 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${RANK_COLORS[getRankTier(user.rank)].border}80, ${RANK_COLORS[getRankTier(user.rank)].border})`,
                      boxShadow: `0 0 12px ${RANK_COLORS[getRankTier(user.rank)].border}99`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${lpInTier}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
              {currentRankIndex < RANKS.length - 1 && (
                <RankBadge rank={RANKS[currentRankIndex + 1]} size="sm" />
              )}
            </div>
            <p className="text-xs text-gray-600">
              Sieg: +25 LP · Niederlage: −20 LP · Abstieg möglich
            </p>
            <div className="mt-3 text-xs text-gray-500">
              Prestige: {user.prestige.emblem}
              {user.prestige.nameGlow && <span style={{ color: user.prestige.nameGlow }}> · Name Glow aktiv</span>}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className={`${CARD} p-5 mb-5`}
            style={cardStyle}
          >
            <div className="text-xs tracking-[0.22em] text-green-400 mb-4">INVENTAR &amp; XP-MEILENSTEINE</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl border p-4" style={innerStyle}>
                <div className="text-xs text-gray-500">Team-Skip-Schilde</div>
                <div className="bebas text-3xl text-blue-300 mt-1">x{user.inventory.skipShields}</div>
              </div>
              <div className="rounded-xl border p-4" style={innerStyle}>
                <div className="text-xs text-gray-500">Auto-Solve-Joker</div>
                <div className="bebas text-3xl text-yellow-300 mt-1">x{user.inventory.autoSolveJokers}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {user.unlockedRewards.map((reward) => (
                <div key={reward.id} className="rounded-xl border px-3 py-2" style={innerStyle}>
                  <div className="text-xs font-semibold text-white">Level {reward.level} · {reward.name}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{reward.description}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Badges */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className={`${CARD} p-5 mb-5`}
            style={cardStyle}
          >
            <div className="text-xs tracking-[0.22em] text-green-400 mb-4">ACHIEVEMENTS &amp; BADGES</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(BADGES).map(([key, badge]) => {
                const unlocked = user.badges.includes(key);
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                    style={{
                      background: unlocked ? 'rgba(245,158,11,0.08)' : '#161d29',
                      borderColor: unlocked ? '#F59E0B55' : 'rgba(255,255,255,0.06)',
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
            className={`${CARD} p-5`}
            style={cardStyle}
          >
            <div className="text-xs tracking-[0.22em] text-green-400 mb-4">MATCH-VERLAUF</div>
            <div className="flex flex-col gap-3">
              {MOCK_MATCH_HISTORY.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{
                    background: '#161d29',
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
