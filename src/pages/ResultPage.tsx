import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AdSlot } from '../components/ui/AdSlot';
import { TeamBadge } from '../components/ui/TeamBadge';
import { applyRankedResultOnce, loadUserProfile } from '../lib/localUser';
import type { MatchResult } from '../types';

function ResultIcon({ isPerfect, isWin }: { isPerfect?: boolean; isWin: boolean }) {
  if (isPerfect) {
    return (
      <svg viewBox="0 0 48 48" className="w-14 h-14" aria-hidden="true">
        <path d="M14 8h20v6h7v6c0 7.2-4.9 12.4-11.6 13.4A11.9 11.9 0 0 1 27 36.2V41h7v4H14v-4h7v-4.8a11.9 11.9 0 0 1-2.4-2.8C11.9 32.4 7 27.2 7 20v-6h7V8Zm20 10v8.8A9.3 9.3 0 0 0 37 20v-2h-3Zm-23 0v2a9.3 9.3 0 0 0 3 6.8V18h-3Z" fill="#22C55E" />
      </svg>
    );
  }

  if (isWin) {
    return (
      <svg viewBox="0 0 48 48" className="w-14 h-14" aria-hidden="true">
        <circle cx="24" cy="24" r="19" fill="none" stroke="#22C55E" strokeWidth="4" />
        <path d="m15 24 6 6 13-15" fill="none" stroke="#22C55E" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" className="w-14 h-14" aria-hidden="true">
      <circle cx="24" cy="24" r="19" fill="none" stroke="#EF4444" strokeWidth="4" />
      <path d="m17 17 14 14M31 17 17 31" fill="none" stroke="#EF4444" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function ResultPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const result = state as MatchResult | null;
  const safeResult = result ?? {
    teamName: '',
    teamLogo: '',
    season: '',
    solved: 0,
    total: 1,
    durationSec: 0,
    isWin: false,
    xpGained: 0,
    lpChange: 0,
  };
  const { resultId, playMode, matchType, teamName, teamLogo, season, solved, total, durationSec, isWin, isPerfect, xpGained, lpChange } = safeResult;
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  const accuracy = Math.round((solved / total) * 100);

  useEffect(() => {
    if (!result) {
      navigate('/');
      return;
    }

    applyRankedResultOnce({
      resultId: resultId ?? `${teamName}-${season}-${durationSec}-${solved}-${lpChange}`,
      playMode,
      matchType,
      isWin,
      xpGained,
      lpChange,
    });
  }, [durationSec, isWin, lpChange, matchType, navigate, playMode, result, resultId, season, solved, teamName, xpGained]);

  if (!result) return null;

  const replay = () => {
    if (playMode !== 'ranked') {
      navigate('/play');
      return;
    }

    const user = loadUserProfile();
    const replayParams = new URLSearchParams({
      playMode: 'ranked',
      matchType: matchType ?? 'single',
      rank: user.rank,
      winStreak: String(user.winStreak),
    });
    navigate(`/play?${replayParams.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: 'var(--night)' }}>
      {/* Result card */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-full max-w-sm rounded-2xl border overflow-hidden"
        style={{
          background: '#111827',
          borderColor: isWin ? '#22C55E' : '#EF4444',
          boxShadow: isWin ? '0 0 40px rgba(34,197,94,0.15)' : '0 0 40px rgba(239,68,68,0.15)',
        }}
      >
        {/* Top banner */}
        <div
          className="px-6 py-5 flex flex-col items-center gap-2"
          style={{ background: isWin ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            className="flex items-center justify-center"
          >
            <ResultIcon isPerfect={isPerfect} isWin={isWin} />
          </motion.div>
          <h1
            className="bebas text-3xl tracking-widest"
            style={{ color: isWin ? '#22C55E' : '#EF4444' }}
          >
            {isPerfect ? 'Perfekt!' : isWin ? 'Geschafft!' : 'Niederlage'}
          </h1>
          <div className="flex items-center gap-2">
            <TeamBadge name={teamName} logoUrl={teamLogo} size={24} />
            <span className="text-gray-300 text-sm">{teamName} · {season}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-5 grid grid-cols-3 gap-4 text-center border-b border-gray-800">
          <div>
            <div className="bebas text-2xl" style={{ color: isWin ? '#22C55E' : '#9CA3AF' }}>
              {solved}/{total}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Erraten</div>
          </div>
          <div>
            <div className="bebas text-2xl text-white">{mins}:{secs.toString().padStart(2, '0')}</div>
            <div className="text-xs text-gray-500 mt-0.5">Zeit</div>
          </div>
          <div>
            <div className="bebas text-2xl text-white">{accuracy}%</div>
            <div className="text-xs text-gray-500 mt-0.5">Genauigkeit</div>
          </div>
        </div>

        {isWin && (
          <div className="px-6 py-3 border-b border-gray-800 text-center">
            <div className="text-xs font-semibold text-green-300">
              {isPerfect ? 'Alle Spieler erraten: Perfect-Bonus erhalten.' : 'Ab 80 Prozent abgeschlossen. Mehr Treffer geben mehr XP-Bonus.'}
            </div>
          </div>
        )}

        {/* Progression changes */}
        <div className="px-6 py-4 flex justify-around border-b border-gray-800">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="text-xs text-gray-500">XP</div>
            <div className="text-green-400 font-semibold text-base">+{xpGained}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="text-xs text-gray-500">LP</div>
            <div
              className="font-semibold text-base"
              style={{ color: lpChange >= 0 ? '#22C55E' : '#EF4444' }}
            >
              {lpChange >= 0 ? '+' : ''}{lpChange}
            </div>
          </motion.div>
        </div>

        {/* Rewarded ad offer (on loss) */}
        {!isWin && (
          <div className="px-6 py-3 border-b border-gray-800">
            <AdSlot type="rewarded" className="text-xs" />
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-5 flex flex-col gap-3">
          <button
            onClick={replay}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
            style={{ background: '#22C55E', color: '#0A0E1A' }}
          >
            Nochmal spielen
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-xl font-semibold text-sm border border-gray-700 text-gray-300 hover:bg-gray-800 transition-all"
          >
            Zur Startseite
          </button>
        </div>
      </motion.div>

      {/* Leaderboard ad */}
      <div className="mt-6 w-full max-w-lg">
        <AdSlot type="leaderboard" />
      </div>
    </div>
  );
}
