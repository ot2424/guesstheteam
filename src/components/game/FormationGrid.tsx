import type { PlayerCard as PlayerCardType, GuessState } from '../../types';
import { PlayerCard } from './PlayerCard';
import { getPositionGroup, type PositionGroup } from '../../utils/footballDisplay';

interface Props {
  players: PlayerCardType[];
  guesses: Record<string, GuessState>;
  formation: string;
  onTipClick: (playerId: string) => void;
  activeTipId: string | null;
}

export function FormationGrid({ players, guesses, formation, onTipClick, activeTipId }: Props) {
  const cards = getRoleLayout(players);

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden select-none"
      style={{
        background: 'linear-gradient(180deg, #064e3b 0%, #065f46 30%, #047857 60%, #065f46 80%, #064e3b 100%)',
        minHeight: '400px',
        border: '2px solid #047857',
      }}
    >
      {/* Pitch markings */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none"
        viewBox="0 0 400 400"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line x1="0"   y1="200" x2="400" y2="200" stroke="white" strokeWidth="1.5"/>
        <ellipse cx="200" cy="200" rx="50" ry="42" fill="none" stroke="white" strokeWidth="1.5"/>
        <circle  cx="200" cy="200" r="3" fill="white"/>
        <rect x="90"  y="0"   width="220" height="72"  fill="none" stroke="white" strokeWidth="1.5"/>
        <rect x="140" y="0"   width="120" height="33"  fill="none" stroke="white" strokeWidth="1.5"/>
        <rect x="90"  y="328" width="220" height="72"  fill="none" stroke="white" strokeWidth="1.5"/>
        <rect x="140" y="367" width="120" height="33"  fill="none" stroke="white" strokeWidth="1.5"/>
        <rect x="5"   y="5"   width="390" height="390" fill="none" stroke="white" strokeWidth="1.5"/>
      </svg>

      {/* Cards */}
      <div className="relative w-full" style={{ minHeight: '400px' }}>
        {cards.map(({ player, x, y }, index) => {
          const guess = guesses[player.id] ?? { playerId: player.id, solved: false, attempts: 0, revealed: false };

          return (
            <div
              key={player.id}
              className="absolute"
              style={{ left: `calc(${x}% - 36px)`, top: `calc(${y}% - 48px)` }}
            >
              <PlayerCard
                player={player}
                guess={guess}
                onTipClick={onTipClick}
                index={index}
                isActiveTip={activeTipId === player.id}
              />
            </div>
          );
        })}
      </div>

      {/* Formation label */}
      <div className="absolute bottom-2 right-3 text-white/30 text-xs bebas tracking-wider">
        {formation}
      </div>
    </div>
  );
}

const ROW_Y: Record<PositionGroup, number> = {
  goalkeeper: 88,
  defender: 70,
  midfielder: 48,
  attacker: 24,
};

const ROLE_ORDER: PositionGroup[] = ['goalkeeper', 'defender', 'midfielder', 'attacker'];

function getRoleLayout(players: PlayerCardType[]) {
  return ROLE_ORDER.flatMap((role) => {
    const rowPlayers = players.filter((player) => getPositionGroup(player.position) === role);
    const spacing = 70 / Math.max(rowPlayers.length, 1);

    return rowPlayers.map((player, index) => ({
      player,
      x: 15 + spacing / 2 + spacing * index,
      y: ROW_Y[role],
    }));
  });
}
