import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  createOnlineMatchup,
  finishOnlineMatchup,
  getOnlineMatchup,
  getOnlineMatchups,
  getProfile,
  getSocialOverview,
  guessOnlineMatchup,
  joinOnlineMatchup,
  leaveOnlineMatchup,
} from '../lib/api';
import { ONLINE_UNLOCK_LEVEL } from '../lib/progression';
import { useAuth } from '../lib/useAuth';
import type { FriendRequestSummary, OnlineMatchup, UserProfile } from '../types';

const cardStyle = {
  background: 'linear-gradient(180deg,#0e141d,#0a0e16)',
  borderColor: 'rgba(255,255,255,0.08)',
} as const;

export function OnlinePage() {
  const { isAuthenticated, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = searchParams.get('match');
  const [friends, setFriends] = useState<FriendRequestSummary[]>([]);
  const [matchups, setMatchups] = useState<OnlineMatchup[]>([]);
  const [active, setActive] = useState<OnlineMatchup | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [guess, setGuess] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pending = useMemo(() => matchups.filter((matchup) => matchup.status === 'pending'), [matchups]);
  const running = useMemo(() => matchups.filter((matchup) => matchup.status === 'active'), [matchups]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    setProfileLoading(true);
    getProfile()
      .then((response) => {
        if (mounted) setProfile(response.profile);
        if (response.profile.level >= ONLINE_UNLOCK_LEVEL) void refreshLobby();
      })
      .catch(() => {
        if (mounted) setProfile(null);
      })
      .finally(() => {
        if (mounted) setProfileLoading(false);
      });
    return () => { mounted = false; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !activeId) return;
    const matchupId = activeId;
    let mounted = true;

    async function loadActive() {
      try {
        const response = await joinOnlineMatchup(matchupId);
        if (mounted) setActive(response.matchup);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Online-Match konnte nicht geladen werden.');
      }
    }

    void loadActive();
    const interval = window.setInterval(() => {
      getOnlineMatchup(matchupId)
        .then((response) => {
          if (mounted) setActive(response.matchup);
        })
        .catch(() => undefined);
    }, 5000);

    const markLeft = () => {
      void leaveOnlineMatchup(matchupId).catch(() => undefined);
    };
    window.addEventListener('pagehide', markLeft);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('pagehide', markLeft);
      markLeft();
    };
  }, [activeId, isAuthenticated]);

  async function refreshLobby() {
    const [socialResponse, matchupsResponse] = await Promise.all([
      getSocialOverview(),
      getOnlineMatchups(),
    ]);
    setFriends(socialResponse.friends);
    setMatchups(matchupsResponse.matchups);
  }

  async function handleCreate(opponentId: string) {
    setError(null);
    setNotice(null);
    try {
      const response = await createOnlineMatchup(opponentId);
      setActive(response.matchup);
      setSearchParams({ match: response.matchup.id });
      await refreshLobby();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Match konnte nicht erstellt werden.');
    }
  }

  async function handleOpen(matchupId: string) {
    setSearchParams({ match: matchupId });
  }

  async function handleGuess(event: FormEvent) {
    event.preventDefault();
    if (!active || !guess.trim()) return;
    setError(null);
    setNotice(null);
    try {
      const response = await guessOnlineMatchup(active.id, guess);
      setActive(response.matchup);
      setGuess('');
      setNotice(response.correct ? `${response.name} geloest.` : 'Falsch geraten.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tipp konnte nicht gesendet werden.');
    }
  }

  async function handleFinish() {
    if (!active) return;
    setError(null);
    try {
      const response = await finishOnlineMatchup(active.id);
      setActive(response.matchup);
      await refreshLobby();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Match konnte nicht abgeschlossen werden.');
    }
  }

  if (loading || profileLoading) return <PageShell><div className="text-gray-500">Online-Modus wird geladen...</div></PageShell>;

  if (!isAuthenticated) {
    return (
      <PageShell>
        <div className="max-w-sm rounded-2xl border p-6 text-center" style={cardStyle}>
          <div className="bebas text-3xl text-white">Login erforderlich</div>
          <p className="mt-2 text-sm text-gray-500">Online-Matches funktionieren vorerst nur gegen Freunde.</p>
          <Link to="/auth" className="mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-extrabold" style={{ background: '#22C55E', color: '#04130a' }}>
            Einloggen
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!profile || profile.level < ONLINE_UNLOCK_LEVEL) {
    return (
      <PageShell>
        <div className="max-w-md rounded-2xl border p-6 text-center" style={cardStyle}>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-green-400">Gesperrt</div>
          <div className="bebas mt-2 text-4xl text-white">Online ab Level {ONLINE_UNLOCK_LEVEL}</div>
          <p className="mt-2 text-sm text-gray-500">
            Spiele Freizeit, WM oder Ranked, bis du Level {ONLINE_UNLOCK_LEVEL} erreichst. Danach kannst du Freunde herausfordern.
          </p>
          {profile && (
            <div className="mt-5 rounded-xl border p-4 text-left" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="text-sm font-black text-white">Aktuell Level {profile.level}</div>
              <div className="mt-1 text-xs text-gray-500">{Math.max(0, ONLINE_UNLOCK_LEVEL - profile.level)} Level fehlen noch.</div>
            </div>
          )}
          <Link to="/" className="mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-extrabold" style={{ background: '#22C55E', color: '#04130a' }}>
            Zur Startseite
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="grid w-full max-w-6xl gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-5">
          <section className="rounded-2xl border p-4" style={cardStyle}>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-green-400">Online</div>
            <h1 className="bebas mt-2 text-4xl text-white">Freunde-Duell</h1>
            <p className="mt-2 text-sm text-gray-500">Gleiches Team, gleiche 45 Minuten. Gewinner wird nach gelösten Spielern und danach Zeit entschieden.</p>
          </section>

          {(error || notice) && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'text-red-300' : 'text-green-300'}`} style={{ ...cardStyle, borderColor: error ? 'rgba(248,113,113,0.35)' : 'rgba(34,197,94,0.35)' }}>
              {error ?? notice}
            </div>
          )}

          <section className="rounded-2xl border p-4" style={cardStyle}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-green-400">Freunde</div>
                <div className="text-sm text-gray-500">Challenge starten</div>
              </div>
              <button onClick={() => void refreshLobby()} className="rounded-lg border px-3 py-2 text-xs font-black text-gray-300" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                Aktualisieren
              </button>
            </div>
            <div className="space-y-2">
              {friends.length === 0 && <div className="text-sm text-gray-600">Noch keine Freunde. Fuege sie in der Rangliste hinzu.</div>}
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => void handleCreate(friend.user.id)}
                  className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-green-500/40"
                  style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border text-sm font-black" style={{ background: 'rgba(34,197,94,0.1)', borderColor: '#15803d', color: '#86efac' }}>
                    {friend.user.username[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">{friend.user.username}</div>
                    <div className="text-xs text-gray-500">Level {friend.user.level} · {friend.user.rank}</div>
                  </div>
                  <span className="text-xs font-black text-green-300">Start</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-4" style={cardStyle}>
            <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-green-400">Offene Matches</div>
            <div className="space-y-2">
              {[...running, ...pending].length === 0 && <div className="text-sm text-gray-600">Keine offenen Duelle.</div>}
              {[...running, ...pending].map((matchup) => (
                <button
                  key={matchup.id}
                  onClick={() => void handleOpen(matchup.id)}
                  className="w-full rounded-xl border p-3 text-left"
                  style={{ background: active?.id === matchup.id ? 'rgba(34,197,94,0.12)' : '#111827', borderColor: active?.id === matchup.id ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)' }}
                >
                  <div className="text-sm font-black text-white">{matchup.opponent.username}</div>
                  <div className="mt-1 text-xs text-gray-500">{matchup.status === 'pending' ? 'Wartet auf Beitritt' : `${matchup.self.solved}:${matchup.rival.solved} im Match`}</div>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main className="min-w-0">
          {!active && (
            <section className="rounded-2xl border p-8 text-center" style={cardStyle}>
              <div className="bebas text-4xl text-white">Kein Match ausgewählt</div>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">Starte eine Challenge gegen einen Freund oder öffne ein laufendes Duell.</p>
            </section>
          )}

          {active && (
            <section className="rounded-2xl border" style={cardStyle}>
              <div className="border-b p-4 sm:p-5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-green-400">Online-Match</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {active.team.logoUrl && <img src={active.team.logoUrl} alt="" className="h-8 w-8 object-contain" />}
                      <h2 className="bebas text-4xl text-white">{active.team.name}</h2>
                      <span className="text-sm text-gray-500">{active.team.season} · {active.team.league}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border px-4 py-3 text-center" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="text-xs text-gray-500">Direkter Stand</div>
                    <div className="bebas text-3xl text-white">{active.pairScore.selfWins} - {active.pairScore.opponentWins}</div>
                    <div className="text-xs text-gray-500">gegen {active.opponent.username}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 border-b p-4 sm:grid-cols-3 sm:p-5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <ScoreCard label="Du" score={active.self.solved} total={active.self.total} duration={active.self.durationSec} finished={active.self.finished} />
                <ScoreCard label={active.opponent.username} score={active.rival.solved} total={active.rival.total} duration={active.rival.durationSec} finished={active.rival.finished} />
                <div className="rounded-xl border p-4" style={{ background: '#111827', borderColor: active.reconnectDeadlineAt ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.08)' }}>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="mt-1 text-sm font-black text-white">{getStatusText(active)}</div>
                  <div className="mt-1 text-xs text-gray-500">{active.status === 'completed' ? getWinnerText(active) : `Max. bis ${formatClock(active.expiresAt)}`}</div>
                </div>
              </div>

              {active.status === 'active' && (
                <form onSubmit={handleGuess} className="flex gap-2 border-b p-4 sm:p-5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <input
                    value={guess}
                    onChange={(event) => setGuess(event.target.value)}
                    autoComplete="off"
                    placeholder="Spielername..."
                    className="h-12 min-w-0 flex-1 rounded-xl border px-4 text-white outline-none"
                    style={{ background: '#0f1722', borderColor: 'rgba(255,255,255,0.1)' }}
                  />
                  <button className="rounded-xl px-5 text-sm font-black" style={{ background: '#22C55E', color: '#04130a' }}>
                    Raten
                  </button>
                  <button type="button" onClick={() => void handleFinish()} className="rounded-xl border px-4 text-sm font-black text-gray-300" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                    Abgeben
                  </button>
                </form>
              )}

              {active.status === 'pending' && (
                <div className="border-b p-4 text-sm text-gray-500 sm:p-5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  Warte auf {active.opponent.username}. Sobald dein Freund beitritt, startet das Match.
                </div>
              )}

              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
                {active.team.players.map((player) => {
                  const solved = active.selfSolvedPlayerIds.includes(player.id);
                  return (
                    <div key={player.id} className="rounded-xl border p-3" style={{ background: '#111827', borderColor: solved ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg border px-2 py-1 text-xs font-black text-blue-300" style={{ borderColor: 'rgba(96,165,250,0.25)', background: 'rgba(37,99,235,0.12)' }}>{player.position}</div>
                        <div className="text-sm font-bold text-white">{solved ? 'Geloest' : '???'}</div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {player.career.slice(-2).map((club) => (
                          club.logoUrl
                            ? <img key={`${player.id}-${club.clubId}`} src={club.logoUrl} alt={club.clubName} title={club.clubName} className="h-7 w-7 object-contain" />
                            : <div key={`${player.id}-${club.clubId}`} className="h-7 w-7 rounded border" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden px-4 py-8" style={{ background: '#06090f' }}>
      <div className="mx-auto flex max-w-6xl justify-center">{children}</div>
    </div>
  );
}

function ScoreCard({ label, score, total, duration, finished }: { label: string; score: number; total: number; duration: number; finished: boolean }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 bebas text-3xl text-white">{score}/{total}</div>
      <div className="text-xs text-gray-500">{formatDuration(duration)} · {finished ? 'abgegeben' : 'laeuft'}</div>
    </div>
  );
}

function getStatusText(matchup: OnlineMatchup) {
  if (matchup.status === 'pending') return 'Wartet auf Gegner';
  if (matchup.status === 'completed') return 'Beendet';
  if (matchup.reconnectDeadlineAt) return `Gegner getrennt bis ${formatClock(matchup.reconnectDeadlineAt)}`;
  return 'Aktiv';
}

function getWinnerText(matchup: OnlineMatchup) {
  if (!matchup.winnerId) return 'Unentschieden';
  return matchup.winnerId === matchup.self.userId ? 'Du hast gewonnen' : `${matchup.opponent.username} hat gewonnen`;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
