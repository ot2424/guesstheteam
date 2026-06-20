import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormationGrid } from '../components/game/FormationGrid';
import { MobilePlayerList } from '../components/game/MobilePlayerList';
import { CareerTipDrawer } from '../components/game/CareerTipDrawer';
import { CentralSearchField } from '../components/game/CentralSearchField';
import { GameTimer } from '../components/game/GameTimer';
import { FlagIcon } from '../components/ui/FlagIcon';
import { TeamBadge } from '../components/ui/TeamBadge';
import { autoSolvePlayer, finishGame, getProfile, skipRankedTeam, startGame, submitGuess } from '../lib/api';
import { DAILY_CASUAL_SKIP_LIMIT, consumeDailyCasualSkip, getDailyCasualSkipsRemaining } from '../lib/dailyCasualSkips';
import { getRankedSurrenderLpChange } from '../lib/progression';
import { clearSavedGame, loadSavedGame, matchesSavedGame, saveGame } from '../lib/savedGame';
import type { Difficulty, GuessState, MatchType, PlayerCard, PlayMode, Rank, Team, UserProfile } from '../types';
import { getPositionLabel } from '../utils/footballDisplay';
import { getClubInitials, getCurrentClub } from '../utils/playerHints';

const COMPLETION_THRESHOLD = 0.8;

