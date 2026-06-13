import { motion } from 'framer-motion';
import type { PlayerCard as PlayerCardType, GuessState } from '../../types';
import { FlagIcon } from '../ui/FlagIcon';
import { getPositionGroup, getPositionLabel, type PositionGroup } from '../../utils/footballDisplay';

interface Props {
  players: PlayerCardType[];
  guesses: Record<string, GuessState>;
  onTipClick: (playerId: string) => void;
  activeTipId: string | null;
}

const GROUPS = [
  { label: 'Torwart', role: 'goalkeeper' },
  { label: 'Verteidiger', role: 'defender' },
  { label: 'Mittelfeld', role: 'midfielder' },
  { label: 'Angreifer', role: 'attacker' },
];

export function MobilePlayerList({ players, guesses, onTipClick, activeTipId }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {GROUPS.map((group) => {
        const groupPlayers = players.filter(p => getPositionGroup(p.position) === group.role as PositionGroup);
        if (groupPlayers.length === 0) return null;

        return (
          <div key={group.label}>
            <div className="text-xs text-gray-600 uppercase tracking-widest mb-1.5 px-1">
              {group.label}
            </div>
            <div className="flex flex-col gap-1.5">
              {groupPlayers.map((player, i) => {
                const guess   = guesses[player.id];
                const isSolved = guess?.solved;
                const isActive = activeTipId === player.id;
                const displayName = guess?.guessedName ?? player.name;

                return (
                  <motion.button
                    key={player.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => !isSolved && onTipClick(player.id)}
                    disabled={isSolved}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left"
                    style={{
                      background: isSolved
                        ? 'rgba(34,197,94,0.08)'
                        : isActive
                        ? 'rgba(59,130,246,0.1)'
                        : '#1F2937',
                      borderColor: isSolved
                        ? 'rgba(34,197,94,0.3)'
                        : isActive
                        ? 'rgba(59,130,246,0.4)'
                        : '#374151',
                    }}
                  >
                    {/* Flag */}
                    <FlagIcon
                      nationality={player.nationality}
                      nationality2={player.nationality2}
                      size={22}
                      className="flex-shrink-0"
                    />

                    {/* Position badge */}
                    <span
                      className="text-xs bebas px-2 py-0.5 rounded flex-shrink-0"
                      style={{ background: '#374151', color: '#9CA3AF' }}
                    >
                      {getPositionLabel(player.position)}
                    </span>

                    {/* Name or placeholder */}
                    {isSolved ? (
                      <span className="text-sm font-semibold text-green-300 flex-1 truncate">
                        {displayName}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-600 flex-1">
                        {isActive ? '💡 Tipp offen' : '???'}
                      </span>
                    )}

                    {/* Right indicator */}
                    {isSolved ? (
                      <span className="text-green-400 text-sm flex-shrink-0">✓</span>
                    ) : (
                      <span className="text-gray-600 text-xs flex-shrink-0">
                        {isActive ? '▲' : 'Tipp →'}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
