import { useEffect, useRef, useState, type RefObject } from 'react';

/** Deterministic pseudo-random in [0,1) so decorative layouts don't reshuffle on re-render. */
export function seeded(i: number, n: number) {
  const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Quick horizontal shake of an element (Web Animations, so a focused input keeps focus). No-op under reduced motion. */
export function shakeElement(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return;
  el.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
    { duration: 380, easing: 'ease-in-out' },
  );
}

/**
 * Shakes `ref` whenever the field becomes invalid, and again every time `nonce` changes while it stays
 * invalid (e.g. pressing "join" twice with the same empty field).
 */
export function useShakeOnInvalid(ref: RefObject<HTMLElement>, invalid: boolean, nonce = 0) {
  useEffect(() => {
    if (invalid) shakeElement(ref.current);
  }, [ref, invalid, nonce]);
}

/** True while the tab is visible; decorative loops pause when it isn't. */
export function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    const on = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}

/**
 * Mouse parallax (desktop only): eases CSS vars --px / --py (range -1..1) on the given element.
 * Layers read them in CSS, so React never re-renders. The rAF loop only runs while easing.
 */
export function useParallax(ref: RefObject<HTMLElement>) {
  const target = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const cur = { x: 0, y: 0 };
    let raf = 0;
    const tick = () => {
      cur.x += (target.current.x - cur.x) * 0.06;
      cur.y += (target.current.y - cur.y) * 0.06;
      el.style.setProperty('--px', cur.x.toFixed(4));
      el.style.setProperty('--py', cur.y.toFixed(4));
      const done = Math.abs(target.current.x - cur.x) < 0.001 && Math.abs(target.current.y - cur.y) < 0.001;
      raf = done ? 0 : requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return; // touch drags shouldn't shake the scene
      target.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
      kick();
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      target.current = { x: clamp(e.gamma / 25), y: clamp((e.beta - 45) / 30) };
      kick();
    };
    // Tilt parallax is off on phones: the gyro never holds still, so the loop never stopped and every layer of the
    // scene moved (re-composited at 3x pixel density) on every frame of the game: the main cause of the stutter.
    void onTilt;
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
    };
  }, [ref]);
}
