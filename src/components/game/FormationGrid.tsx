import type { PlayerCard as PlayerCardType, GuessState, Position } from '../../types';
import { PlayerCard } from './PlayerCard';
import { getPositionGroup, type PositionGroup } from '../../utils/footballDisplay';

interface Props {
  players: PlayerCardType[];
  guesses: Record<string, GuessState>;
  onTipClick: (playerId: string) => void;
  activeTipId: string | null;
  hintMode?: 'nationality' | 'club';
}

export function FormationGrid({ players, guesses, onTipClick, activeTipId, hintMode = 'nationality' }: Props) {
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
                hintMode={hintMode}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const POSITION_ANCHORS: Record<Position, { x: number; y: number; order: number }> = {
  GK: { x: 50, y: 88, order: 100 },
  LB: { x: 18, y: 66, order: 70 },
  CB: { x: 50, y: 66, order: 72 },
  RB: { x: 82, y: 66, order: 74 },
  CDM: { x: 36, y: 48, order: 45 },
  CM: { x: 50, y: 42, order: 46 },
  CAM: { x: 64, y: 36, order: 47 },
  LW: { x: 24, y: 18, order: 10 },
  CF: { x: 50, y: 18, order: 12 },
  ST: { x: 50, y: 12, order: 11 },
  RW: { x: 76, y: 18, order: 13 },
};

const ROW_Y: Record<PositionGroup, number> = {
  attacker: 18,
  midfielder: 42,
  defender: 66,
  goalkeeper: 88,
};

function getRoleLayout(players: PlayerCardType[]) {
  const countsByPosition = players.reduce<Record<string, number>>((counts, player) => {
    counts[player.position] = (counts[player.position] ?? 0) + 1;
    return counts;
  }, {});

  const seenByPosition: Record<string, number> = {};

  return [...players]
    .sort((a, b) => {
      const anchorA = POSITION_ANCHORS[a.position];
      const anchorB = POSITION_ANCHORS[b.position];
      return anchorA.order - anchorB.order || a.formationSlot - b.formationSlot;
    })
    .map((player) => {
      const role = getPositionGroup(player.position);
      const anchor = POSITION_ANCHORS[player.position] ?? {
        x: 50,
        y: ROW_Y[role],
        order: 50,
      };
      const positionIndex = seenByPosition[player.position] ?? 0;
      const positionCount = countsByPosition[player.position] ?? 1;
      seenByPosition[player.position] = positionIndex + 1;
      const offset = getDuplicateOffset(positionIndex, positionCount, player.position);

      return {
        player,
        x: clamp(anchor.x + offset.x, 10, 90),
        y: clamp(anchor.y + offset.y, 10, 90),
      };
    });
}

function getDuplicateOffset(index: number, count: number, position: Position) {
  if (count <= 1) return { x: 0, y: 0 };

  const spread = position === 'CB' ? 16 : position === 'CM' ? 14 : 10;
  const centered = index - (count - 1) / 2;
  return {
    x: centered * spread,
    y: Math.abs(centered) > 0.5 ? 3 : 0,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
