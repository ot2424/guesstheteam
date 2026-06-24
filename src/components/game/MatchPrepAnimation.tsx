import type { CSSProperties } from 'react';
import type { Difficulty, MatchType, PlayMode, Rank } from '../../types';

interface Props {
  playMode: PlayMode;
  matchType: MatchType;
  difficulty: Difficulty;
  rank: Rank;
}

const prepSteps = [
  'Teamdaten werden geladen',
  'Startelf wird geprüft',
  'Karriere-Tipps werden vorbereitet',
];

export function MatchPrepAnimation({ playMode, matchType, difficulty, rank }: Props) {
  const modeLabel = playMode === 'ranked' ? 'Ranked' : playMode === 'worldcup' ? 'WM-Modus' : 'Freizeit';
  const matchLabel = matchType === 'series' ? '3er-Serie' : 'Einzel-Match';
  const difficultyLabel = playMode === 'ranked' ? rank : difficulty;

  return (
    <div className="gtt-prep-screen">
      <div className="gtt-prep-orbit" aria-hidden="true" />
      <section className="gtt-prep-card" aria-live="polite" aria-busy="true">
        <div className="gtt-prep-meta">
          <span>{modeLabel}</span>
          <span>{matchLabel}</span>
          <span>{difficultyLabel}</span>
        </div>

        <div className="gtt-prep-pitch" aria-hidden="true">
          <div className="gtt-prep-pitch-lines" />
          <div className="gtt-prep-scan" />
          <div className="gtt-prep-loader-ball">●</div>
          {Array.from({ length: 11 }, (_, index) => (
            <span
              key={index}
              className="gtt-prep-player"
              style={{ '--delay': `${index * 0.08}s` } as CSSProperties}
            />
          ))}
        </div>

        <div className="gtt-prep-copy">
          <p className="gtt-prep-kicker">Scouting laeuft</p>
          <h1>Match wird vorbereitet</h1>
          <p>Wir suchen ein passendes Team, sortieren die Positionen und bauen deine Hinweise auf.</p>
        </div>

        <div className="gtt-prep-steps">
          {prepSteps.map((step, index) => (
            <div key={step} className="gtt-prep-step" style={{ '--delay': `${index * 0.22}s` } as CSSProperties}>
              <span />
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
