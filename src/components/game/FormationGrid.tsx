import type { PlayerCard as PlayerCardType, GuessState, Position } from '../../types';
import { PlayerCard } from './PlayerCard';
import { getPositionGroup, type PositionGroup } from '../../utils/footballDisplay';

interface Props {
  players: PlayerCardType[];
  formation?: string;
  guesses: Record<string, GuessState>;
  onTipClick: (playerId: string) => void;
  activeTipId: string | null;
  hintMode?: 'nationality' | 'club';
}

export function FormationGrid({ players, formation = '4-3-3', guesses, onTipClick, activeTipId, hintMode = 'nationality' }: Props) {
  const cards = getRoleLayout(players, formation);

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
        {cards.map(({ player, x, y, displayPosition }, index) => {
          const guess = guesses[player.id] ?? { playerId: player.id, solved: false, attempts: 0, revealed: false };

          return (
            <div
              key={player.id}
              className="absolute"
              style={{ left: `calc(${x}% - 36px)`, top: `calc(${y}% - 48px)` }}
            >
              <PlayerCard
                player={player}
                displayPosition={displayPosition}
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
  LM: { x: 22, y: 42, order: 44 },
  RM: { x: 78, y: 42, order: 48 },
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

function getRoleLayout(players: PlayerCardType[], formation: string) {
  const rows = getFormationRows(formation);
  const available = [...players].sort(comparePlayersByPosition);
  const assigned = new Set<string>();
  const cards: Array<{ player: PlayerCardType; x: number; y: number; displayPosition?: Position }> = [];

  const goalkeeper = takeBest(available, assigned, (player) => player.position === 'GK');
  if (goalkeeper) cards.push({ player: goalkeeper, x: 50, y: 88 });

  for (const row of rows) {
    const rowPlayers = takeRowPlayers(available, assigned, row);
    const slots = getRowSlots(row.count, row.y);
    rowPlayers.forEach((player, index) => {
      const slot = slots[index] ?? slots[slots.length - 1];
      cards.push({ player, x: slot.x, y: slot.y, displayPosition: getSlotDisplayPosition(row, index) });
    });
  }

  const leftovers = available.filter((player) => !assigned.has(player.id));
  const fallbackSlots = getRowSlots(leftovers.length, ROW_Y.midfielder);
  leftovers.forEach((player, index) => {
    const slot = fallbackSlots[index];
    cards.push({ player, x: slot.x, y: slot.y });
  });

  return cards;
}

type FormationRow = {
  role: PositionGroup;
  count: number;
  y: number;
  preferred: Position[];
  slotPositions: Position[];
};

function getFormationRows(formation: string): FormationRow[] {
  const parts = formation
    .split('-')
    .map((part) => Number(part))
    .filter((part) => Number.isInteger(part) && part > 0);

  const numbers = parts.length >= 2 ? parts : [4, 3, 3];
  const defenderCount = numbers[0] ?? 4;
  const attackingCount = numbers.at(-1) ?? 1;
  const midfieldCounts = numbers.slice(1, -1);
  const midfieldYs = getMidfieldYs(midfieldCounts.length);

  return [
    {
      role: 'attacker',
      count: attackingCount,
      y: 14,
      preferred: getAttackerPreferences(attackingCount),
      slotPositions: getAttackerSlotPositions(attackingCount),
    },
    ...midfieldCounts.map((count, index) => ({
      role: 'midfielder' as PositionGroup,
      count,
      y: midfieldYs[index],
      preferred: getMidfieldPreferences(count, index, midfieldCounts.length),
      slotPositions: getMidfieldSlotPositions(count, index, midfieldCounts.length),
    })),
    {
      role: 'defender',
      count: defenderCount,
      y: 68,
      preferred: getDefenderPreferences(defenderCount),
      slotPositions: getDefenderSlotPositions(defenderCount),
    },
  ];
}

function getMidfieldYs(rowCount: number) {
  if (rowCount <= 1) return [43];
  if (rowCount === 2) return [35, 53];
  return [31, 45, 58].slice(0, rowCount);
}

function getAttackerPreferences(count: number): Position[] {
  if (count <= 1) return ['ST', 'CF', 'LW', 'RW', 'CAM'];
  if (count === 2) return ['CF', 'ST', 'LW', 'RW', 'CAM'];
  return ['LW', 'ST', 'RW', 'CF', 'CAM'];
}

function getAttackerSlotPositions(count: number): Position[] {
  if (count <= 1) return ['ST'];
  if (count === 2) return ['CF', 'ST'];
  return ['LW', 'ST', 'RW'];
}

function getMidfieldPreferences(count: number, rowIndex: number, rowCount: number): Position[] {
  const isTopMidfield = rowIndex === 0 && rowCount > 1;
  const isBottomMidfield = rowIndex === rowCount - 1 && rowCount > 1;
  if (isTopMidfield) return ['LM', 'CAM', 'RM', 'LW', 'RW', 'CM', 'ST', 'CF'];
  if (isBottomMidfield) return ['CDM', 'CM', 'LM', 'RM', 'CAM'];
  if (count >= 4) return ['LM', 'CM', 'CDM', 'CM', 'RM', 'LW', 'RW', 'CAM'];
  return ['CDM', 'CM', 'CAM', 'LM', 'RM'];
}

function getMidfieldSlotPositions(count: number, rowIndex: number, rowCount: number): Position[] {
  const isTopMidfield = rowIndex === 0 && rowCount > 1;
  const isBottomMidfield = rowIndex === rowCount - 1 && rowCount > 1;
  if (isTopMidfield && count === 3) return ['LM', 'CAM', 'RM'];
  if (isBottomMidfield && count === 2) return ['CDM', 'CDM'];
  if (count === 5) return ['LM', 'CM', 'CDM', 'CM', 'RM'];
  if (count === 4) return ['LM', 'CM', 'CM', 'RM'];
  if (count === 3) return ['CM', 'CDM', 'CM'];
  if (count === 2) return ['CM', 'CM'];
  return ['CM'];
}

function getDefenderPreferences(count: number): Position[] {
  if (count <= 3) return ['CB', 'CB', 'CB', 'LB', 'RB', 'CDM'];
  return ['LB', 'CB', 'CB', 'RB', 'CDM'];
}

function getDefenderSlotPositions(count: number): Position[] {
  if (count <= 3) return ['CB', 'CB', 'CB'];
  if (count === 5) return ['LB', 'CB', 'CB', 'CB', 'RB'];
  return ['LB', 'CB', 'CB', 'RB'];
}

function getSlotDisplayPosition(row: FormationRow, index: number) {
  return row.slotPositions[index] ?? row.slotPositions[row.slotPositions.length - 1];
}

function takeRowPlayers(
  players: PlayerCardType[],
  assigned: Set<string>,
  row: FormationRow,
) {
  const selected: PlayerCardType[] = [];

  for (const preferredPosition of row.preferred) {
    if (selected.length >= row.count) break;
    const player = takeBest(players, assigned, (candidate) => candidate.position === preferredPosition);
    if (player) selected.push(player);
  }

  while (selected.length < row.count) {
    const player = takeBest(players, assigned, (candidate) => getPositionGroup(candidate.position) === row.role);
    if (!player) break;
    selected.push(player);
  }

  while (selected.length < row.count) {
    const player = takeBest(players, assigned, () => true);
    if (!player) break;
    selected.push(player);
  }

  return selected;
}

function takeBest(
  players: PlayerCardType[],
  assigned: Set<string>,
  predicate: (player: PlayerCardType) => boolean,
) {
  const player = players.find((candidate) => !assigned.has(candidate.id) && predicate(candidate));
  if (!player) return null;
  assigned.add(player.id);
  return player;
}

function getRowSlots(count: number, y: number) {
  if (count <= 1) return [{ x: 50, y }];
  const start = count >= 5 ? 12 : count === 4 ? 18 : count === 3 ? 28 : 38;
  const end = 100 - start;
  const gap = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, index) => ({
    x: clamp(start + gap * index, 10, 90),
    y,
  }));
}

function comparePlayersByPosition(a: PlayerCardType, b: PlayerCardType) {
  const anchorA = POSITION_ANCHORS[a.position];
  const anchorB = POSITION_ANCHORS[b.position];
  return anchorA.order - anchorB.order || a.formationSlot - b.formationSlot;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
