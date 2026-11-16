import { useEffect, useSyncExternalStore } from 'react';

// All sounds are synthesized with Web Audio (no asset files). The AudioContext can only
// start after a user gesture on mobile: see installAudioUnlock() (iOS Safari only counts touchend/click).
// Everything (effects + music) goes through one master gain → compressor so overlapping
// sounds never clip.

const KEY = 'ng.muted';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
// The mute button is gone, so a mute saved by an older version must not silence the game forever.
let muted = false;
try {
  localStorage.removeItem(KEY);
} catch {
  /* storage unavailable */
}
const listeners = new Set<() => void>();
let unlocked = false; // first user gesture seen: audio is allowed to start

function audio(): AudioContext | null {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp).connect(ctx.destination);
  }
  // 'interrupted' is Safari's state after a call, Siri or the phone locking
  if (ctx.state !== 'running') void ctx.resume().catch(() => {});
  return ctx;
}

/**
 * Starts audio on the first real user gesture and keeps trying on later ones until it runs. iOS Safari only
 * unlocks Web Audio from touchend/click (not pointerdown/touchstart), wants a sound started inside that gesture,
 * and plays Web Audio as "ambient" (silenced by the ring/silent switch) unless the page asks for "playback".
 */
export function installAudioUnlock() {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession) nav.audioSession.type = 'playback'; // Safari 16.4+: play even with the silent switch on
  } catch {
    /* not supported */
  }
  const events = ['touchend', 'click', 'keydown'] as const;
  const onGesture = () => {
    const c = audio();
    if (!c) return;
    if (!unlocked) {
      // a one-sample silent buffer started inside the gesture: what older iOS needs to really unlock
      const b = c.createBuffer(1, 1, 22050);
      const src = c.createBufferSource();
      src.buffer = b;
      src.connect(c.destination);
      src.start(0);
    }
    sfx.unlock();
    if (c.state === 'running') events.forEach((e) => window.removeEventListener(e, onGesture, true));
  };
  events.forEach((e) => window.addEventListener(e, onGesture, { capture: true, passive: true }));
  // back from the lock screen / another app: the context may be suspended again, so listen for the next tap
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ctx && ctx.state !== 'running') events.forEach((e) => window.addEventListener(e, onGesture, { capture: true, passive: true }));
  });
}

interface Note {
  f: number; // Hz
  at: number; // seconds from now
  dur: number;
  type?: OscillatorType;
  vol?: number;
  /** Add a second oscillator detuned by this many cents (fatter sound). */
  thick?: number;
  /** Glide to this frequency over the note. */
  to?: number;
}

function voice(c: AudioContext, n: Note, t0: number, out: AudioNode) {
  const g = c.createGain();
  const vol = n.vol ?? 0.12;
  const start = t0 + n.at;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.005);
  g.gain.setValueAtTime(vol, start + Math.max(0.006, n.dur * 0.35));
  g.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
  g.connect(out);
  for (const cents of n.thick ? [-n.thick, n.thick] : [0]) {
    const o = c.createOscillator();
    o.type = n.type ?? 'square';
    o.frequency.setValueAtTime(n.f, start);
    if (n.to) o.frequency.exponentialRampToValueAtTime(n.to, start + n.dur);
    o.detune.value = cents;
    o.connect(g);
    o.start(start);
    o.stop(start + n.dur + 0.02);
  }
}

function play(notes: Note[]) {
  if (muted) return;
  const c = audio();
  if (!c || !master) return;
  const t0 = c.currentTime;
  for (const n of notes) voice(c, n, t0, master);
}

let noiseBuf: AudioBuffer | null = null;

interface Hit {
  at: number;
  dur: number;
  vol: number;
  freq?: number;
  /** Sweep the band-pass to this frequency (whoosh). */
  to?: number;
  q?: number;
}

