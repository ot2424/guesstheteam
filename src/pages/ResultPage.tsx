import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RankBadge } from '../components/ui/RankBadge';
import { TeamBadge } from '../components/ui/TeamBadge';
import { XPBar } from '../components/ui/XPBar';
import { XP_REWARDS } from '../lib/rewards';
import type { MatchResult } from '../types';

function ResultIcon({ isPerfect, isWin }: { isPerfect?: boolean; isWin: boolean }) {
  if (isPerfect) {
    return (
      <svg viewBox="0 0 48 48" className="w-16 h-16" aria-hidden="true">
        <path d="M14 8h20v6h7v6c0 7.2-4.9 12.4-11.6 13.4A11.9 11.9 0 0 1 27 36.2V41h7v4H14v-4h7v-4.8a11.9 11.9 0 0 1-2.4-2.8C11.9 32.4 7 27.2 7 20v-6h7V8Zm20 10v8.8A9.3 9.3 0 0 0 37 20v-2h-3Zm-23 0v2a9.3 9.3 0 0 0 3 6.8V18h-3Z" fill="#22C55E" />
      </svg>
    );
  }

  if (isWin) {
    return (
      <svg viewBox="0 0 48 48" className="w-16 h-16" aria-hidden="true">
        <circle cx="24" cy="24" r="19" fill="none" stroke="#22C55E" strokeWidth="4" />
        <path d="m15 24 6 6 13-15" fill="none" stroke="#22C55E" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" className="w-16 h-16" aria-hidden="true">
      <circle cx="24" cy="24" r="19" fill="none" stroke="#EF4444" strokeWidth="4" />
      <path d="m17 17 14 14M31 17 17 31" fill="none" stroke="#EF4444" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function ResultPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const result = state as MatchResult | null;

  if (!result) {
    navigate('/');
    return null;
  }

  const { teamName, teamLogo, season, solved, total, durationSec, isWin, isPerfect, xpGained, lpChange, profile } = result;
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  const accuracy = Math.round((solved / total) * 100);
  const accent = isWin ? '#22C55E' : '#EF4444';
  const nextReward = profile
    ? XP_REWARDS.find((reward) => reward.level > profile.level)
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden" style={{ background: '#06090f' }}>
      {/* ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: `radial-gradient(50% 45% at 50% 38%, ${isWin ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.12)'}, transparent 70%)` }} />

      {/* Result card */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-full max-w-md rounded-3xl border overflow-hidden relative"
        style={{
          background: '#111827',
          borderColor: accent,
          boxShadow: isWin ? '0 0 60px rgba(34,197,94,0.3), 0 30px 80px rgba(0,0,0,0.6)' : '0 0 60px rgba(239,68,68,0.25), 0 30px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Top banner */}
        <div
          className="px-6 py-7 flex flex-col items-center gap-2"
          style={{ background: isWin ? 'linear-gradient(180deg, rgba(34,197,94,0.16), rgba(34,197,94,0.02))' : 'linear-gradient(180deg, rgba(239,68,68,0.14), rgba(239,68,68,0.02))' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            className="flex items-center justify-center"
            style={{ filter: `drop-shadow(0 0 18px ${accent}aa)` }}
          >
            <ResultIcon isPerfect={isPerfect} isWin={isWin} />
          </motion.div>
          <h1
            className="bebas text-5xl tracking-widest"
            style={{ color: accent, textShadow: `0 0 30px ${accent}66` }}
          >
            {isPerfect ? 'Perfekt!' : isWin ? 'Geschafft!' : 'Niederlage'}
          </h1>
          <div className="flex items-center gap-2">
            <TeamBadge name={teamName} logoUrl={teamLogo} size={24} />
            <span className="text-gray-300 text-sm">{teamName} · {season}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-6 grid grid-cols-3 gap-4 text-center border-t border-white/5">
          <div>
            <div className="bebas text-3xl" style={{ color: isWin ? '#2bd46a' : '#9CA3AF' }}>
              {solved}/{total}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Erraten</div>
          </div>
          <div>
            <div className="bebas text-3xl text-white">{mins}:{secs.toString().padStart(2, '0')}</div>
            <div className="text-xs text-gray-500 mt-0.5">Zeit</div>
          </div>
          <div>
            <div className="bebas text-3xl text-white">{accuracy}%</div>
            <div className="text-xs text-gray-500 mt-0.5">Genauigkeit</div>
          </div>
        </div>

        {isWin && (
          <div className="px-6 py-3 border-t border-white/5 text-center">
            <div className="text-xs font-semibold text-green-300">
              {isPerfect ? 'Alle Spieler erraten: Perfect-Bonus erhalten.' : 'Ab 80 Prozent abgeschlossen. Mehr Treffer geben mehr XP-Bonus.'}
            </div>
          </div>
        )}

        {/* Progression changes */}
        <div className="px-6 py-5 flex justify-around border-t border-white/5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="text-xs text-gray-500">XP</div>
            <div className="bebas text-2xl text-green-400">+{xpGained}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="text-xs text-gray-500">LP</div>
            <div
              className="bebas text-2xl"
              style={{ color: lpChange >= 0 ? '#22C55E' : '#EF4444' }}
            >
              {lpChange >= 0 ? '+' : ''}{lpChange}
            </div>
          </motion.div>
        </div>

        {profile && (
          <div className="px-6 py-5 border-t border-white/5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div
                  className="bebas text-2xl tracking-wider text-white"
                  style={profile.prestige.nameGlow ? { textShadow: `0 0 18px ${profile.prestige.nameGlow}` } : undefined}
                >
                  Level {profile.level}
                </div>
                <div className="text-xs text-gray-500">
                  {profile.unlockedRewards.filter((reward) => reward.kind === 'user_title').at(-1)?.name ?? 'Kreisliga-Legende'}
                </div>
              </div>
              <RankBadge rank={profile.rank} size="sm" />
            </div>

            <XPBar xp={profile.xp} level={profile.level} />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border px-3 py-2" style={{ background: '#161d29', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="text-[11px] text-gray-500">Schilde</div>
                <div className="bebas text-xl text-blue-300">x{profile.inventory.skipShields}</div>
              </div>
              <div className="rounded-xl border px-3 py-2" style={{ background: '#161d29', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="text-[11px] text-gray-500">Auto-Solve</div>
                <div className="bebas text-xl text-yellow-300">x{profile.inventory.autoSolveJokers}</div>
              </div>
            </div>

            {nextReward && (
              <div className="mt-3 rounded-xl border px-3 py-2" style={{ background: 'rgba(34,197,94,0.07)', borderColor: 'rgba(34,197,94,0.24)' }}>
                <div className="text-[11px] text-green-300">Nächster Meilenstein · Level {nextReward.level}</div>
                <div className="text-xs text-gray-300 mt-0.5">{nextReward.name}</div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-6 flex flex-col gap-3">
          <button
            onClick={() => navigate('/play')}
            className="w-full py-3.5 rounded-xl font-extrabold text-sm transition-all active:scale-95"
            style={{ background: '#22C55E', color: '#0A0E1A', boxShadow: '0 12px 28px rgba(34,197,94,0.3)' }}
          >
            Nochmal spielen
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 rounded-xl font-semibold text-sm border border-white/15 text-gray-300 hover:bg-white/5 transition-all"
          >
            Zur Startseite
          </button>
        </div>
      </motion.div>

    </div>
  );
}
