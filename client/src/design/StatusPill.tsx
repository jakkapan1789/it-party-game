import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { SPRING_POP } from './motion';

const tones = {
  gold: 'linear-gradient(to bottom, #FFE08A 50%, #F7B733 50%)',
  stop: 'linear-gradient(to bottom, #EB7B77 50%, #D9534F 50%)',
  calm: 'linear-gradient(to bottom, #8C6FB8 50%, #6A4E96 50%)',
};

/**
 * Bottom-bar status in the Button3D shape but not pressable (and not greyed out like a
 * disabled button): "locked · waiting…", "time's up". `dots` adds a waiting animation.
 */
export function StatusPill({ tone = 'gold', dots, children }: { tone?: keyof typeof tones; dots?: boolean; children: ReactNode }) {
  return (
    <motion.div
      role="status"
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING_POP}
      style={{ background: tones[tone] }}
      className="relative flex min-h-12 w-full items-center justify-center gap-1 rounded-[14px] border-[3px] border-ink px-6 py-2 text-xl font-semibold shadow-[0_5px_0_0_var(--color-ink)]"
    >
      <span className="text-outline-sm">{children}</span>
      {dots && (
        <span aria-hidden className="text-outline-sm flex">
          {[0, 1, 2].map((i) => (
            <span key={i} className="wait-dot" style={{ animationDelay: `${i * 0.15}s` }}>.</span>
          ))}
        </span>
      )}
    </motion.div>
  );
}
