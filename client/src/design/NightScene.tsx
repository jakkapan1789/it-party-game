import type { ReactNode } from 'react';

/**
 * Full-screen magical night backdrop: purple sky, magenta glow behind an old tree,
 * layered forest silhouettes and drifting fireflies. Purely decorative, sits behind everything.
 */

// Deterministic so the scene doesn't reshuffle on re-render.
const FIREFLIES = Array.from({ length: 22 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 97.13 + n * 13.7) + 1) / 2);
  return {
    left: `${(r(1) * 96 + 2).toFixed(1)}%`,
    top: `${(r(2) * 80 + 8).toFixed(1)}%`,
    size: 3 + Math.round(r(3) * 4),
    delay: `${(r(4) * -8).toFixed(2)}s`,
    dur: `${(6 + r(5) * 6).toFixed(2)}s`,
    warm: i % 4 === 0,
  };
});

const STARS = Array.from({ length: 28 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 51.7 + n * 7.3) + 1) / 2);
  return { left: `${(r(1) * 100).toFixed(1)}%`, top: `${(r(2) * 38).toFixed(1)}%`, delay: `${(r(3) * -4).toFixed(2)}s`, big: i % 7 === 0 };
});

export function NightScene() {
  return (
    <div aria-hidden className="no-print night-scene pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {STARS.map((s, i) => (
        <span key={i} className={`night-star ${s.big ? 'night-star-big' : ''}`} style={{ left: s.left, top: s.top, animationDelay: s.delay }} />
      ))}

      {/* glow behind the tree */}
      <div className="absolute left-1/2 top-[52%] size-[130vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(244,130,255,0.85)_0%,rgba(190,70,240,0.5)_28%,rgba(120,40,200,0.2)_50%,transparent_70%)]" />

      <svg className="absolute inset-x-0 bottom-0 h-[78%] w-full" viewBox="0 0 400 500" preserveAspectRatio="xMidYMax slice">
        {/* old tree */}
        <g fill="#2A1352">
          <path d="M182 500 C186 430 184 390 176 350 C160 330 130 318 96 300 C126 304 150 312 170 326 C164 300 146 276 118 254 C150 268 170 288 182 312 C184 280 178 246 166 214 C188 244 196 280 196 316 C204 284 222 256 250 236 C232 262 216 292 212 326 C230 306 258 292 292 286 C262 300 234 320 222 350 C214 390 214 430 220 500 Z" />
          <path d="M176 350 C140 340 100 342 60 330 C98 334 132 330 168 336 Z" />
          <path d="M222 350 C260 336 300 340 344 322 C304 342 266 350 226 360 Z" />
        </g>
        {/* back forest */}
        <path fill="#241046" d="M0 360 C20 330 40 340 56 352 C66 322 96 316 112 344 C128 326 150 334 160 356 L160 500 L0 500 Z M240 356 C254 330 282 322 296 346 C312 320 344 318 356 342 C372 326 392 332 400 344 L400 500 L240 500 Z" />
        {/* ruins */}
        <g fill="#1E0D3C">
          <rect x="58" y="380" width="18" height="44" rx="3" />
          <rect x="80" y="396" width="14" height="28" rx="3" />
          <rect x="318" y="384" width="16" height="40" rx="3" />
        </g>
        {/* front hills + bushes */}
        <path fill="#180A31" d="M0 430 C30 410 60 414 86 426 C104 408 132 406 150 420 C176 412 220 412 250 422 C272 404 304 404 324 420 C350 406 380 410 400 418 L400 500 L0 500 Z" />
        <path fill="#10061F" d="M0 470 C40 452 90 456 130 466 C170 452 230 452 270 464 C310 450 360 452 400 462 L400 500 L0 500 Z" />
      </svg>

      {FIREFLIES.map((f, i) => (
        <span
          key={i}
          className={`firefly ${f.warm ? 'firefly-warm' : ''}`}
          style={{ left: f.left, top: f.top, width: f.size, height: f.size, animationDelay: `${f.delay}, ${f.delay}`, animationDuration: `${f.dur}, 2.4s` }}
        />
      ))}
    </div>
  );
}

/** Small hanging lantern with a warm glow; swings gently. */
export function Lantern({ size = 34 }: { size?: number }) {
  return (
    <span className="lantern relative inline-block shrink-0" style={{ width: size * 0.72, height: size }}>
      <span className="lantern-glow" />
      <svg viewBox="0 0 36 50" width={size * 0.72} height={size} className="relative">
        <defs>
          <radialGradient id="lantern-light" cx="50%" cy="55%" r="60%">
            <stop offset="0%" stopColor="#FFF6C8" />
            <stop offset="55%" stopColor="#FFD35C" />
            <stop offset="100%" stopColor="#F29A2E" />
          </radialGradient>
        </defs>
        <g stroke="#2B1D14" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
          <circle cx="18" cy="4.5" r="3" fill="none" />
          <path d="M8 14 L28 14 L24 8 L12 8 Z" fill="#C98A12" />
          <rect x="7" y="14" width="22" height="26" rx="6" fill="url(#lantern-light)" />
          <path d="M14 15 L14 39 M22 15 L22 39" stroke="#C98A12" strokeWidth="2" />
          <path d="M9 40 L27 40 L24 46 L12 46 Z" fill="#C98A12" />
        </g>
        <ellipse cx="13" cy="20" rx="2" ry="4" fill="#fff" opacity="0.7" />
      </svg>
    </span>
  );
}

/** App name for the top bar: lantern medallion overlapping a gold-framed title plaque. */
export function BrandTitle({ children }: { children: ReactNode }) {
  return (
    <span className="brand-badge">
      <span className="brand-plaque">
        <span className="brand-title truncate text-[1.6rem] leading-none">{children}</span>
      </span>
      <span className="brand-medallion">
        <Lantern size={30} />
      </span>
    </span>
  );
}
