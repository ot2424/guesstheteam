import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerCard as PlayerCardType, GuessState } from '../../types';
import { FlagIcon } from '../ui/FlagIcon';
import { getPositionGroup, getPositionLabel } from '../../utils/footballDisplay';

interface Props {
  player: PlayerCardType;
  guess: GuessState;
  onTipClick: (playerId: string) => void;
  index: number;
  isActiveTip: boolean;
}

const POS_COLORS: Record<string, string> = {
  goalkeeper: '#F59E0B',
  defender: '#3B82F6',
  midfielder: '#8B5CF6',
  attacker: '#EF4444',
};

export function PlayerCard({ player, guess, onTipClick, index, isActiveTip }: Props) {
  const positionGroup = getPositionGroup(player.position);
  const posColor = POS_COLORS[positionGroup] ?? '#9CA3AF';
  const isSolved  = guess.solved;
  const displayName = guess.guessedName ?? player.name;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.055, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      style={{ width: '72px' }}
    >
      <button
        onClick={() => !isSolved && onTipClick(player.id)}
        disabled={isSolved}
        className="w-full focus:outline-none group"
        title={isSolved ? displayName : 'Klicken für Karriere-Tipp'}
      >
        <div
          className="relative rounded-xl border-2 transition-all duration-300"
          style={{
            width: '72px', height: '96px',
            background: isSolved
              ? 'linear-gradient(160deg, #14532d, #166534)'
              : isActiveTip
              ? 'linear-gradient(160deg, #1e3a5f, #1e40af)'
              : 'linear-gradient(160deg, #1F2937, #111827)',
            borderColor: isSolved ? '#22C55E' : isActiveTip ? '#3B82F6' : '#374151',
            boxShadow: isSolved
              ? '0 0 18px rgba(34,197,94,0.25)'
              : isActiveTip
              ? '0 0 14px rgba(59,130,246,0.3)'
              : 'none',
            cursor: isSolved ? 'default' : 'pointer',
            transform: isActiveTip && !isSolved ? 'scale(1.08)' : undefined,
          }}
        >
          {/* Jersey silhouette bg */}
          <svg viewBox="0 0 72 96" className="absolute inset-0 w-full h-full opacity-[0.07]" aria-hidden="true">
            <path d="M20 20 L8 32 L18 38 L16 80 L56 80 L54 38 L64 32 L52 20 C48 14 44 12 36 12 C28 12 24 14 20 20Z" fill="white"/>
          </svg>

          {/* Position badge */}
          <div
            className="absolute top-1.5 left-1/2 -translate-x-1/2 bebas text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: posColor + '25', color: posColor, border: `1px solid ${posColor}40` }}
          >
            {getPositionLabel(player.position)}
          </div>

          {/* Solved: show name */}
          <AnimatePresence>
            {isSolved ? (
              <motion.div
                key="solved"
                initial={{ opacity: 0, rotateY: 90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 pt-5"
              >
                <FlagIcon nationality={player.nationality} nationality2={player.nationality2} size={22} />
                <span className="text-green-300 text-[9px] font-semibold text-center leading-tight px-0.5">
                  {displayName}
                </span>
                <span className="text-green-500 text-base leading-none">✓</span>
              </motion.div>
            ) : (
              <motion.div
                key="unsolved"
                className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pt-4"
              >
                <FlagIcon nationality={player.nationality} nationality2={player.nationality2} size={28} />
                {!isSolved && (
                  <span className="text-gray-600 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
                    💡 Tipp
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </motion.div>
  );
}
