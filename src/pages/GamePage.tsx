import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormationGrid } from '../components/game/FormationGrid';
import { MobilePlayerList } from '../components/game/MobilePlayerList';
import { CareerTipDrawer } from '../components/game/CareerTipDrawer';
import { CentralSearchField } from '../components/game/CentralSearchField';
import { GameTimer } from '../components/game/GameTimer';
import { AdSlot } from '../components/ui/AdSlot';
import { FlagIcon } from '../components/ui/FlagIcon';
import { finishGame, startGame, submitGuess } from '../lib/api';
import type { Difficulty, GuessState, MatchType, PlayerCard, PlayMode, Rank, Team } from '../types';
import { getLeagueLabel, getPositionLabel } from '../utils/footballDisplay';

function getClubInitials(name: string) {
  const parts = name
    .replace(/\b(FC|CF|SC|SV|VfB|VfL|TSG|RB)\b/g, '')
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);

  const source = parts.length > 0 ? parts : name.split(/\s+/);
  return source.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'FT';
}

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

  // Active tip player object
  const activeTipPlayer: PlayerCard | null = activeTipId
    ? (team?.players.find(p => p.id === activeTipId) ?? null)
    : null;

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
            void finishGame({ sessionId }).then((finish) => {
              navigate('/result', {
                state: {
                  teamName: team.name,
                  teamLogo: team.logoUrl,
                  season: team.season,
                  solved: finish.result.solved,
                  total: finish.result.total,
                  durationSec: finish.result.durationSec,
                  isWin: finish.result.isWin,
                  xpGained: finish.progression.xpGained,
                  lpChange: finish.progression.lpChange,
                }
              });
            });
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
  }, [activeTipId, finished, navigate, sessionId, team]);

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
              {team.logoUrl ? (
                <img
                  src={team.logoUrl} alt={team.name}
                  className="w-9 h-9 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-9 h-9 rounded-md border border-gray-700 bg-gray-900 text-gray-300 flex items-center justify-center text-xs font-bold">
                  {getClubInitials(team.name)}
                </div>
              )}
              <div>
                <h1 className="bebas text-xl tracking-wider text-white leading-none">{team.name}</h1>
                <div className="text-xs text-gray-500">{team.season} · {getLeagueLabel(team.league)}</div>
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
                onClick={() => navigate('/')}
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
          </div>

          {/* ─── Formation (desktop) / List (mobile) ─── */}
          <div className="hidden sm:block">
            <FormationGrid
              players={team.players}
              guesses={guesses}
              formation={team.formation}
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
                    <FlagIcon nationality={p.nationality} nationality2={p.nationality2} size={18} />
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
    </div>
  );
}
