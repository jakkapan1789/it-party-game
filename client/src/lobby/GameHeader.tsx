import type { CSSProperties } from 'react';
import { th } from '../i18n/th';
import { lobbyBannerUrl, titleBannerUrl } from './assets';

// The two banner artworks: url, aspect ratio of the trimmed art, and the heading screen readers get.
const BANNERS = {
  title: { url: titleBannerUrl, ratio: '2162 / 719', label: () => th.join.title },
  lobby: { url: lobbyBannerUrl, ratio: '2091 / 506', label: () => th.lobby.bannerTitle },
} as const;

// Sparkles around the banner: position (% of banner), size (px), delay (s).
const SPARKLES = [
  { x: 9, y: 34, s: 16, d: 0 },
  { x: 92, y: 30, s: 14, d: -1.2 },
  { x: 50, y: 3, s: 18, d: -2.1 },
  { x: 96, y: 72, s: 12, d: -0.6 },
  { x: 4, y: 76, s: 12, d: -1.8 },
];

/**
 * Title banner artwork ("ปาร์ตี้ปีใหม่" is painted into the art) centred at the top, with light
 * effects: a breathing glow behind, a shine that sweeps across the art (masked to the banner's
 * own shape) and twinkling sparkles. The real <h1> stays for screen readers.
 */
export function GameHeader({ banner = 'title' }: { banner?: keyof typeof BANNERS }) {
  const b = BANNERS[banner];
  return (
    <header className="lobby-header">
      <h1 className="sr-only">{b.label()}</h1>
      <div className="title-banner" aria-hidden style={{ '--banner': `url(${b.url})`, '--banner-ratio': b.ratio } as CSSProperties}>
        <span className="title-glow" />
        <img src={b.url} alt="" className="title-banner-art" draggable={false} />
        <span className="title-shine" />
        {SPARKLES.map((p, i) => (
          <span key={i} className="title-sparkle" style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.s, animationDelay: `${p.d}s` }}>
            ✦
          </span>
        ))}
      </div>
    </header>
  );
}
