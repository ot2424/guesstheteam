import { motion } from 'framer-motion';
import { getXPToNextLevel } from '../../data/mockUser';

interface Props {
  xp: number;
  level: number;
}

export function XPBar({ xp, level }: Props) {
  const { current, needed } = getXPToNextLevel(xp);
  const pct = (current / needed) * 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">Level {level}</span>
        <span className="text-xs text-gray-400">{current} / {needed} XP</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #16A34A, #2bd46a)', boxShadow: '0 0 12px rgba(34,197,94,0.6)' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
