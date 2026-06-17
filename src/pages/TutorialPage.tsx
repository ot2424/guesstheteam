import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FormationGrid } from '../components/game/FormationGrid';
import { MobilePlayerList } from '../components/game/MobilePlayerList';
import { CareerTipDrawer } from '../components/game/CareerTipDrawer';
import { CentralSearchField } from '../components/game/CentralSearchField';
import { REAL_MADRID_2223 } from '../data/mockTeams';
import { matchesPlayer } from '../utils/playerMatching';
import type { GuessState, PlayerCard } from '../types';

const TIPS = [
  { id: 'welcome', icon: '👋', title: 'Willkommen!',       body: 'Du siehst die Aufstellung von Real Madrid 2022/23. Alle Karten sind verdeckt – sichtbar sind nur Position und Nationalität.' },
  { id: 'search',  icon: '⌨️', title: 'Zentrales Suchfeld', body: 'Tippe einen Spielernamen ein. Nachname reicht! Wenn er stimmt, dreht sich die Karte und wird grün.' },
  { id: 'tip',     icon: '💡', title: 'Karriere-Tipps',     body: 'Klicke auf eine ungelöste Karte, um den Karriereweg als Hilfestellung zu sehen – ohne den Namen zu verraten.' },
  { id: 'fuzzy',   icon: '✏️', title: 'Tippfehler erlaubt', body: 'Das Spiel erkennt Schreibfehler und ignoriert Umlaute. "Gundogan" zählt für "Gündogan".' },
  { id: 'go',      icon: '🚀', title: 'Los geht\'s!',       body: 'Versuche alle 11 Spieler zu erraten. Im Tutorial siehst du die Namen nach dem Lösen. Viel Erfolg!' },
];

export function TutorialPage() {
  const navigate = useNavigate();
  const team = REAL_MADRID_2223;
  const [tipIndex, setTipIndex] = useState(0);
  const [showTips, setShowTips] = useState(true);
  const [activeTipId, setActiveTipId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);
  const [guesses, setGuesses] = useState<Record<string, GuessState>>(() =>
    Object.fromEntries(
      team.players.map(p => [p.id, { playerId: p.id, solved: false, attempts: 0, revealed: false }])
    )
  );

  const solved = Object.values(guesses).filter((g: GuessState) => g.solved).length;

  const handleGuess = useCallback((name: string) => {
    const matched = team.players.find(p => {
      const g = guesses[p.id] as GuessState;
      return !g.solved && p.name && matchesPlayer(name, p.name);
    });

    if (matched) {
      setLastResult('correct');
      setActiveTipId(null);
      setGuesses(prev => ({
        ...prev,
        [matched.id]: { ...(prev[matched.id] as GuessState), solved: true, guessedName: name },
      }));
      if (tipIndex === 1 && showTips) setTipIndex(2); // advance tip after first correct
    } else {
      setLastResult('wrong');
    }
    setTimeout(() => setLastResult(null), 700);
  }, [team.players, guesses, tipIndex, showTips]);

  const nextTip = () => {
    if (tipIndex < TIPS.length - 1) setTipIndex(t => t + 1);
    else setShowTips(false);
  };

  const activeTipPlayer: PlayerCard | null = activeTipId
    ? (team.players.find(p => p.id === activeTipId) ?? null)
    : null;

  const tip = TIPS[tipIndex];

  return (
    <div className="min-h-screen" style={{ background: '#06090f' }}>
      <div className="max-w-3xl mx-auto px-4 py-5 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="bebas text-2xl tracking-wider text-green-400">TUTORIAL</span>
            <span className="text-gray-600 text-sm">Real Madrid 2022/23</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 tabular-nums">{solved}/11</span>
            <button onClick={() => navigate('/')} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">← Zurück</button>
          </div>
        </div>

        {/* Tip card */}
        <AnimatePresence mode="wait">
          {showTips && (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-2xl border p-4 flex items-start gap-3"
              style={{ background: 'rgba(34,197,94,0.07)', borderColor: 'rgba(34,197,94,0.4)' }}
            >
              <span className="text-2xl flex-shrink-0">{tip.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-green-400 font-semibold text-sm">{tip.title}</div>
                <div className="text-gray-400 text-sm mt-0.5">{tip.body}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-600 tabular-nums">{tipIndex + 1}/{TIPS.length}</span>
                <button
                  onClick={nextTip}
                  className="text-xs px-4 py-1.5 rounded-lg font-bold active:scale-95 transition-all"
                  style={{ background: '#22C55E', color: '#0A0E1A' }}
                >
                  {tipIndex < TIPS.length - 1 ? 'Weiter →' : 'Los!'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search field */}
        <div className="sticky top-14 z-30 py-2 -mx-4 px-4 sm:static sm:p-0 sm:mx-0"
             style={{ background: 'rgba(6,9,15,0.95)', backdropFilter: 'blur(8px)' }}>
          <CentralSearchField
            onGuess={handleGuess}
            solvedCount={solved}
            totalCount={11}
            lastResult={lastResult}
          />
        </div>

        {/* Formation / List */}
        <div className="hidden sm:block">
          <FormationGrid
            players={team.players}
            guesses={guesses}
            onTipClick={(id) => {
              setActiveTipId(prev => prev === id ? null : id);
              if (showTips && tipIndex === 1) setTipIndex(2);
            }}
            activeTipId={activeTipId}
          />
        </div>
        <div className="sm:hidden">
          <MobilePlayerList
            players={team.players}
            guesses={guesses}
            onTipClick={(id) => setActiveTipId(prev => prev === id ? null : id)}
            activeTipId={activeTipId}
          />
        </div>

        {/* Inline tip drawer (desktop) */}
        <div className="hidden sm:block">
          <CareerTipDrawer player={activeTipPlayer} onClose={() => setActiveTipId(null)} />
        </div>

        {/* Win banner */}
        <AnimatePresence>
          {solved === 11 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl p-6 text-center border relative overflow-hidden"
              style={{ background: 'linear-gradient(180deg, rgba(34,197,94,0.14), rgba(34,197,94,0.02))', borderColor: '#22C55E', boxShadow: '0 0 50px rgba(34,197,94,0.25)' }}
            >
              <div className="text-4xl mb-2" style={{ filter: 'drop-shadow(0 0 16px rgba(34,197,94,0.7))' }}>🏆</div>
              <div className="bebas text-4xl text-green-400 tracking-wider" style={{ textShadow: '0 0 30px rgba(34,197,94,0.4)' }}>TUTORIAL ABGESCHLOSSEN!</div>
              <p className="text-gray-400 text-sm mt-1 mb-4">Jetzt bist du bereit für echte Matches.</p>
              <button
                onClick={() => navigate('/')}
                className="px-7 py-3 rounded-xl font-extrabold text-sm active:scale-95 transition-all"
                style={{ background: '#22C55E', color: '#0A0E1A', boxShadow: '0 12px 28px rgba(34,197,94,0.3)' }}
              >
                Jetzt spielen
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile bottom sheet */}
      <div className="sm:hidden">
        <CareerTipDrawer player={activeTipPlayer} onClose={() => setActiveTipId(null)} />
      </div>
    </div>
  );
}
