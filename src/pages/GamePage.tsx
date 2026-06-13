import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormationGrid } from '../components/game/FormationGrid';
import { MobilePlayerList } from '../components/game/MobilePlayerList';
import { CareerTipDrawer } from '../components/game/CareerTipDrawer';
import { CentralSearchField } from '../components/game/CentralSearchField';
import { GameTimer } from '../components/game/GameTimer';
import { AdSlot } from '../components/ui/AdSlot';
import { FlagIcon } from '../components/ui/FlagIcon';
import { TeamBadge } from '../components/ui/TeamBadge';
import { finishGame, startGame, submitGuess } from '../lib/api';
import type { Difficulty, GuessState, MatchType, PlayerCard, PlayMode, Rank, Team } from '../types';
import { getPositionLabel } from '../utils/footballDisplay';

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

  const [startedAt] = useState(() => Date.now());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [finished, setFinished] = useState(false);
  const [activeTipId, setActiveTipId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);
  const [guesses, setGuesses] = useState<Record<string, GuessState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function createSession() {
      try {
        setLoading(true);
        setError(null);
        const response = await startGame({
          playMode,
          matchType,
          difficulty,
          rank,
          leagueId,
        });

        if (controller.signal.aborted) return;

        setSessionId(response.sessionId);
        setTeam(response.team);
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
  }, [difficulty, leagueId, matchType, playMode, rank]);

  const solved = useMemo(
    () => Object.values(guesses).filter((g: GuessState) => g.solved).length,
    [guesses]
  );
  const total = team?.players.length ?? 0;
  const completionRatio = total > 0 ? solved / total : 0;
  const canCompleteLevel = completionRatio >= COMPLETION_THRESHOLD && solved < total && !finished;
  const rankedLossText = difficulty === 'easy' ? '-10 LP' : difficulty === 'medium' ? '-15 LP' : '-20 LP';

  // Active tip player object
  const activeTipPlayer: PlayerCard | null = activeTipId
    ? (team?.players.find(p => p.id === activeTipId) ?? null)
    : null;

  const goToResult = useCallback((finish: Awaited<ReturnType<typeof finishGame>>, currentTeam: Team) => {
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

  const handleTipClick = useCallback((playerId: string) => {
    setActiveTipId(prev => prev === playerId ? null : playerId);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--night)' }}>
        <div className="text-sm text-gray-500">Match wird vorbereitet...</div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--night)' }}>
        <div className="max-w-sm w-full rounded-xl border border-red-900/60 p-5 text-center" style={{ background: '#111827' }}>
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
    <div className="min-h-screen" style={{ background: 'var(--night)' }}>
      <div className="max-w-6xl mx-auto px-4 py-4 flex gap-6">

        {/* ─── Main column ─── */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Game header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <TeamBadge name={team.name} logoUrl={team.logoUrl} size={36} />
              <div>
                <h1 className="bebas text-xl tracking-wider text-white leading-none">{team.name}</h1>
                <div className="text-xs text-gray-500">{team.season}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <GameTimer startedAt={startedAt} active={!finished} />
              <div className="flex gap-2 text-xs text-gray-500">
                <span className="px-2 py-1 rounded bg-gray-800 capitalize">
                  {difficulty === 'easy' ? '🟢' : difficulty === 'medium' ? '🟡' : '🔴'} {difficulty}
                </span>
                <span className="px-2 py-1 rounded bg-gray-800">
                  {playMode === 'ranked' ? 'Ranked' : 'Freizeit'} · {matchType === 'series' ? '3er-Serie' : 'Einzel'}
                </span>
              </div>
              <button
                onClick={() => setShowSurrenderModal(true)}
                className="text-xs text-gray-600 hover:text-gray-400 px-3 py-1.5 rounded border border-gray-800 hover:border-gray-700 transition-colors"
              >
                ✕ Aufgeben
              </button>
            </div>
          </div>

          {/* ─── Central search field — FIXED on mobile ─── */}
          <div className="sticky top-14 z-30 py-2 -mx-4 px-4 sm:static sm:p-0 sm:mx-0"
               style={{ background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(8px)' }}>
            <CentralSearchField
              onGuess={handleGuess}
              solvedCount={solved}
              totalCount={total}
              disabled={finished}
              lastResult={lastResult}
            />
            {canCompleteLevel && (
              <div className="mt-2 flex justify-center">
                <button
                  onClick={() => void handleCompleteLevel()}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/15 transition-colors"
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
              guesses={guesses}
              onTipClick={handleTipClick}
              activeTipId={activeTipId}
            />
          </div>

          <div className="sm:hidden">
            <MobilePlayerList
              players={team.players}
              guesses={guesses}
              onTipClick={handleTipClick}
              activeTipId={activeTipId}
            />
          </div>

          {/* ─── Career tip drawer — inline on desktop, bottom sheet on mobile ─── */}
          <div className="hidden sm:block">
            <CareerTipDrawer
              player={activeTipPlayer}
              onClose={() => setActiveTipId(null)}
            />
          </div>

          <div className="mt-2">
            <AdSlot type="leaderboard" />
          </div>
        </main>

        {/* ─── Sidebar ─── */}
        <aside className="hidden lg:flex flex-col gap-4 flex-shrink-0" style={{ width: '180px' }}>
          <div className="rounded-xl border border-gray-800 p-4" style={{ background: '#111827' }}>
            <div className="text-xs text-gray-500 mb-3 uppercase tracking-widest">Fortschritt</div>
            <div className="space-y-2.5">
              {team.players.map(p => {
                const g = guesses[p.id] as GuessState;
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <FlagIcon
                      nationality={p.nationality}
                      nationality2={p.nationality2}
                      size={18}
                      variant="inline"
                      className="w-10 flex-shrink-0"
                    />
                    <span className="text-xs text-gray-600">{getPositionLabel(p.position)}</span>
                    <span className="ml-auto text-xs">
                      {g.solved ? <span className="text-green-400">✓</span> : <span className="text-gray-700">·</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <AdSlot type="sidebar" />
        </aside>
      </div>

      {/* Mobile bottom sheet tip drawer */}
      <div className="sm:hidden">
        <CareerTipDrawer
          player={activeTipPlayer}
          onClose={() => setActiveTipId(null)}
        />
      </div>

      {showSurrenderModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.62)' }}>
          <div className="w-full max-w-sm rounded-xl border border-gray-700 p-5" style={{ background: '#111827' }}>
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
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Weiterspielen
              </button>
              <button
                onClick={() => {
                  setShowSurrenderModal(false);
                  void handleSurrender();
                }}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
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
