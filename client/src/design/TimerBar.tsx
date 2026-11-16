import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/sfx';
import { timerFrameUrl } from '../lobby/assets';

interface Props {
  /** Local-clock timestamp (ms) when time runs out: serverEndsAt - clockOffset */
  endsAt: number;
  durationMs: number;
  /** When set, the clock is frozen showing this many ms left (host paused). */
  frozenLeftMs?: number;
}

const URGENT_MS = 5000;
type Band = 'go' | 'alt' | 'stop';
const bandOf = (frac: number): Band => (frac > 0.5 ? 'go' : frac > 0.25 ? 'alt' : 'stop');
const BAND_BG: Record<Band, string> = { go: 'bg-go', alt: 'bg-alt', stop: 'bg-stop' };

/**
 * Countdown on the gold five-ring bar. Shrinking fill, green→yellow→red. The fill is moved with transform from a rAF loop
 * (no React state per frame); React only re-renders when the second or colour band changes.
 * Pulses and ticks in the last 5 seconds.
 */
export function TimerBar({ endsAt, durationMs, frozenLeftMs }: Props) {
  // Capped at the full duration so the bar holds full (and shows the limit) during the intro.
  const leftNow = () => Math.min(durationMs, frozenLeftMs ?? Math.max(0, endsAt - Date.now()));
  const fill = useRef<HTMLDivElement>(null);
  const [secs, setSecs] = useState(() => Math.ceil(leftNow() / 1000));
  const [band, setBand] = useState(() => bandOf(leftNow() / durationMs));

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const left = leftNow();
      const frac = Math.min(1, left / durationMs);
      if (fill.current) fill.current.style.transform = `scaleX(${frac})`;
      setSecs(Math.ceil(left / 1000)); // bail-out: no render unless the value changed
      setBand(bandOf(frac));
      if (frozenLeftMs === undefined && left > 0) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, durationMs, frozenLeftMs]);

  const urgent = frozenLeftMs === undefined && secs > 0 && secs * 1000 <= URGENT_MS;

  useEffect(() => {
    if (!urgent) return;
    sfx.setIntensity('urgent');
    return () => sfx.setIntensity('play'); // paused / unmounted; the page resets to calm after the question
  }, [urgent]);

  useEffect(() => {
    if (urgent) sfx.tick(URGENT_MS / 1000 - secs); // once per second, pitch rises toward 0
  }, [urgent, secs]);

  return (
    <div className={`timer-frame ${urgent ? 'timer-urgent' : ''}`}>
      {/* the fill sits UNDER the frame art; the art's track and its five rings are transparent, so it shows through them */}
      <div className="timer-well">
        <div
          ref={fill}
          className={`timer-fill h-full origin-left ${BAND_BG[band]}`}
          style={{ transform: `scaleX(${Math.min(1, leftNow() / durationMs)})` }}
        />
        {urgent && <span aria-hidden className="timer-flash absolute inset-0" />}
      </div>
      <span aria-hidden className="timer-art" style={{ backgroundImage: `url(${timerFrameUrl})` }} />
      {/* seconds left, in the middle ring */}
      <span key={urgent ? secs : 'calm'} className={`timer-secs ${urgent ? 'timer-sec-pop' : ''}`} role="timer" aria-label={`${secs}`}>
        {secs}
      </span>
    </div>
  );
}
