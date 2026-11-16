import confetti from 'canvas-confetti';
import { prefersReducedMotion } from './motion';

// Confetti on one shared full-screen canvas, rendered in a worker so it never blocks input.

const COLORS = ['#F7B733', '#D9534F', '#6BCB3C', '#FFF4DC', '#C9607A'];

let shoot: confetti.CreateTypes | null = null;
let timers: number[] = [];

function instance() {
  if (!shoot) {
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '70' });
    document.body.appendChild(canvas);
    shoot = confetti.create(canvas, { resize: true, useWorker: true, disableForReducedMotion: true });
  }
  return shoot;
}

const fire = (o: confetti.Options) => {
  if (prefersReducedMotion()) return;
  void instance()({ colors: COLORS, disableForReducedMotion: true, ...o });
};

export const fx = {
  /** Small burst from bottom centre for a correct answer. */
  correct() {
    fire({ particleCount: 40, spread: 70, startVelocity: 38, origin: { x: 0.5, y: 0.95 }, scalar: 0.9 });
  },
  /** Light sprinkle for finishing outside the top 3. */
  sprinkle() {
    fire({ particleCount: 25, spread: 120, startVelocity: 25, origin: { x: 0.5, y: 0.2 }, gravity: 0.7 });
  },
  /** Side cannons for `ms`, plus random bursts. */
  win(ms = 3000) {
    if (prefersReducedMotion()) return;
    fx.reset();
    const end = Date.now() + ms;
    const side = () => {
      fire({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.8 } });
      fire({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.8 } });
      if (Date.now() < end) timers.push(window.setTimeout(side, 50));
    };
    side();
    for (let t = 0; t < ms; t += 900) {
      timers.push(
        window.setTimeout(
          () => fire({ particleCount: 90, spread: 100, startVelocity: 45, origin: { x: Math.random(), y: Math.random() * 0.4 } }),
          t,
        ),
      );
    }
  },
  reset() {
    timers.forEach((t) => window.clearTimeout(t));
    timers = [];
    shoot?.reset();
  },
};
