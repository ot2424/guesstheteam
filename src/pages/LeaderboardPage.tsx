import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getLeaderboards, getSocialOverview, respondToFriendRequest, searchUsers, sendFriendRequest } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import type { FriendRequestSummary, PublicUserSummary } from '../types';
import { RankBadge } from '../components/ui/RankBadge';

type LeaderboardType = 'rank' | 'streak' | 'xp' | 'wins';

const TABS: Array<{ id: LeaderboardType; label: string; metric: string }> = [
  { id: 'rank', label: 'Rank', metric: 'LP' },
  { id: 'streak', label: 'Streak', metric: 'Rekord' },
  { id: 'xp', label: 'Level', metric: 'Level' },
  { id: 'wins', label: 'Siege', metric: 'Wins' },
];

const cardStyle = {
  background: 'linear-gradient(180deg,#0e141d,#0a0e16)',
  borderColor: 'rgba(255,255,255,0.08)',
} as const;

export function LeaderboardPage() {
  const { isAuthenticated, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = TABS.some((tab) => tab.id === searchParams.get('type'))
    ? searchParams.get('type') as LeaderboardType
    : 'rank';
  const [activeTab, setActiveTab] = useState<LeaderboardType>(initialTab);
  const [entries, setEntries] = useState<PublicUserSummary[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicUserSummary[]>([]);
  const [social, setSocial] = useState<{ friends: FriendRequestSummary[]; incoming: FriendRequestSummary[]; outgoing: FriendRequestSummary[]; notificationCount: number }>({
    friends: [],
    incoming: [],
    outgoing: [],
    notificationCount: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const outgoingIds = useMemo(() => new Set(social.outgoing.map((item) => item.user.id)), [social.outgoing]);
  const friendIds = useMemo(() => new Set(social.friends.map((item) => item.user.id)), [social.friends]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    getLeaderboards(activeTab)
      .then((response) => {
        if (active) setEntries(response.entries);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Rangliste konnte nicht geladen werden.');
      });
    return () => { active = false; };
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshSocial();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || query.trim().length < 2) return;

    const timeout = window.setTimeout(() => {
      searchUsers(query)
        .then((response) => setResults(response.users))
        .catch(() => setResults([]));
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [query, isAuthenticated]);

  async function refreshSocial() {
    const response = await getSocialOverview();
    setSocial(response);
  }

  async function handleAddFriend(user: PublicUserSummary) {
    setError(null);
    setNotice(null);
    try {
      await sendFriendRequest(user.id);
      setNotice(`Anfrage an ${user.username} gesendet.`);
      await refreshSocial();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anfrage konnte nicht gesendet werden.');
    }
  }

  async function handleRespond(requestId: string, action: 'accept' | 'decline') {
    setError(null);
    setNotice(null);
    try {
      await respondToFriendRequest(requestId, action);
      setNotice(action === 'accept' ? 'Freundschaftsanfrage angenommen.' : 'Freundschaftsanfrage abgelehnt.');
      await refreshSocial();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Antwort konnte nicht gespeichert werden.');
    }
  }

  if (loading) {
    return <PageShell><div className="text-gray-500">Ranglisten werden geladen...</div></PageShell>;
  }

  if (!isAuthenticated) {
    return (
      <PageShell>
        <div className="max-w-sm rounded-2xl border p-6 text-center" style={cardStyle}>
          <div className="bebas text-3xl text-white">Login erforderlich</div>
          <p className="mt-2 text-sm text-gray-500">Ranglisten, Suche und Freunde sind nur mit Account sichtbar.</p>
          <Link to="/auth" className="mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-extrabold" style={{ background: '#22C55E', color: '#04130a' }}>
            Einloggen
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-green-400">Community</div>
            <h1 className="bebas mt-2 text-5xl leading-none text-white">Ranglisten</h1>
            <p className="mt-2 max-w-xl text-sm text-gray-500">Vergleiche LP, Streak-Rekorde und Siege. Suche Spieler und baue deine Freundesliste fuer den Online-Modus auf.</p>
          </div>
          <div className="rounded-2xl border px-4 py-3 text-sm" style={cardStyle}>
            <span className="text-gray-500">Benachrichtigungen</span>
            <span className="ml-2 rounded-full bg-green-500 px-2 py-0.5 text-xs font-black text-black">{social.notificationCount}</span>
          </div>
        </div>

        {(error || notice) && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${error ? 'text-red-300' : 'text-green-300'}`} style={{ ...cardStyle, borderColor: error ? 'rgba(248,113,113,0.35)' : 'rgba(34,197,94,0.35)' }}>
            {error ?? notice}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border p-3 sm:p-4" style={cardStyle}>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="rounded-xl border px-3 py-3 text-left transition-colors"
                  style={activeTab === tab.id
                    ? { background: 'rgba(34,197,94,0.14)', borderColor: 'rgba(34,197,94,0.45)', color: '#fff' }
                    : { background: '#111827', borderColor: 'rgba(255,255,255,0.08)', color: '#8b95a5' }}
                >
                  <div className="text-sm font-black">{tab.label}</div>
                  <div className="mt-0.5 text-xs opacity-70">{tab.metric}</div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {entries.map((entry, index) => (
                <UserRow
                  key={entry.id}
                  user={entry}
                  index={index + 1}
                  metric={getMetric(activeTab, entry)}
                  action={friendIds.has(entry.id) ? 'Freund' : outgoingIds.has(entry.id) ? 'Angefragt' : 'Hinzufuegen'}
                  onAction={() => void handleAddFriend(entry)}
                  disabled={friendIds.has(entry.id) || outgoingIds.has(entry.id)}
                />
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-5">
            <section className="rounded-2xl border p-4" style={cardStyle}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-green-400">Suche</div>
                  <div className="text-sm text-gray-500">Nach Benutzername</div>
                </div>
              </div>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (event.target.value.trim().length < 2) setResults([]);
                }}
                placeholder="Username suchen..."
                className="h-12 w-full rounded-xl border px-3 text-sm text-white outline-none"
                style={{ background: '#0f1722', borderColor: 'rgba(255,255,255,0.1)' }}
              />
              <div className="mt-3 space-y-2">
                {results.map((user) => (
                  <MiniUserRow
                    key={user.id}
                    user={user}
                    label={friendIds.has(user.id) ? 'Freund' : outgoingIds.has(user.id) ? 'Offen' : 'Add'}
                    disabled={friendIds.has(user.id) || outgoingIds.has(user.id)}
                    onClick={() => void handleAddFriend(user)}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border p-4" style={cardStyle}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-green-400">Anfragen</div>
                  <div className="text-sm text-gray-500">{social.incoming.length} offen</div>
                </div>
                <div className="text-xl">🔔</div>
              </div>
              <div className="space-y-2">
                {social.incoming.length === 0 && <div className="text-sm text-gray-600">Keine offenen Anfragen.</div>}
                {social.incoming.map((request) => (
                  <div key={request.id} className="rounded-xl border p-3" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="font-bold text-white">{request.user.username}</div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => void handleRespond(request.id, 'accept')} className="flex-1 rounded-lg px-3 py-2 text-xs font-black" style={{ background: '#22C55E', color: '#04130a' }}>Annehmen</button>
                      <button onClick={() => void handleRespond(request.id, 'decline')} className="flex-1 rounded-lg border px-3 py-2 text-xs font-black text-gray-400" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>Ablehnen</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border p-4" style={cardStyle}>
              <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-green-400">Freunde</div>
              <div className="space-y-2">
                {social.friends.length === 0 && <div className="text-sm text-gray-600">Noch keine Freunde.</div>}
                {social.friends.slice(0, 8).map((friend) => (
                  <MiniUserRow key={friend.id} user={friend.user} label="Freund" disabled />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#06090f' }}>
      <div className="mx-auto flex max-w-6xl justify-center">{children}</div>
    </div>
  );
}

function UserRow({ user, index, metric, action, disabled, onAction }: {
  user: PublicUserSummary;
  index: number;
  metric: string;
  action: string;
  disabled: boolean;
  onAction: () => void;
}) {
  return (
    <div className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-3" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="bebas text-2xl text-gray-500">#{index}</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-black text-white" style={user.prestige.nameGlow ? { textShadow: `0 0 14px ${user.prestige.nameGlow}` } : undefined}>{user.username}</span>
          <RankBadge rank={user.rank} size="sm" />
        </div>
        <div className="mt-1 text-xs text-gray-500">Level {user.level} · {user.matchesWon}/{user.matchesPlayed} Siege · Serie {user.winStreak}</div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="text-right text-sm font-black text-green-300">{metric}</div>
        <button
          onClick={onAction}
          disabled={disabled}
          className="rounded-lg border px-3 py-1.5 text-xs font-black disabled:opacity-45"
          style={{ borderColor: 'rgba(34,197,94,0.35)', color: '#86efac' }}
        >
          {action}
        </button>
      </div>
    </div>
  );
}

function MiniUserRow({ user, label, disabled = false, onClick }: {
  user: PublicUserSummary;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="flex h-9 w-9 items-center justify-center rounded-full border text-sm font-black" style={{ background: 'rgba(34,197,94,0.1)', borderColor: '#15803d', color: '#86efac' }}>
        {user.username[0]?.toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-white">{user.username}</div>
        <div className="text-xs text-gray-500">Level {user.level} · {user.rank}</div>
      </div>
      {onClick && (
        <button onClick={onClick} disabled={disabled} className="rounded-lg border px-3 py-1.5 text-xs font-black disabled:opacity-45" style={{ borderColor: 'rgba(34,197,94,0.35)', color: '#86efac' }}>
          {label}
        </button>
      )}
      {!onClick && <span className="text-xs font-bold text-green-300">{label}</span>}
    </div>
  );
}

function getMetric(type: LeaderboardType, user: PublicUserSummary) {
  if (type === 'streak') return `${user.bestWinStreak} Siege`;
  if (type === 'xp') return `Level ${user.level}`;
  if (type === 'wins') return `${user.matchesWon} Siege`;
  return `${user.lp} LP`;
}