/** Filtered white-noise hits (snare, whoosh). `at` is seconds from now, or AudioContext time when `absolute`. */
function noise(hits: Hit[], out?: AudioNode, absolute = false) {
  if (muted) return;
  const c = audio();
  if (!c || !master) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime;
  for (const h of hits) {
    const start = absolute ? h.at : t0 + h.at;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = h.q ?? 1;
    bp.frequency.setValueAtTime(h.freq ?? 1800, start);
    if (h.to) bp.frequency.exponentialRampToValueAtTime(h.to, start + h.dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(h.vol, start + Math.min(0.01, h.dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, start + h.dur);
    src.connect(bp).connect(g).connect(out ?? master);
    src.start(start, Math.random() * 0.5);
    src.stop(start + h.dur + 0.02);
  }
}

const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
};

export type Intensity = 'calm' | 'play' | 'urgent';

export const sfx = {
  /** Call from a user gesture so later (non-gesture) sounds are allowed to play. */
  unlock() {
    audio();
    unlocked = true;
    syncMusic();
  },
  click: () => play([{ f: 660, at: 0, dur: 0.06, vol: 0.08 }]),
  /** `step` 0,1,2… raises the pitch a semitone each time (countdown urgency). */
  tick: (step = 0) => play([{ f: 880 * 2 ** (step / 12), at: 0, dur: 0.07, type: 'triangle', vol: 0.14 }]),
  start: () => play([{ f: 523, at: 0, dur: 0.1 }, { f: 784, at: 0.1, dur: 0.16 }]),
  /** Air swoosh for cards flying in. */
  whoosh: () => noise([{ at: 0, dur: 0.35, vol: 0.18, freq: 400, to: 3500, q: 2.5 }]),
  /** Snare roll for `ms`, getting denser and louder, ending on a hit. */
  drumroll(ms = 1200) {
    const hits: Hit[] = [];
    const total = ms / 1000;
    for (let t = 0; t < total; ) {
      const p = t / total;
      hits.push({ at: t, dur: 0.06, vol: 0.12 + p * 0.25 });
      t += 0.09 - p * 0.055; // 11/s → ~29/s
    }
    hits.push({ at: total, dur: 0.35, vol: 0.5, freq: 900 });
    noise(hits);
  },
  /** Big-screen "here's the answer" sting. */
  reveal: () =>
    play([
      { f: 784, at: 0, dur: 0.12, type: 'triangle', vol: 0.14 },
      { f: 1047, at: 0.1, dur: 0.3, type: 'triangle', vol: 0.16, thick: 8 },
      { f: 1319, at: 0.1, dur: 0.3, type: 'square', vol: 0.04 },
    ]),
  /** Climbed the leaderboard: quick rising sweep. */
  rankUp: () =>
    play([
      { f: 523, to: 1047, at: 0, dur: 0.18, type: 'triangle', vol: 0.12 },
      { f: 1047, at: 0.18, dur: 0.16, type: 'square', vol: 0.06, thick: 10 },
    ]),
  /** Answer locked in: short low "thunk-thunk". */
  lock() {
    play([{ f: 196, at: 0, dur: 0.08, type: 'square', vol: 0.12 }, { f: 294, at: 0.07, dur: 0.12, type: 'square', vol: 0.12 }]);
    vibrate(30);
  },
  /** Time ran out without an answer. */
  buzzer() {
    play([{ f: 151, at: 0, dur: 0.35, type: 'sawtooth', vol: 0.12, thick: 30 }]);
    vibrate(120);
  },
  /** Intro countdown beep for 3, 2, 1 — higher as it nears zero. */
  countdown: (n: number) => play([{ f: [0, 784, 659, 523][n] ?? 523, at: 0, dur: 0.14, type: 'triangle', vol: 0.16 }]),
  go: () =>
    play([
      { f: 1047, at: 0, dur: 0.28, type: 'triangle', vol: 0.16, thick: 8 },
      { f: 1568, at: 0, dur: 0.28, type: 'square', vol: 0.05 },
    ]),
  correct() {
    play([
      { f: 523, at: 0, dur: 0.1, thick: 7 },
      { f: 659, at: 0.1, dur: 0.1, thick: 7 },
      { f: 784, at: 0.2, dur: 0.3, thick: 7 },
      { f: 1568, at: 0.2, dur: 0.3, type: 'triangle', vol: 0.05 },
    ]);
    vibrate(60);
  },
  wrong() {
    play([
      { f: 220, at: 0, dur: 0.18, type: 'sawtooth', vol: 0.1 },
      { f: 165, to: 140, at: 0.16, dur: 0.32, type: 'sawtooth', vol: 0.1 },
    ]);
    vibrate([80, 60, 80]);
  },
  fanfare() {
    play([
      { f: 523, at: 0, dur: 0.14, thick: 8 }, { f: 659, at: 0.14, dur: 0.14, thick: 8 }, { f: 784, at: 0.28, dur: 0.14, thick: 8 },
      { f: 1047, at: 0.42, dur: 0.6, thick: 8 }, { f: 784, at: 0.42, dur: 0.6, type: 'triangle' }, { f: 523, at: 0.42, dur: 0.6, type: 'triangle', vol: 0.1 },
    ]);
    vibrate([100, 50, 100, 50, 200]);
  },
  /** Music energy: calm (lobby/boards: bass only), play (questions), urgent (last seconds: faster + hi-hats). */
  setIntensity(v: Intensity) {
    intensity = v;
  },
};

/** Keep the music's energy in step with the game phase (QUESTION = play, everything else = calm). */
export function usePhaseMusic(phase: string) {
  useEffect(() => sfx.setIntensity(phase === 'QUESTION' ? 'play' : 'calm'), [phase]);
}

export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    /* storage unavailable: mute still applies for this page load */
  }
  listeners.forEach((l) => l());
  syncMusic();
  if (!v) sfx.click();
}

