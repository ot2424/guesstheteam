import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';
import { ResultPage } from './pages/ResultPage';
import { ProfilePage } from './pages/ProfilePage';
import { TutorialPage } from './pages/TutorialPage';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"         element={<HomePage />} />
        <Route path="/play"     element={<GamePage />} />
        <Route path="/result"   element={<ResultPage />} />
        <Route path="/profile"  element={<ProfilePage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
      </Routes>
    </BrowserRouter>
  );
}
