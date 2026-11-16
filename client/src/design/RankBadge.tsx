import type { CSSProperties } from 'react';
import { rankBadgeUrls } from '../lobby/assets';

/**
 * Rank medal: gold crown for 1st, silver for 2nd, bronze for 3rd, a plain gold coin for everyone else. The art is a
 * blank medal, so the rank number is real text laid over its disc (positioned at the disc's centre, sized with the
 * badge). `size` is the badge width in CSS units (default 52px); the layout box is shorter than the art, so the crown
 * and wreath overhang the row a little instead of making it taller.
 */
export function RankBadge({ rank, size }: { rank: number; size?: string }) {
  const url = rankBadgeUrls[Math.min(Math.max(rank, 1), 4) - 1];
  const digits = String(rank).length;
  return (
    <span className={`rank-badge is-${Math.min(rank, 4)} d${Math.min(digits, 3)}`} style={size ? ({ '--bw': size } as CSSProperties) : undefined} aria-label={`#${rank}`}>
      <img src={url} alt="" draggable={false} />
      <span className="rank-num">{rank}</span>
    </span>
  );
}