export function useMuted() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => void listeners.delete(cb)),
    () => muted,
  );
}

// ---- Background music: a looping 4-bar chiptune (C – Am – F – G), synthesized, ~16 s per loop ----

const BPM = 116;
const STEP = 60 / BPM / 2; // one eighth note
const LEAD = [
  [659, 0, 784, 659, 587, 0, 523, 0],
  [659, 0, 880, 784, 659, 0, 523, 0],
  [880, 0, 784, 659, 587, 659, 523, 0],
  [587, 0, 659, 784, 659, 587, 784, 0],
].flat();
const ROOTS = [131, 110, 87, 98]; // C3 A2 F2 G2
const MUSIC_VOL = 0.45;

let intensity: Intensity = 'calm';
let musicGain: GainNode | null = null;
let musicTimer: number | undefined;
let nextTime = 0;
let step = 0;

function scheduleMusic(c: AudioContext) {
  // Read every step, so intensity changes land within ~0.5 s (the look-ahead).
  while (nextTime < c.currentTime + 0.5) {
    const i = step % LEAD.length;
    const bar = Math.floor(i / 8);
    const inBar = i % 8;
    const stepLen = intensity === 'urgent' ? STEP / 1.12 : STEP;
    if (LEAD[i] && intensity !== 'calm') tone(c, LEAD[i], nextTime, stepLen * 1.6, 'square', 0.035);
    if (inBar % 2 === 0) tone(c, ROOTS[bar] * (inBar === 4 ? 1.5 : 1), nextTime, stepLen * 1.8, 'triangle', 0.1);
    if (intensity === 'urgent') noise([{ at: nextTime, dur: 0.03, vol: inBar % 2 ? 0.05 : 0.08, freq: 8000, q: 0.8 }], musicGain!, true);
    else if (inBar % 2 === 1) tone(c, 3000, nextTime, 0.02, 'square', 0.008); // light tick
    nextTime += stepLen;
    step++;
  }
}

function tone(c: AudioContext, f: number, at: number, dur: number, type: OscillatorType, vol: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(musicGain!);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/** Start/stop the loop to match mute state and whether a user gesture has unlocked audio. */
function syncMusic() {
  const want = unlocked && !muted && !document.hidden;
  const c = want ? audio() : ctx;
  if (!c || !master) return;
  if (!musicGain) {
    musicGain = c.createGain();
    musicGain.connect(master);
  }
  if (want && musicTimer === undefined) {
    musicGain.gain.cancelScheduledValues(c.currentTime);
    musicGain.gain.setValueAtTime(0.0001, c.currentTime);
    musicGain.gain.linearRampToValueAtTime(MUSIC_VOL, c.currentTime + 1.2); // fade in
    nextTime = c.currentTime + 0.1;
    step = 0;
    scheduleMusic(c);
    musicTimer = window.setInterval(() => scheduleMusic(c), 150);
  } else if (!want && musicTimer !== undefined) {
    window.clearInterval(musicTimer);
    musicTimer = undefined;
    musicGain.gain.cancelScheduledValues(c.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, c.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.3); // fade out
  }
}

// Pause when the tab is hidden (phone locked / switched app), resume on return.
document.addEventListener('visibilitychange', syncMusic);
