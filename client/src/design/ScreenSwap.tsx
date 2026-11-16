import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Phase } from '@ng/shared';
import { fadeUp } from './motion';

/**
 * Key for a screen: QUESTION and REVEAL of one question share it so the round's
 * content stays mounted (the game module animates that change itself).
 */
export function screenKey(phase: Phase, questionId?: string, waiting?: boolean) {
  if (waiting) return 'waiting';
  return phase === 'QUESTION' || phase === 'REVEAL' ? `round:${questionId ?? ''}` : phase;
}

/** Cross-fades whole screens: old one fades/shrinks out, new one rises in. */
export function ScreenSwap({ id, className = 'flex flex-1 flex-col gap-4', children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={id} variants={fadeUp} initial="hidden" animate="show" exit="exit" className={className}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Status strip (reconnecting / paused) that slides down instead of popping in. */
export function SlideBanner({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border-[3px] border-ink bg-alt px-3 py-2 text-center font-semibold"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
