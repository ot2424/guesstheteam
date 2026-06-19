import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { RankBadge } from '../ui/RankBadge';
import { JerseyIcon } from '../ui/JerseyIcon';
import { useAuth } from '../../lib/useAuth';
import { MOCK_USER } from '../../data/mockUser';

const NAV_LINKS = [
  { to: '/',        label: 'Home'    },
  { to: '/play',    label: 'Spielen' },
  { to: '/profile', label: 'Profil'  },
];

export function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, displayName, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 border-b backdrop-blur-md"
         style={{ background: 'rgba(6,9,15,0.82)', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        {/* Logo — Trikot-Icon */}
        <Link to="/" className="flex items-center gap-2.5 mr-4">
          <JerseyIcon size={30} color="#22c55e" />
          <span className="font-extrabold text-[15px] tracking-[0.14em] text-white">GUESSTHETEAM</span>
        </Link>

        {/* Nav links */}
        <div className="flex gap-1 flex-1">
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

        {/* Rechts: eingeloggt → Avatar-Menü mit Logout · sonst → Einloggen */}
        {isAuthenticated ? (
          <div className="flex items-center gap-3 relative">
            <RankBadge rank={MOCK_USER.rank} size="sm" />
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                   style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid #15803d', color: '#7ee2a8' }}>
                {displayName[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-gray-300 hidden sm:block">{displayName}</span>
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
                    Angemeldet als<br /><span className="text-gray-300 font-semibold">{displayName}</span>
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
