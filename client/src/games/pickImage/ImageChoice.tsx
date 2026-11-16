import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { th } from '../../i18n/th';
import { SPRING_POP } from '../../design';
import { QuizFrame } from './QuizFrame';

export type Mark = 'correct' | 'wrong' | null;

interface Props {
  src: string;
  /** 0 = frame "A", 1 = frame "B": the letter is painted into the frame art. */
  index: number;
  selected?: boolean;
  /** Another image is selected: shade this one back. */
  dimmed?: boolean;
  disabled?: boolean;
  /** Answer sent for this image: stamp it. */
  locked?: boolean;
  mark?: Mark;
  /** Load this image ahead of others (current question). */
  priority?: boolean;
  onSelect?: () => void;
  onZoom: () => void;
}

const LONG_PRESS_MS = 450;

/** Tappable picture card on the A/B quiz frame: tap selects, long-press or the frame's magnifier opens it full screen. */
export function ImageChoice({ src, index, selected, dimmed, disabled, locked, mark, priority, onSelect, onZoom }: Props) {
  const timer = useRef<number>();
  const longPressed = useRef(false);
  const [loaded, setLoaded] = useState(false);

  const cancel = () => window.clearTimeout(timer.current);
  const down = () => {
    longPressed.current = false;
    timer.current = window.setTimeout(() => {
      longPressed.current = true;
      onZoom();
    }, LONG_PRESS_MS);
  };
  const click = () => {
    if (longPressed.current) return void (longPressed.current = false);
    if (!disabled) onSelect?.();
  };

  const shade = mark ? 0 : dimmed ? 0.55 : disabled && !selected ? 0.25 : 0;
  const state = mark === 'correct' ? 'is-correct' : mark === 'wrong' ? 'is-wrong' : selected ? 'is-selected' : '';
  const letter = index % 2 === 0 ? 'A' : 'B';

  return (
    <motion.div
      className="relative"
      animate={{ scale: selected && !mark ? 1.04 : 1 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={SPRING_POP}
    >
      <QuizFrame
        index={index}
        state={state}
        overlay={
          <>
            <button
              type="button"
              aria-label={`${letter}`}
              aria-pressed={selected}
              onClick={click}
              onPointerDown={down}
              onPointerUp={cancel}
              onPointerLeave={cancel}
              onPointerCancel={cancel}
              onContextMenu={(e) => e.preventDefault()}
              className="quiz-hit [-webkit-touch-callout:none]"
            />
            {/* sits over the magnifier painted into the frame */}
            <button type="button" aria-label={th.game.zoom} onClick={onZoom} className="quiz-zoom" />
            {selected && !mark && !locked && <span className="quiz-chip is-picked">✓ {th.game.picked}</span>}
            {mark && <span className={`quiz-chip is-mark ${mark === 'correct' ? 'is-go' : 'is-stop'}`}>{mark === 'correct' ? '✓' : '✕'}</span>}
          </>
        }
      >
        <img
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          // React 18 doesn't know fetchPriority; pass the DOM attribute as-is
          {...{ fetchpriority: priority ? 'high' : 'auto' }}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={`size-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
        {!loaded && <span aria-hidden className="img-skeleton absolute inset-0" />}
        {/* solid shade instead of transparency, so the scene behind never shows through a faded card */}
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-[#0B0626] transition-opacity duration-300" style={{ opacity: shade }} />
        {locked && !mark && (
          <motion.span
            aria-hidden
            initial={{ scale: 2.6, rotate: -28, opacity: 0 }}
            animate={{ scale: 1, rotate: -12, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 18 }}
            className="absolute inset-0 m-auto grid h-fit w-fit place-items-center rounded-xl border-4 border-ink bg-ribbon px-3 py-1 font-display text-2xl shadow-[0_4px_0_var(--color-ink)]"
          >
            🔒 {th.game.lockStamp}
          </motion.span>
        )}
      </QuizFrame>
    </motion.div>
  );
}

export function ZoomOverlay({ src, onClose }: { src: string | null; onClose: () => void }) {
  if (!src) return null;
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4">
      <img src={src} alt="" className="max-h-full max-w-full rounded-xl border-4 border-ink" />
      <span className="absolute right-4 top-4 grid size-12 place-items-center rounded-full border-4 border-ink bg-cream text-xl">✕</span>
    </div>
  );
}
