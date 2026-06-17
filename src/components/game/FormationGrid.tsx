import type { PlayerCard as PlayerCardType, GuessState } from '../../types';
import { PlayerCard } from './PlayerCard';
import { getPositionGroup, type PositionGroup } from '../../utils/footballDisplay';

interface Props {
  players: PlayerCardType[];
  guesses: Record<string, GuessState>;
  onTipClick: (playerId: string) => void;
  activeTipId: string | null;
}

export function FormationGrid({ players, guesses, onTipClick, activeTipId }: Props) {
  const cards = getRoleLayout(players);

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{
        background: 'linear-gradient(180deg, #0e3c28 0%, #1aa257 50%, #0f4329 100%)',
        minHeight: '520px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
      }}
    >
      {/* Mow stripes */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0 46px, rgba(0,0,0,0.05) 46px 92px)' }} />
      {/* Center spotlight */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(120% 80% at 50% 42%, rgba(255,255,255,0.12), transparent 60%)' }} />

      {/* Pitch markings */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.28] pointer-events-none"
        viewBox="0 0 400 400"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line x1="0"   y1="200" x2="400" y2="200" stroke="rgba(220,255,235,0.9)" strokeWidth="1.5"/>
        <ellipse cx="200" cy="200" rx="50" ry="42" fill="none" stroke="rgba(220,255,235,0.9)" strokeWidth="1.5"/>
        <circle  cx="200" cy="200" r="3" fill="rgba(220,255,235,0.9)"/>
        <rect x="90"  y="0"   width="220" height="72"  fill="none" stroke="rgba(220,255,235,0.9)" strokeWidth="1.5"/>
        <rect x="140" y="0"   width="120" height="33"  fill="none" stroke="rgba(220,255,235,0.9)" strokeWidth="1.5"/>
        <rect x="90"  y="328" width="220" height="72"  fill="none" stroke="rgba(220,255,235,0.9)" strokeWidth="1.5"/>
        <rect x="140" y="367" width="120" height="33"  fill="none" stroke="rgba(220,255,235,0.9)" strokeWidth="1.5"/>
        <rect x="5"   y="5"   width="390" height="390" fill="none" stroke="rgba(220,255,235,0.9)" strokeWidth="1.5"/>
      </svg>

      {/* Cards */}
      <div className="relative w-full" style={{ minHeight: '520px' }}>
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
    </div>
  );
}

const ROW_Y: Record<PositionGroup, number> = {
  attacker: 16,
  midfielder: 40,
  defender: 64,
  goalkeeper: 88,
};

const ROLE_ORDER: PositionGroup[] = ['attacker', 'midfielder', 'defender', 'goalkeeper'];

function getRoleLayout(players: PlayerCardType[]) {
  return ROLE_ORDER.flatMap((role) => {
    const rowPlayers = players.filter((player) => getPositionGroup(player.position) === role);
    const spacing = 78 / Math.max(rowPlayers.length, 1);

    return rowPlayers.map((player, index) => ({
      player,
      x: 11 + spacing / 2 + spacing * index,
      y: ROW_Y[role],
    }));
  });
}
