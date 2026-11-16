import { useLayoutEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

interface Props {
  value: number;
  durationMs?: number;
  /** Start value for the first render (default: `value`, i.e. no animation on mount). */
  from?: number;
  /** Wait before tweening (e.g. let a result card land first). */
  delayMs?: number;
  className?: string;
}

/**
 * Number that tweens to `value` whenever it changes. The span's text is owned by this
 * effect, not React (no state per frame), so it is cheap on low-end phones.
 */
export function CountUp({ value, durationMs = 600, from, delayMs = 0, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(from ?? value);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const write = (v: number) => {
      shown.current = v;
      el.textContent = Math.round(v).toLocaleString();
    };
    write(shown.current);
    if (reduced || shown.current === value) return write(value);
    const controls = animate(shown.current, value, { duration: durationMs / 1000, delay: delayMs / 1000, ease: 'easeOut', onUpdate: write });
    return () => controls.stop();
  }, [value, durationMs, delayMs, reduced]);

  return <span ref={ref} className={className} />;
}
