import { motion } from 'framer-motion';
import type { PlayerCard as PlayerCardType, GuessState } from '../../types';

interface Props {
  players: PlayerCardType[];
  guesses: Record<string, GuessState>;
  onTipClick: (playerId: string) => void;
  activeTipId: string | null;
}

const GROUPS = [
  { label: 'Tor',       positions: ['GK'] },
  { label: 'Abwehr',    positions: ['CB', 'LB', 'RB', 'LWB', 'RWB'] },
  { label: 'Mittelfeld', positions: ['CDM', 'CM', 'CAM', 'LM', 'RM'] },
  { label: 'Sturm',     positions: ['LW', 'RW', 'ST', 'CF'] },
];

export function MobilePlayerList({ players, guesses, onTipClick, activeTipId }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {GROUPS.map((group) => {
        const groupPlayers = players.filter(p => group.positions.includes(p.position));
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
                    <span className="text-xl flex-shrink-0">{player.nationalityFlag}</span>

                    {/* Position badge */}
                    <span
                      className="text-xs bebas px-2 py-0.5 rounded flex-shrink-0"
                      style={{ background: '#374151', color: '#9CA3AF' }}
                    >
                      {player.position}
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