export function GamePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const legacyMode = params.get('mode');
  const playMode = (params.get('playMode') ?? 'casual') as PlayMode;
  const matchType = (params.get('matchType') ?? legacyMode ?? 'single') as MatchType;
  const difficulty = (params.get('difficulty') ?? 'easy') as Difficulty;
  const rank = (params.get('rank') ?? 'Bronze 3') as Rank;
  const leagueId = params.get('leagueId') ?? undefined;
  const hintMode = playMode === 'worldcup' ? 'club' : 'nationality';

  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [finished, setFinished] = useState(false);
  const [activeTipId, setActiveTipId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);
  const [guesses, setGuesses] = useState<Record<string, GuessState>>({});
  const [effectiveDifficulty, setEffectiveDifficulty] = useState<Difficulty>(difficulty);
  const [effectiveRank, setEffectiveRank] = useState<Rank>(rank);
  const [surrenderLpChange, setSurrenderLpChange] = useState<number | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [restartNonce, setRestartNonce] = useState(0);
  const [excludedTeamIds, setExcludedTeamIds] = useState<string[]>([]);
  const [casualSkipsRemaining, setCasualSkipsRemaining] = useState(() => getDailyCasualSkipsRemaining());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function createSession() {
      try {
        setLoading(true);
        setError(null);
        const saved = loadSavedGame();

        if (saved && matchesSavedGame(saved, { playMode, matchType, difficulty, rank, leagueId })) {
          setSessionId(saved.sessionId);
          setTeam(saved.team);
          setGuesses(saved.guesses);
          setStartedAt(saved.startedAt);
          setEffectiveDifficulty(saved.difficulty);
          setEffectiveRank(saved.rank);
          setSurrenderLpChange(saved.surrenderLpChange ?? getRankedSurrenderLpChange(saved.difficulty, saved.matchType));
          return;
        }

        const response = await startGame({
          playMode,
          matchType,
          difficulty,
          rank,
          leagueId,
          excludeTeamIds: excludedTeamIds,
        });

        if (controller.signal.aborted) return;

        const nextStartedAt = Date.now();
        setSessionId(response.sessionId);
        setTeam(response.team);
        setEffectiveDifficulty(response.difficulty);
        setEffectiveRank(response.rank);
        setSurrenderLpChange(response.surrenderLpChange);
        setStartedAt(nextStartedAt);
        setGuesses(Object.fromEntries(
          response.team.players.map((player) => [
            player.id,
            { playerId: player.id, solved: false, attempts: 0, revealed: false },
          ]),
        ));
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Spiel konnte nicht gestartet werden.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void createSession();

    return () => controller.abort();
  }, [difficulty, excludedTeamIds, leagueId, matchType, playMode, rank, restartNonce]);

  useEffect(() => {
    let active = true;
    getProfile()
      .then((response) => {
        if (active) setProfile(response.profile);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!sessionId || !team || finished || loading) return;

    saveGame({
      sessionId,
      team,
      guesses,
      startedAt,
      playMode,
      matchType,
      difficulty: effectiveDifficulty,
      rank: effectiveRank,
      surrenderLpChange: surrenderLpChange ?? undefined,
      leagueId,
      savedAt: Date.now(),
    });
  }, [effectiveDifficulty, effectiveRank, finished, guesses, leagueId, loading, matchType, playMode, sessionId, startedAt, surrenderLpChange, team]);

  const solved = useMemo(
    () => Object.values(guesses).filter((g: GuessState) => g.solved).length,
    [guesses]
  );
  const total = team?.players.length ?? 0;
  const completionRatio = total > 0 ? solved / total : 0;
  const canCompleteLevel = completionRatio >= COMPLETION_THRESHOLD && solved < total && !finished;
  const rankedLossText = `${surrenderLpChange ?? getRankedSurrenderLpChange(effectiveDifficulty, matchType)} LP`;
  const inventory = profile?.inventory ?? { skipShields: 0, autoSolveJokers: 0 };

  // Active tip player object
  const activeTipPlayer: PlayerCard | null = activeTipId
    ? (team?.players.find(p => p.id === activeTipId) ?? null)
    : null;

  const goToResult = useCallback((finish: Awaited<ReturnType<typeof finishGame>>, currentTeam: Team) => {
    clearSavedGame();
    navigate('/result', {
      state: {
        teamName: currentTeam.name,
        teamLogo: currentTeam.logoUrl,
        season: currentTeam.season,
        solved: finish.result.solved,
        total: finish.result.total,
        durationSec: finish.result.durationSec,
        isWin: finish.result.isWin,
        isPerfect: finish.result.isPerfect,
        completionRatio: finish.result.completionRatio,
        xpGained: finish.progression.xpGained,
        lpChange: finish.progression.lpChange,
        profile: finish.profile,
      },
    });
  }, [navigate]);

  // Central guess handler — checks all unsolved players
  const handleGuess = useCallback(async (name: string) => {
    if (finished || !sessionId || !team) return;

    try {
      const result = await submitGuess({ sessionId, input: name });

      if (result.correct && result.matchedPlayerId && result.name) {
      setLastResult('correct');
      setActiveTipId(null);  // close tip drawer on correct guess
      setGuesses(prev => {
        const existing = prev[result.matchedPlayerId as string] as GuessState;
        const next = {
          ...prev,
          [result.matchedPlayerId as string]: {
            ...existing,
            solved: true,
            attempts: existing.attempts + 1,
            guessedName: result.name,
          },
        };

        const allSolved = Object.values(next).every((g: GuessState) => g.solved);
        if (allSolved) {
          setFinished(true);
          window.setTimeout(() => {
            void finishGame({ sessionId, reason: 'complete' }).then((finish) => goToResult(finish, team));
          }, 900);
        }
        return next;
      });
    } else {
      setLastResult('wrong');
      setGuesses(prev => {
        // increment global wrong-attempt counter on active card (if any), otherwise no-op
        if (!activeTipId) return prev;
        const existing = prev[activeTipId] as GuessState;
        return { ...prev, [activeTipId]: { ...existing, attempts: existing.attempts + 1 } };
      });
    }
    } catch (err) {
      setLastResult('wrong');
      if (err instanceof Error && err.message.includes('Session not found')) clearSavedGame();
      setError(err instanceof Error ? err.message : 'Antwort konnte nicht geprüft werden.');
    }

    // Reset lastResult after flash
    window.setTimeout(() => setLastResult(null), 700);
  }, [activeTipId, finished, goToResult, sessionId, team]);

  const handleCompleteLevel = useCallback(async () => {
    if (!sessionId || !team || finished || !canCompleteLevel) return;

    setFinished(true);

    try {
      const finish = await finishGame({ sessionId, reason: 'complete' });
      goToResult(finish, team);
    } catch (err) {
      setFinished(false);
      setError(err instanceof Error ? err.message : 'Level konnte nicht abgeschlossen werden.');
    }
  }, [canCompleteLevel, finished, goToResult, sessionId, team]);

  const handleSurrender = useCallback(async () => {
    if (!sessionId || !team || finished) {
      navigate('/');
      return;
    }

    setFinished(true);

    try {
      const finish = await finishGame({ sessionId, reason: 'surrender' });
      goToResult(finish, team);
    } catch {
      navigate('/');
    }
  }, [finished, goToResult, navigate, sessionId, team]);

  const handleSkipShield = useCallback(async () => {
    if (!sessionId || !team || playMode !== 'ranked' || inventory.skipShields <= 0 || finished) return;

    try {
      const response = await skipRankedTeam({ sessionId });
      setProfile(response.profile);
      clearSavedGame();
      setExcludedTeamIds((ids) => [team.id, ...ids.filter((id) => id !== team.id)].slice(0, 10));
      setLoading(true);
      setSessionId(null);
      setTeam(null);
      setGuesses({});
      setActiveTipId(null);
      setFinished(false);
      setRestartNonce((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Schild konnte nicht eingesetzt werden.');
    }
  }, [finished, inventory.skipShields, playMode, sessionId, team]);

  const handleCasualFreeSkip = useCallback(() => {
    if (!team || playMode !== 'casual' || finished || casualSkipsRemaining <= 0) return;
    if (!consumeDailyCasualSkip()) {
      setCasualSkipsRemaining(0);
      return;
    }

    setCasualSkipsRemaining(getDailyCasualSkipsRemaining());
    clearSavedGame();
    setExcludedTeamIds((ids) => [team.id, ...ids.filter((id) => id !== team.id)].slice(0, 10));
    setLoading(true);
    setSessionId(null);
    setTeam(null);
    setGuesses({});
    setActiveTipId(null);
    setFinished(false);
    setError(null);
    setRestartNonce((value) => value + 1);
  }, [casualSkipsRemaining, finished, playMode, team]);

  const handleAutoSolve = useCallback(async () => {
    if (!sessionId || !activeTipId || playMode !== 'ranked' || inventory.autoSolveJokers <= 0 || finished) return;

    try {
      const response = await autoSolvePlayer({ sessionId, playerId: activeTipId });
      setProfile(response.profile);
      setLastResult('correct');
      setGuesses(prev => {
        const existing = prev[response.solved.playerId] as GuessState;
        const next = {
          ...prev,
          [response.solved.playerId]: {
            ...existing,
            solved: true,
            attempts: existing.attempts,
            guessedName: response.solved.name,
          },
        };
        const allSolved = Object.values(next).every((g: GuessState) => g.solved);
        if (allSolved && team) {
          setFinished(true);
          window.setTimeout(() => {
            void finishGame({ sessionId, reason: 'complete' }).then((finish) => goToResult(finish, team));
          }, 900);
        }
        return next;
      });
      setActiveTipId(null);
      window.setTimeout(() => setLastResult(null), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Joker konnte nicht eingesetzt werden.');
    }
  }, [activeTipId, finished, goToResult, inventory.autoSolveJokers, playMode, sessionId, team]);

  const handleTipClick = useCallback((playerId: string) => {
    setActiveTipId(prev => prev === playerId ? null : playerId);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#06090f' }}>
        <div className="text-sm text-gray-500">Match wird vorbereitet...</div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#06090f' }}>
        <div className="max-w-sm w-full rounded-2xl border border-red-900/60 p-5 text-center" style={{ background: '#111827' }}>
          <div className="bebas text-2xl tracking-wider text-red-400">Start fehlgeschlagen</div>
          <p className="text-sm text-gray-400 mt-2">{error ?? 'Keine Teamdaten erhalten.'}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: '#22C55E', color: '#0A0E1A' }}
          >
            Zurueck
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#06090f' }}>
      <div className="max-w-6xl mx-auto px-4 py-4 flex gap-6">

        {/* ─── Main column ─── */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Game header */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3"
               style={{ background: 'linear-gradient(180deg,#0e141d,#0a0e16)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3">
              <TeamBadge name={team.name} logoUrl={team.logoUrl} size={36} />
              <div>
                <h1 className="bebas text-xl tracking-wider text-white leading-none">{team.name}</h1>
                <div className="text-xs text-gray-500">{team.season}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GameTimer key={startedAt} startedAt={startedAt} active={!finished} />
              <div className="flex gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg capitalize border" style={{ background: '#161d29', borderColor: 'rgba(255,255,255,0.1)', color: '#e5e9f0' }}>
                  {effectiveDifficulty === 'easy' ? '🟢' : effectiveDifficulty === 'medium' ? '🟡' : '🔴'} {effectiveDifficulty}
                </span>
                <span className="px-2.5 py-1 rounded-lg border"
                      style={ playMode === 'ranked'
                        ? { background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.4)', color: '#2bd46a' }
                        : { background: '#161d29', borderColor: 'rgba(255,255,255,0.1)', color: '#94a0b0' } }>
                  {playMode === 'ranked' ? 'Ranked' : playMode === 'worldcup' ? 'WM-Modus' : 'Freizeit'} · {matchType === 'series' ? '3er-Serie' : 'Einzel'}
                </span>
              </div>
              <button
                onClick={() => setShowSurrenderModal(true)}
                className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
              >
                ✕ Aufgeben
              </button>
            </div>
          </div>

          {/* ─── Central search field — FIXED on mobile ─── */}
          <div className="sticky top-14 z-30 py-2 -mx-4 px-4 sm:static sm:p-0 sm:mx-0"
               style={{ background: 'rgba(6,9,15,0.95)', backdropFilter: 'blur(8px)' }}>
            <CentralSearchField
              onGuess={handleGuess}
              solvedCount={solved}
              totalCount={total}
              disabled={finished}
              lastResult={lastResult}
            />
            {playMode === 'ranked' && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => void handleSkipShield()}
                  disabled={finished || inventory.skipShields <= 0}
                  className="rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(59,130,246,0.12)',
                    borderColor: 'rgba(59,130,246,0.35)',
                    color: '#93c5fd',
                  }}
                  title="Überspringt dieses Team ohne LP-Verlust und ohne Streak-Bruch."
                >
                  Schild x{inventory.skipShields}
                </button>
                <button
                  onClick={() => void handleAutoSolve()}
                  disabled={finished || !activeTipId || inventory.autoSolveJokers <= 0}
                  className="rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(245,158,11,0.12)',
                    borderColor: 'rgba(245,158,11,0.35)',
                    color: '#facc15',
                  }}
                  title="Löst genau die aktuell ausgewählte Karte. Keine Teiltipps."
                >
                  Auto-Solve x{inventory.autoSolveJokers}
                </button>
              </div>
            )}
            {playMode === 'casual' && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={handleCasualFreeSkip}
                  disabled={finished || casualSkipsRemaining <= 0}
                  className="rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(34,197,94,0.10)',
                    borderColor: 'rgba(34,197,94,0.35)',
                    color: '#86efac',
                  }}
                  title="Drei kostenlose Freizeit-Skips pro Tag. Kein XP, kein LP, keine Auswirkung."
                >
                  Free Skip {casualSkipsRemaining}/{DAILY_CASUAL_SKIP_LIMIT}
                </button>
              </div>
            )}
            {canCompleteLevel && (
              <div className="mt-2 flex justify-center">
                <button
                  onClick={() => void handleCompleteLevel()}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold border border-green-500/50 bg-green-500/10 text-green-300 hover:bg-green-500/15 transition-colors"
                  style={{ boxShadow: '0 0 18px rgba(34,197,94,0.2)' }}
                >
                  Level abschließen · {Math.round(completionRatio * 100)}%
                </button>
              </div>
            )}
          </div>

          {/* ─── Formation (desktop) / List (mobile) ─── */}
          <div className="hidden sm:block">
            <FormationGrid
              players={team.players}
              formation={team.formation}
              guesses={guesses}
              onTipClick={handleTipClick}
              activeTipId={activeTipId}
              hintMode={hintMode}
            />
          </div>

          <div className="sm:hidden">
            <MobilePlayerList
              players={team.players}
              guesses={guesses}
              onTipClick={handleTipClick}
              activeTipId={activeTipId}
              hintMode={hintMode}
            />
          </div>

          {/* ─── Career tip drawer — inline on desktop, bottom sheet on mobile ─── */}
          <div className="hidden sm:block">
            <CareerTipDrawer
              player={activeTipPlayer}
              onClose={() => setActiveTipId(null)}
              hintMode={hintMode}
            />
          </div>

        </main>

        {/* ─── Sidebar ─── */}
        <aside className="hidden lg:flex flex-col gap-4 flex-shrink-0" style={{ width: '180px' }}>
          <div className="rounded-2xl border p-4" style={{ background: 'linear-gradient(180deg,#0e141d,#0a0e16)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="text-xs text-gray-500 mb-3 tracking-[0.18em]">FORTSCHRITT</div>
            <div className="space-y-2.5">
              {team.players.map(p => {
                const g = guesses[p.id] as GuessState;
                const currentClub = getCurrentClub(p);
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    {hintMode === 'club' && currentClub ? (
                      <ClubProgressLogo name={currentClub.clubName} logoUrl={currentClub.logoUrl} />
                    ) : (
                      <FlagIcon
                        nationality={p.nationality}
                        nationality2={p.nationality2}
                        size={18}
                        variant="inline"
                        className="w-10 flex-shrink-0"
                      />
                    )}
                    <span className="text-xs text-gray-600">{getPositionLabel(p.position)}</span>
                    <span className="ml-auto text-xs">
                      {g.solved ? <span className="text-green-400">✓</span> : <span className="text-gray-700">·</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile bottom sheet tip drawer */}
      <div className="sm:hidden">
        <CareerTipDrawer
          player={activeTipPlayer}
          onClose={() => setActiveTipId(null)}
          hintMode={hintMode}
        />
      </div>

      {showSurrenderModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl border border-white/12 p-5" style={{ background: '#111827' }}>
            <div className="bebas text-2xl tracking-wider text-white">Wirklich aufgeben?</div>
            <p className="mt-2 text-sm text-gray-400">
              Dein aktueller Fortschritt wird beendet.
              {playMode === 'ranked'
                ? ` Im Ranked-Modus verlierst du dadurch ${rankedLossText}.`
                : ' Im Freizeit-Modus verlierst du keine LP.'}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowSurrenderModal(false)}
                className="flex-1 rounded-xl border border-white/12 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors"
              >
                Weiterspielen
              </button>
              <button
                onClick={() => {
                  setShowSurrenderModal(false);
                  void handleSurrender();
                }}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                style={{ background: '#DC2626' }}
              >
                Aufgeben
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClubProgressLogo({ name, logoUrl }: { name: string; logoUrl: string }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className="h-5 w-10 object-contain flex-shrink-0"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <span
      className="h-5 w-10 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-black"
      style={{ background: '#161d29', border: '1px solid rgba(255,255,255,0.1)', color: '#d4dae3' }}
    >
      {getClubInitials(name)}
    </span>
  );
}
