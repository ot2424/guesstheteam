import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerCard as PlayerCardType, GuessState } from '../../types';
import { FlagIcon } from '../ui/FlagIcon';
import { getPositionGroup, getPositionLabel } from '../../utils/footballDisplay';
import { getClubInitials, getCurrentClub } from '../../utils/playerHints';

interface Props {
  player: PlayerCardType;
  guess: GuessState;
  onTipClick: (playerId: string) => void;
  index: number;
  isActiveTip: boolean;
  hintMode?: 'nationality' | 'club';
}

const POS_COLORS: Record<string, string> = {
  goalkeeper: '#F59E0B',
  defender: '#3B82F6',
  midfielder: '#8B5CF6',
  attacker: '#EF4444',
};

export function PlayerCard({ player, guess, onTipClick, index, isActiveTip, hintMode = 'nationality' }: Props) {
  const positionGroup = getPositionGroup(player.position);
  const posColor = POS_COLORS[positionGroup] ?? '#9CA3AF';
  const isSolved  = guess.solved;
  const displayName = guess.guessedName ?? player.name;
  const currentClub = getCurrentClub(player);
  const showClubHint = hintMode === 'club' && currentClub;

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
          className="relative rounded-2xl border-2 transition-all duration-300"
          style={{
            width: '72px', height: '96px',
            background: isSolved
              ? 'linear-gradient(180deg, rgba(34,197,94,0.32), rgba(8,30,18,0.6))'
              : isActiveTip
              ? 'linear-gradient(180deg, rgba(90,140,255,0.32), rgba(10,18,40,0.62))'
              : 'linear-gradient(180deg, rgba(20,27,38,0.92), rgba(7,10,16,0.94))',
            borderColor: isSolved ? '#22C55E' : isActiveTip ? '#5a8cff' : 'rgba(255,255,255,0.08)',
            boxShadow: isSolved
              ? '0 0 22px rgba(34,197,94,0.4), inset 0 1px 0 rgba(255,255,255,0.08)'
              : isActiveTip
              ? '0 0 20px rgba(90,140,255,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
              : '0 6px 16px rgba(0,0,0,0.4)',
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
            style={{ background: posColor + '25', color: posColor, border: `1px solid ${posColor}55`, textShadow: `0 0 9px ${posColor}66` }}
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
                {showClubHint ? (
                  <ClubHintLogo name={currentClub.clubName} logoUrl={currentClub.logoUrl} size={24} />
                ) : (
                  <FlagIcon nationality={player.nationality} nationality2={player.nationality2} size={22} />
                )}
                <span className="text-[9px] font-semibold text-center leading-tight px-0.5" style={{ color: '#eafff1' }}>
                  {displayName}
                </span>
                <span className="text-base leading-none" style={{ color: '#2bd46a', textShadow: '0 0 8px rgba(34,197,94,0.8)' }}>✓</span>
              </motion.div>
            ) : (
              <motion.div
                key="unsolved"
                className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pt-4"
              >
                {showClubHint ? (
                  <>
                    <ClubHintLogo name={currentClub.clubName} logoUrl={currentClub.logoUrl} size={30} />
                    <span className="max-w-[62px] truncate text-center text-[9px] font-semibold text-gray-300">
                      {currentClub.clubName}
                    </span>
                  </>
                ) : (
                  <FlagIcon nationality={player.nationality} nationality2={player.nationality2} size={28} />
                )}
                {!isSolved && (
                  <span className="text-gray-500 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
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

function ClubHintLogo({ name, logoUrl, size }: { name: string; logoUrl: string; size: number }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className="object-contain"
        style={{ width: size, height: size }}
        onError={(event) => {
          (event.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  return (
    <span
      className="flex items-center justify-center rounded-lg text-[10px] font-black text-gray-300"
      style={{ width: size, height: size, background: '#1f2937', border: '1px solid rgba(255,255,255,0.12)' }}
    >
      {getClubInitials(name)}
    </span>
  );
}
