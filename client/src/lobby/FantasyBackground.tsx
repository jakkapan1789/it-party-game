import { memo, useRef, type CSSProperties, type ReactNode } from 'react';
import { SkyFireworks } from './SkyFireworks';
import { seeded, useParallax } from './useLobbyMotion';
import { blossomCornerUrl, sceneUrl } from './assets';

/**
 * Painted mountain-temple scene (one image, cover-fit) with life on top, all behind the form:
 * fireworks and twinkles in the sky, a cherry-blossom branch in each corner (the one source image,
 * mirrored), paper lanterns and embers rising from the bottom, a warm glow on the stone floor and
 * falling petals. `calm` (in-game pages) drops the fireworks, lanterns and embers and shrinks the corner
 * branches, so the effects don't compete with the question. Layers shift by depth via CSS vars from useParallax, so nothing re-renders.
 */
export const FantasyBackground = memo(function FantasyBackground({ running, calm, dim = 'none' }: { running: boolean; calm?: boolean; dim?: 'full' | 'light' | 'none' }) {
  const ref = useRef<HTMLDivElement>(null);
  useParallax(ref);
  return (
    <div ref={ref} aria-hidden className={`lobby-bg ${running ? '' : 'is-paused'} ${calm ? 'is-calm' : ''}`}>
      <Layer depth={6}>
        <img src={sceneUrl} alt="" className="bg-scene" decoding="async" />
      </Layer>
      {!calm && <SkyFireworks running={running} />}
      {/* darkens the painted scene for readability, but sits UNDER the branches, petals and glints so those stay bright */}
      {dim !== 'none' && <div className={`game-dim ${dim === 'light' ? 'is-light' : ''}`} />}
      <Layer depth={4}>
        <Glints />
      </Layer>
      <span className="bg-floor-glow" />
      {!calm && (
        <>
          <Layer depth={14}>
            <Rising items={LANTERNS} className="sky-lantern" />
          </Layer>
          <Layer depth={22}>
            <Rising items={EMBERS} className="ember" />
          </Layer>
        </>
      )}
      {/* the corner branches frame every screen; in-game (calm) they are a little smaller so they don't crowd the content */}
      <Layer depth={18}>
        {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
          <img key={c} src={blossomCornerUrl} alt="" className={`bg-blossom bg-blossom-${c}`} decoding="async" />
        ))}
      </Layer>
      <Layer depth={36}>
        <Petals />
      </Layer>
    </div>
  );
});

function Layer({ depth, className = '', children }: { depth: number; className?: string; children: ReactNode }) {
  return (
    <div className="lobby-layer" style={{ '--d': `${depth}px` } as CSSProperties}>
      <div className={`lobby-layer-inner ${className}`}>{children}</div>
    </div>
  );
}

// Things that drift up from the bottom edge to the top: [left %, size px, duration s, delay s, sideways drift vw].
function risers(count: number, seed: number, size: [number, number], dur: [number, number]) {
  return Array.from({ length: count }, (_, i) => {
    const d = dur[0] + seeded(i, seed + 2) * (dur[1] - dur[0]);
    return {
      left: 3 + seeded(i, seed) * 92,
      size: Math.round(size[0] + seeded(i, seed + 1) * (size[1] - size[0])),
      dur: d,
      delay: -seeded(i, seed + 3) * d, // already mid-flight on load
      dx: (seeded(i, seed + 4) - 0.5) * 12,
    };
  });
}
const LANTERNS = risers(9, 200, [14, 30], [24, 40]);
const EMBERS = risers(14, 300, [3, 6], [9, 16]);

function Rising({ items, className }: { items: ReturnType<typeof risers>; className: string }) {
  return (
    <>
      {items.map((it, i) => (
        <span
          key={i}
          className={className}
          style={{
            left: `${it.left}%`,
            width: it.size,
            '--dx': `${it.dx}vw`,
            animationDuration: `${it.dur.toFixed(1)}s, ${(3 + (i % 3)).toFixed(1)}s`,
            animationDelay: `${it.delay.toFixed(1)}s, ${it.delay.toFixed(1)}s`,
          } as CSSProperties}
        />
      ))}
    </>
  );
}

// The painted sky already has its star field; these are the few that twinkle on top (upper third only).
const GLINTS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(4 + seeded(i, 11) * 92).toFixed(1)}%`,
  top: `${(3 + seeded(i, 12) * 28).toFixed(1)}%`,
  size: 8 + Math.round(seeded(i, 13) * 12),
  delay: `${(-seeded(i, 14) * 4).toFixed(2)}s`,
  dur: `${(2.4 + seeded(i, 15) * 2.4).toFixed(2)}s`,
}));

function Glints() {
  return (
    <>
      {GLINTS.map((g, i) => (
        <span key={i} className="lobby-glint" style={{ left: g.left, top: g.top, fontSize: g.size, animationDelay: g.delay, animationDuration: g.dur }}>
          ✦
        </span>
      ))}
    </>
  );
}

const PETALS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(seeded(i, 90) * 100).toFixed(1)}%`,
  size: 7 + Math.round(seeded(i, 91) * 7),
  dur: `${(11 + seeded(i, 92) * 10).toFixed(1)}s`,
  delay: `${(-seeded(i, 93) * 20).toFixed(1)}s`,
  gold: i % 5 === 0,
}));

function Petals() {
  return (
    <>
      {PETALS.map((p, i) => (
        <span key={i} className={`lobby-petal ${p.gold ? 'lobby-petal-gold' : ''}`} style={{ left: p.left, width: p.size, height: p.size, animationDuration: p.dur, animationDelay: p.delay }} />
      ))}
    </>
  );
}
