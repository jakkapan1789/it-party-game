import type { ReactNode } from 'react';
import { leaderFrameUrl } from '../lobby/assets';

/**
 * Final leaderboard on the "chibi cat" frame (a lucky cat waving over a gold-and-purple board). The frame fills the
 * screen: it keeps its width-based scale and only stretches vertically, in the plain straight-sided middle, so the
 * cat, clouds, tassels and paw badge never distort. Children go in the cream board, which scrolls on its own when
 * there are more rows than room (30+ players).
 */
export function LeaderFrame({ children }: { children: ReactNode }) {
  return (
    <div className="leader-fill">
      <div className="leader-frame" style={{ '--frame': `url(${leaderFrameUrl})` } as React.CSSProperties}>
        <div className="leader-board">{children}</div>
      </div>
    </div>
  );
}
