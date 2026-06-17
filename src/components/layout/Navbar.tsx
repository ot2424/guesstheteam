import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RankBadge } from '../ui/RankBadge';
import { JerseyIcon } from '../ui/JerseyIcon';
import { useAuth } from '../../lib/useAuth';

const NAV_LINKS = [
  { to: '/',        label: 'Home'    },
  { to: '/play',    label: 'Spielen' },
  { to: '/profile', label: 'Profil'  },
];

export function Navbar() {
  const { pathname } = useLocation();
  const { user, isAuthenticated, signOut } = useAuth();
  const navLinks = isAuthenticated ? NAV_LINKS : NAV_LINKS.filter((link) => link.to === '/');

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
          {navLinks.map(({ to, label }) => {
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

        {/* User info (oben rechts) */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <RankBadge rank={user.rank} size="sm" />
              <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                     style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid #15803d', color: '#7ee2a8' }}>
                  {user.username[0]}
                </div>
                <span className="text-sm text-gray-300 hidden sm:block">{user.username}</span>
              </Link>
              <button
                onClick={() => void signOut()}
                className="hidden sm:block rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:border-white/20 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ borderColor: 'rgba(34,197,94,0.5)', color: '#7ee2a8' }}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
