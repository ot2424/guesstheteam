import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RankBadge } from '../ui/RankBadge';
import { JerseyIcon } from '../ui/JerseyIcon';
import { useAuth } from '../../lib/useAuth';
import { getProfile, getSocialOverview } from '../../lib/api';
import type { UserProfile } from '../../types';

const NAV_LINKS = [
  { to: '/',        label: 'Home'    },
  { to: '/play',    label: 'Spielen' },
  { to: '/online', label: 'Online' },
  { to: '/leaderboard', label: 'Rangliste' },
  { to: '/profile', label: 'Profil'  },
];

export function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, displayName, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const activeProfile = profile?.id === user?.id ? profile : null;
  const hideOnMobileDuringPlay = pathname.startsWith('/play');

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;
    getProfile()
      .then((response) => {
        if (active) setProfile(response.profile);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    getSocialOverview()
      .then((response) => {
        if (active) setNotificationCount(response.notificationCount);
      })
      .catch(() => {
        if (active) setNotificationCount(0);
      });

    return () => { active = false; };
  }, [isAuthenticated, user?.id]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <nav className={`${hideOnMobileDuringPlay ? 'hidden sm:block' : ''} sticky top-0 z-50 border-b backdrop-blur-md`}
         style={{ background: 'rgba(6,9,15,0.82)', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 min-h-14 sm:h-14 flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 py-2 sm:py-0">
        {/* Logo — Trikot-Icon */}
        <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5 mr-auto sm:mr-4">
          <JerseyIcon size={28} color="#22c55e" />
          <span className="hidden min-[360px]:inline truncate font-extrabold text-[13px] min-[430px]:text-[15px] tracking-[0.12em] sm:tracking-[0.14em] text-white">
            GUESSTHETEAM
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden sm:flex gap-1 flex-1">
          {NAV_LINKS.map(({ to, label }) => {
            const active = pathname === to || (to !== '/' && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`relative px-3.5 py-1.5 text-sm rounded-lg transition-colors ${
                  active ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg"
                    style={{ zIndex: -1, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)' }}
                  />
                )}
                {label}
              </Link>
            );
          })}
        </div>

        <div className="order-3 grid w-full grid-cols-5 gap-1 sm:hidden">
          {NAV_LINKS.map(({ to, label }) => {
            const active = pathname === to || (to !== '/' && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`rounded-lg px-1 py-2 text-center text-[11px] font-semibold transition-colors ${
                  active ? 'text-white' : 'text-gray-500'
                }`}
                style={active ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)' } : { border: '1px solid transparent' }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Rechts: eingeloggt → Avatar-Menü mit Logout · sonst → Einloggen */}
        {isAuthenticated ? (
          <div className="relative flex items-center gap-2 sm:gap-3">
            <div className="hidden min-[420px]:block">
              {activeProfile && <RankBadge rank={activeProfile.rank} size="sm" />}
            </div>
            <Link
              to="/leaderboard"
              className="relative hidden h-8 w-8 items-center justify-center rounded-full border text-sm text-gray-400 transition-colors hover:text-white sm:flex"
              style={{ borderColor: 'rgba(255,255,255,0.1)', background: '#111827' }}
              aria-label="Benachrichtigungen"
            >
              🔔
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-black text-black">
                  {notificationCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                   style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid #15803d', color: '#7ee2a8' }}>
                {displayName[0]?.toUpperCase()}
              </div>
              <span
                className="text-sm text-gray-300 hidden sm:block"
                style={activeProfile?.prestige.nameGlow ? { textShadow: `0 0 14px ${activeProfile.prestige.nameGlow}` } : undefined}
              >
                {activeProfile?.username ?? displayName}
              </span>
              <span className="text-gray-500 text-[10px] hidden sm:block">▼</span>
            </button>

            {menuOpen && (
              <>
                {/* Klick-außerhalb-Schließer */}
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-12 z-50 w-48 rounded-xl border p-1.5"
                  style={{ background: '#0e141d', borderColor: 'rgba(255,255,255,0.13)', boxShadow: '0 18px 40px rgba(0,0,0,0.55)' }}
                >
                  <div className="px-3 py-2 text-xs text-gray-500 border-b mb-1" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    Angemeldet als<br /><span className="text-gray-300 font-semibold">{activeProfile?.username ?? displayName}</span>
                    {activeProfile && <div className="mt-1 text-green-300">Level {activeProfile.level} · {activeProfile.rank}</div>}
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    Profil
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-red-500/10"
                    style={{ color: '#f87171' }}
                  >
                    Ausloggen
                  </button>
                </motion.div>
              </>
            )}
          </div>
        ) : (
          <Link
            to="/auth"
            className="text-sm font-extrabold px-4 py-2 rounded-lg transition-all active:scale-95"
            style={{ background: '#22C55E', color: '#04130a', boxShadow: '0 6px 16px rgba(34,197,94,0.3)' }}
          >
            Einloggen
          </Link>
        )}
      </div>
    </nav>
  );
}
