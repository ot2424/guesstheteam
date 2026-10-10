import { Link } from 'react-router-dom';
export function LegalFooter() {
  return <footer className="flex flex-wrap justify-center gap-6 border-t border-white/5 px-4 py-6 text-xs text-gray-400">
    <span>GuessTheTeam</span><Link to="/impressum" className="hover:text-white">Impressum</Link><Link to="/datenschutz" className="hover:text-white">Datenschutz</Link>
  </footer>;
}
