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

const POS_COLORS: Record<string, string> = {
  goalkeeper: '#F59E0B',
  defender: '#3B82F6',
  midfielder: '#8B5CF6',
  attacker: '#EF4444',
};

const GROUPS = [
  { label: 'Torwart', role: 'goalkeeper' },
  { label: 'Verteidiger', role: 'defender' },
  { label: 'Mittelfeld', role: 'midfielder' },
  { label: 'Angreifer', role: 'attacker' },
];

export function MobilePlayerList({ players, guesses, onTipClick, activeTipId }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {GROUPS.map((group) => {
        const groupPlayers = players.filter(p => getPositionGroup(p.position) === group.role as PositionGroup);
        if (groupPlayers.length === 0) return null;
        const posColor = POS_COLORS[group.role] ?? '#9CA3AF';

        return (
          <div key={group.label}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: posColor, boxShadow: `0 0 8px ${posColor}` }} />
              <span className="text-xs uppercase tracking-[0.2em]" style={{ color: '#8b95a5' }}>{group.label}</span>
            </div>
            <div className="flex flex-col gap-2">
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
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left"
                    style={{
                      background: isSolved
                        ? 'linear-gradient(180deg, rgba(34,197,94,0.16), rgba(8,30,18,0.4))'
                        : isActive
                        ? 'linear-gradient(180deg, rgba(90,140,255,0.16), rgba(10,18,40,0.4))'
                        : 'linear-gradient(180deg,#0e141d,#0a0e16)',
                      borderColor: isSolved
                        ? 'rgba(34,197,94,0.5)'
                        : isActive
                        ? 'rgba(90,140,255,0.5)'
                        : 'rgba(255,255,255,0.08)',
                      boxShadow: isSolved
                        ? '0 0 18px rgba(34,197,94,0.18)'
                        : isActive
                        ? '0 0 18px rgba(90,140,255,0.22)'
                        : 'none',
                    }}
                  >
                    {/* Flag */}
                    <FlagIcon
                      nationality={player.nationality}
                      nationality2={player.nationality2}
                      size={24}
                      className="flex-shrink-0"
                    />

                    {/* Position badge */}
                    <span
                      className="text-[10px] bebas tracking-wider px-2 py-0.5 rounded flex-shrink-0"
                      style={{ background: posColor + '22', color: posColor, border: `1px solid ${posColor}55` }}
                    >
                      {getPositionLabel(player.position)}
                    </span>

                    {/* Name or placeholder */}
                    {isSolved ? (
                      <span className="text-sm font-semibold flex-1 truncate" style={{ color: '#eafff1' }}>
                        {displayName}
                      </span>
                    ) : (
                      <span className="text-sm flex-1" style={{ color: isActive ? '#9fb3ff' : '#59626f' }}>
                        {isActive ? '💡 Tipp offen' : 'Tippen für Karriere-Tipp'}
                      </span>
                    )}

                    {/* Right indicator */}
                    {isSolved ? (
                      <span className="text-sm flex-shrink-0" style={{ color: '#2bd46a', textShadow: '0 0 8px rgba(34,197,94,0.8)' }}>✓</span>
                    ) : (
                      <span className="text-xs flex-shrink-0" style={{ color: isActive ? '#9fb3ff' : '#59626f' }}>
                        {isActive ? '▲' : '💡'}
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
