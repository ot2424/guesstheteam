import { motion, AnimatePresence } from 'framer-motion';
import type { PlayerCard } from '../../types';
import { FlagIcon } from '../ui/FlagIcon';
import { getPositionLabel } from '../../utils/footballDisplay';

interface Props {
  player: PlayerCard | null;
  onClose: () => void;
}

function getClubInitials(name: string) {
  const parts = name
    .replace(/\b(FC|CF|SC|SV|VfB|VfL|TSG|RB)\b/g, '')
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);

  const source = parts.length > 0 ? parts : name.split(/\s+/);
  return source.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'FT';
}

function getCareerKind(clubName: string) {
  if (/karriereende|retired/i.test(clubName)) return 'status';
  if (/vereinslos|without club|unattached/i.test(clubName)) return 'free';
  if (/\b(Youth|Jugend|U\d{2}|Primavera|Atl[eè]tic|B|II|Reserves?)\b/i.test(clubName)) return 'youth';
  return 'club';
}

function getCareerLabel(kind: string) {
  if (kind === 'youth') return 'Nachwuchs';
  if (kind === 'free') return 'Status';
  if (kind === 'status') return 'Ende';
  return null;
}

function getStatusGlyph(kind: string) {
  if (kind === 'status') return '✓';
  if (kind === 'free') return '–';
  return null;
}

export function CareerTipDrawer({ player, onClose }: Props) {
  return (
    <AnimatePresence>
      {player && (
        <>
          {/* Backdrop (only on mobile) */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 sm:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
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
              fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-gray-700
              sm:static sm:rounded-xl sm:border sm:border-gray-700 sm:mt-3
            "
            style={{ background: '#111827', maxHeight: '60vh', overflowY: 'auto' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-gray-700" />
            </div>

            <div className="px-4 pb-4 pt-2">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FlagIcon nationality={player.nationality} nationality2={player.nationality2} size={26} />
                  <div>
                    <div className="text-xs text-blue-400 font-semibold">💡 Karriere-Tipp</div>
                    <div className="text-xs text-gray-500">
                      {player.nationality}{player.nationality2 ? ` / ${player.nationality2}` : ''} · {getPositionLabel(player.position)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-300 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-800 text-base"
                >
                  ✕
                </button>
              </div>

              {/* Timeline */}
              <div className="space-y-0">
                {player.career.map((club, i) => {
                  const kind = getCareerKind(club.clubName);
                  const label = getCareerLabel(kind);
                  const glyph = getStatusGlyph(kind);

                  return (
                    <motion.div
                      key={club.clubId + i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 py-1.5"
                    >
                      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 14 }}>
                        <div
                          className="w-2.5 h-2.5 rounded-full border-2 flex-shrink-0"
                          style={{
                            borderColor: i === player.career.length - 1 ? '#22C55E' : '#4B5563',
                            background:  i === player.career.length - 1 ? '#22C55E' : 'transparent',
                          }}
                        />
                        {i < player.career.length - 1 && (
                          <div className="w-px mt-1" style={{ background: '#374151', minHeight: 16 }} />
                        )}
                      </div>

                      {glyph ? (
                        <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 text-gray-400 flex-shrink-0 flex items-center justify-center text-xs font-bold">
                          {glyph}
                        </div>
                      ) : club.logoUrl ? (
                        <img
                          src={club.logoUrl}
                          alt={club.clubName}
                          className="w-7 h-7 object-contain flex-shrink-0 rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-gray-800 border border-gray-700 text-gray-300 flex-shrink-0 flex items-center justify-center text-[10px] font-bold">
                          {getClubInitials(club.clubName)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{club.clubName}</div>
                          {label && (
                            <span className="text-[10px] uppercase tracking-wide text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded flex-shrink-0">
                              {label}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
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
