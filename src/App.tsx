import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './lib/useAuth';
import { LegalFooter } from './components/layout/LegalFooter';
import { AppStatus } from './components/layout/AppStatus';
import { Navbar } from './components/layout/Navbar';

const LegalPage = lazy(() => import('./pages/LegalPage').then(module => ({ default: module.LegalPage })));
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const GamePage = lazy(() => import('./pages/GamePage').then(module => ({ default: module.GamePage })));
const ResultPage = lazy(() => import('./pages/ResultPage').then(module => ({ default: module.ResultPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const TutorialPage = lazy(() => import('./pages/TutorialPage').then(module => ({ default: module.TutorialPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then(module => ({ default: module.LeaderboardPage })));
const OnlinePage = lazy(() => import('./pages/OnlinePage').then(module => ({ default: module.OnlinePage })));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}

function AppShell() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
  return (
    <div className={`app-shell ${pathname === '/play' ? 'app-shell-game' : ''}`}>
      <Navbar />
      <AppStatus />
      <Suspense fallback={<div role="status" className="min-h-screen grid place-items-center text-green-300">Spiel wird geladen…</div>}>
      <Routes>
          <Route path="/"         element={<HomePage />} />
          <Route path="/play"     element={<GamePage />} />
          <Route path="/result"   element={<ResultPage />} />
          <Route path="/profile"  element={<ProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/online" element={<OnlinePage />} />
          <Route path="/tutorial" element={<TutorialPage />} />
          <Route path="/auth"     element={<AuthPage />} />
          <Route path="/impressum" element={<LegalPage />} />
          <Route path="/datenschutz" element={<LegalPage privacy />} />
      </Routes>
      </Suspense>
      {pathname !== '/play' && <LegalFooter />}
    </div>
  );
}
