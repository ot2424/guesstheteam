import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerCard } from '../../types';
import { FlagIcon } from '../ui/FlagIcon';
import { getPositionLabel } from '../../utils/footballDisplay';
import { getClubInitials, getCurrentClub } from '../../utils/playerHints';

interface Props {
  player: PlayerCard | null;
  onClose: () => void;
  hintMode?: 'nationality' | 'club';
}

export function CareerTipDrawer({ player, onClose, hintMode = 'nationality' }: Props) {
  const currentClub = player ? getCurrentClub(player) : null;

  return (
    <AnimatePresence>
      {player && (
        <>
          {/* Backdrop (only on mobile) */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 sm:hidden"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="
              fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t
              sm:static sm:rounded-2xl sm:border sm:mt-3
            "
            style={{
              background: 'linear-gradient(180deg,#0e141d,#0a0e16)',
              borderColor: 'rgba(255,255,255,0.13)',
              maxHeight: '60vh',
              overflowY: 'auto',
              boxShadow: '0 28px 70px rgba(0,0,0,0.55)',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-gray-700" />
            </div>

            <div className="px-4 pb-4 pt-2">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  {hintMode === 'club' && currentClub ? (
                    currentClub.logoUrl ? (
                      <img src={currentClub.logoUrl} alt={currentClub.clubName} className="h-7 w-7 object-contain" />
                    ) : (
                      <div className="h-7 w-7 rounded flex items-center justify-center text-[10px] font-bold"
                           style={{ background: '#161d29', border: '1px solid rgba(255,255,255,0.1)', color: '#d4dae3' }}>
                        {getClubInitials(currentClub.clubName)}
                      </div>
                    )
                  ) : (
                    <FlagIcon nationality={player.nationality} nationality2={player.nationality2} size={26} />
                  )}
                  <div>
                    <div className="text-sm font-bold" style={{ color: '#5a8cff' }}>💡 Karriere-Tipp</div>
                    <div className="text-xs text-gray-500">
                      {hintMode === 'club' && currentClub
                        ? `Aktueller Verein: ${currentClub.clubName} · ${getPositionLabel(player.position)}`
                        : `${player.nationality}${player.nationality2 ? ` / ${player.nationality2}` : ''} · ${getPositionLabel(player.position)}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-300 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-base"
                >
                  ✕
                </button>
              </div>

              {/* Timeline */}
              <div className="space-y-0">
                {player.career.map((club, i) => {
                  const isCurrent = i === player.career.length - 1;
                  return (
                    <motion.div
                      key={club.clubId + i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-3 py-2"
                    >
                      {/* Timeline line + dot */}
                      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 14 }}>
                        <div
                          className="w-2.5 h-2.5 rounded-full border-2 flex-shrink-0"
                          style={{
                            borderColor: isCurrent ? '#22C55E' : '#4B5563',
                            background:  isCurrent ? '#22C55E' : 'transparent',
                            boxShadow: isCurrent ? '0 0 10px rgba(34,197,94,0.8)' : 'none',
                          }}
                        />
                        {i < player.career.length - 1 && (
                          <div className="w-px mt-1" style={{ background: 'rgba(255,255,255,0.12)', minHeight: 18 }} />
                        )}
                      </div>

                      {/* Club logo */}
                      {club.logoUrl ? (
                        <img
                          src={club.logoUrl}
                          alt={club.clubName}
                          className="w-7 h-7 object-contain flex-shrink-0 rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%234B5563'/%3E%3C/svg%3E";
                          }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                             style={{ background: '#161d29', border: '1px solid rgba(255,255,255,0.1)', color: '#d4dae3' }}>
                          {getClubInitials(club.clubName)}
                        </div>
                      )}

                      {/* Name + years */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: isCurrent ? '#fff' : '#e5e9f0' }}>{club.clubName}</div>
                        <div className="text-xs" style={{ color: isCurrent ? '#2bd46a' : '#6b7280', fontFamily: "'JetBrains Mono', monospace" }}>
                          {club.fromYear} – {club.toYear ?? 'heute'}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <p className="text-xs text-gray-600 text-center mt-3">
                Tippe den Namen oben im Suchfeld ein ↑
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
