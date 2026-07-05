import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/useAuth';
import { Navbar } from './components/layout/Navbar';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';
import { ResultPage } from './pages/ResultPage';
import { ProfilePage } from './pages/ProfilePage';
import { TutorialPage } from './pages/TutorialPage';
import { AuthPage } from './pages/AuthPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { OnlinePage } from './pages/OnlinePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/"         element={<HomePage />} />
          <Route path="/play"     element={<GamePage />} />
          <Route path="/result"   element={<ResultPage />} />
          <Route path="/profile"  element={<ProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/online" element={<OnlinePage />} />
          <Route path="/tutorial" element={<TutorialPage />} />
          <Route path="/auth"     element={<AuthPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
