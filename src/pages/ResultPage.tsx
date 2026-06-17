import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TeamBadge } from '../components/ui/TeamBadge';
import { useAuth } from '../lib/useAuth';
import { loadUserProfile } from '../lib/localUser';
import type { MatchResult } from '../types';
import { getLeagueLabel } from '../utils/footballDisplay';

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
  const { applyMatchResult, syncProfile } = useAuth();
  const result = state as MatchResult | null;

  const safeResult = result ?? {
    teamName: '',
    teamLogo: '',
    season: '',
    league: '',
    solved: 0,
    total: 1,
    durationSec: 0,
    isWin: false,
    xpGained: 0,
    lpChange: 0,
  };
  const { resultId, playMode, matchType, profile, teamName, teamLogo, season, league, solved, total, durationSec, isWin, isPerfect, xpGained, lpChange } = safeResult;
  const series = safeResult.series;
  const displayWin = series?.isComplete ? Boolean(series.isWin) : isWin;
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  const accuracy = Math.round((solved / total) * 100);
  const accent = displayWin ? '#22C55E' : '#EF4444';

  useEffect(() => {
    if (!result) {
      navigate('/');
      return;
    }

    if (profile) {
      syncProfile(profile);
      return;
    }

    void applyMatchResult({
      resultId: resultId ?? `${teamName}-${season}-${durationSec}-${solved}-${lpChange}`,
      playMode,
      matchType,
      series,
      isWin,
      xpGained,
      lpChange,
    });
  }, [applyMatchResult, durationSec, isWin, lpChange, matchType, navigate, playMode, profile, result, resultId, season, series, solved, syncProfile, teamName, xpGained]);

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden" style={{ background: '#06090f' }}>
      {/* ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: `radial-gradient(50% 45% at 50% 38%, ${displayWin ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.12)'}, transparent 70%)` }} />

      {/* Result card */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-full max-w-md rounded-3xl border overflow-hidden relative"
        style={{
          background: '#111827',
          borderColor: accent,
          boxShadow: displayWin ? '0 0 60px rgba(34,197,94,0.3), 0 30px 80px rgba(0,0,0,0.6)' : '0 0 60px rgba(239,68,68,0.25), 0 30px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Top banner */}
        <div
          className="px-6 py-7 flex flex-col items-center gap-2"
          style={{ background: displayWin ? 'linear-gradient(180deg, rgba(34,197,94,0.16), rgba(34,197,94,0.02))' : 'linear-gradient(180deg, rgba(239,68,68,0.14), rgba(239,68,68,0.02))' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            className="flex items-center justify-center"
            style={{ filter: `drop-shadow(0 0 18px ${accent}aa)` }}
          >
            <ResultIcon isPerfect={isPerfect} isWin={displayWin} />
          </motion.div>
          <h1
            className="bebas text-5xl tracking-widest"
            style={{ color: accent, textShadow: `0 0 30px ${accent}66` }}
          >
            {series?.isComplete
              ? (displayWin ? 'Serie gewonnen!' : 'Serie verloren')
              : isPerfect ? 'Perfekt!' : isWin ? 'Geschafft!' : 'Niederlage'}
          </h1>
          <div className="flex items-center gap-2">
            <TeamBadge name={teamName} logoUrl={teamLogo} size={24} />
            <span className="text-gray-300 text-sm">{teamName} · {season}{league ? ` · ${getLeagueLabel(league)}` : ''}</span>
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

        {displayWin && (
          <div className="px-6 py-3 border-t border-white/5 text-center">
            <div className="text-xs font-semibold text-green-300">
              {series?.isComplete
                ? `${series.wins}/${series.total} Teams gewonnen.`
                : isPerfect ? 'Alle Spieler erraten: Perfect-Bonus erhalten.' : 'Ab 80 Prozent abgeschlossen. Mehr Treffer geben mehr XP-Bonus.'}
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

        {/* Actions */}
        <div className="px-6 py-6 flex flex-col gap-3">
          <button
            onClick={replay}
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
