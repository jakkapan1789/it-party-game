import { motion, useReducedMotion } from 'framer-motion';
import { th } from '../i18n/th';

// Hotter look per level: 2 = warm orange … 5+ = red-gold, pulsing.
const LEVELS = [
  { bg: 'linear-gradient(to bottom, #FFC27A 50%, #FF9F43 50%)', size: 'text-lg' },
  { bg: 'linear-gradient(to bottom, #FFA45C 50%, #FF7A1F 50%)', size: 'text-xl' },
  { bg: 'linear-gradient(to bottom, #FF7F50 50%, #EE4B2B 50%)', size: 'text-2xl' },
  { bg: 'linear-gradient(to bottom, #FFD45C 50%, #E0301E 50%)', size: 'text-3xl' },
];

/** 🔥 xN streak badge; renders nothing below 2. */
export function StreakBadge({ streak, delay = 0 }: { streak: number; delay?: number }) {
  const reduced = useReducedMotion();
  if (streak < 2) return null;
  const lv = LEVELS[Math.min(streak, 5) - 2];
  const max = streak >= 5;
  return (
    <motion.div
      initial={{ scale: 0, rotate: -15 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay, type: 'spring', stiffness: 520, damping: 16 }}
      className="inline-flex"
      aria-label={th.game.streak(streak)}
    >
      <motion.div
        animate={max && !reduced ? { scale: [1, 1.08, 1] } : undefined}
        transition={{ delay: delay + 0.4, duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: lv.bg }}
        className={`inline-flex items-center gap-1 rounded-full border-[3px] border-ink px-3 py-0.5 font-display shadow-[0_3px_0_var(--color-ink)] ${lv.size}`}
      >
        <span>🔥</span>
        <span className="text-outline-sm">x{streak}</span>
      </motion.div>
    </motion.div>
  );
}
