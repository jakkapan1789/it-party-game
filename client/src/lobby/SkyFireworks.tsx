import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './useLobbyMotion';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  col: string; // "r,g,b"
}

const COLORS = ['255,214,102', '255,140,160', '255,255,255', '160,200,255', '255,170,90'];

/**
 * Fireworks in the upper sky: a burst every ~2–3.5 s of ~50 glowing sparks that fall and fade.
 * One small canvas (top ~40% of the screen), additive blending, DPR capped at 2. Loops only while
 * `running` (tab visible) and not under reduced motion; no particles are alive between bursts' fade-outs
 * so the draw cost is tiny.
 */
export function SkyFireworks({ running }: { running: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || !running || prefersReducedMotion()) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();
    let nextBurst = last + 700;
    const parts: Particle[] = [];

    const resize = () => {
      const r = cv.getBoundingClientRect();
      w = r.width;
      h = r.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const burst = () => {
      const cx = w * (0.1 + Math.random() * 0.8);
      const cy = h * (0.18 + Math.random() * 0.55);
      const col = COLORS[Math.floor(Math.random() * COLORS.length)];
      const n = 44 + Math.floor(Math.random() * 18);
      const speed = 55 + Math.random() * 45;
      parts.push({ x: cx, y: cy, vx: 0, vy: 0, life: 0, max: 0.28, size: 16, col }); // flash at the centre
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.25;
        const s = speed * (0.55 + Math.random() * 0.45);
        parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 1.3 + Math.random() * 0.7, size: 1.4 + Math.random() * 1.2, col });
      }
    };

    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (t >= nextBurst && parts.length < 300) {
        burst();
        nextBurst = t + 2000 + Math.random() * 1500;
      }
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) {
          parts.splice(i, 1);
          continue;
        }
        p.vy += 70 * dt; // gravity
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const k = 1 - p.life / p.max;
        ctx.fillStyle = `rgba(${p.col},${(k * k).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.6 + 0.4 * k), 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [running]);

  return <canvas ref={ref} aria-hidden className="sky-fireworks" />;
}
