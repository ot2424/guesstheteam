import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RankBadge } from '../ui/RankBadge';
import { loadUserProfile } from '../../lib/localUser';

const NAV_LINKS = [
  { to: '/',        label: 'Home'    },
  { to: '/play',    label: 'Spielen' },
  { to: '/profile', label: 'Profil'  },
];

export function Navbar() {
  const { pathname } = useLocation();
  const user = loadUserProfile();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-[#0A0E1A]/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-4">
          <span className="text-2xl">⚽</span>
          <span className="bebas text-xl tracking-widest text-green-400">FootyGuesser</span>
        </Link>

        {/* Nav links */}
        <div className="flex gap-1 flex-1">
          {NAV_LINKS.map(({ to, label }) => {
            const active = pathname === to || (to !== '/' && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`relative px-3 py-1.5 text-sm rounded transition-colors ${
                  active ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-gray-800 rounded"
                    style={{ zIndex: -1 }}
                  />
                )}
                {label}
              </Link>
            );
          })}
        </div>

        {/* User info */}
        <div className="flex items-center gap-3">
          <RankBadge rank={user.rank} size="sm" />
          <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-green-900 border border-green-700 flex items-center justify-center text-green-300 text-sm font-semibold">
              {user.username[0]}
            </div>
            <span className="text-sm text-gray-300 hidden sm:block">{user.username}</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
