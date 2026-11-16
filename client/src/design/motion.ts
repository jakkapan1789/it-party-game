import type { Transition, Variants } from 'framer-motion';

// Shared motion tokens. Animate transform/opacity only (see docs/GAME_FEEL_PLAN.md §2).

export const SPRING_POP: Transition = { type: 'spring', stiffness: 420, damping: 22 };
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 260, damping: 28 };
export const EASE_OUT = [0.2, 0.9, 0.3, 1] as const;
export const DUR = { fast: 0.15, base: 0.25, slow: 0.45 } as const;

/** Springs in from small; use with initial="hidden" animate="show". */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: SPRING_POP },
  exit: { opacity: 0, scale: 0.9, transition: { duration: DUR.fast } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: DUR.fast } },
};

/** One-shot horizontal shake for a wrong answer. */
export const shake: Variants = {
  hidden: { opacity: 0, x: 0 },
  show: { opacity: 1, x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } },
};

/** Parent variant that staggers its children's "show". */
export const staggerChildren = (staggerMs = 60, delayMs = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: staggerMs / 1000, delayChildren: delayMs / 1000 } },
});

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
