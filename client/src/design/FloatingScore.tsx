import { motion } from 'framer-motion';

/** Damage-number style "+850". Remount (change `key`) to replay. */
export function FloatingScore({ value, onDone, delay = 0 }: { value: number; onDone?: () => void; delay?: number }) {
  return (
    <motion.div
      initial={{ y: 0, scale: 0.4, opacity: 0 }}
      animate={{ y: -90, scale: [0.4, 1.5, 1.2], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.3, ease: 'easeOut', times: [0, 0.2, 0.7, 1], delay }}
      onAnimationComplete={onDone}
      className="text-outline pointer-events-none text-5xl text-go [-webkit-text-stroke:7px_var(--color-ink)]"
    >
      +{value.toLocaleString()}
    </motion.div>
  );
}
