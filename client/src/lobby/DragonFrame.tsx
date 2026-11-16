import type { ReactNode } from 'react';
import { dragonFrameUrl, dragonLanternLUrl, dragonLanternRUrl } from './assets';

/**
 * Portrait "Chinese dragon" frame (dragons + pagoda roof on top, hanging lanterns, clouds and a ruby at the
 * bottom). It scales uniformly with its width (`--fw`, set by the parent) and only stretches vertically, in
 * the plain straight-sided middle, so the ornaments never distort. The lanterns hang in that stretchable band,
 * so they're separate pictures laid on top at their original spot. Children go in the cream area.
 */
export function DragonFrame({ title, className = '', children }: { title?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={`dragon-frame ${className}`} style={{ '--dragon-art': `url(${dragonFrameUrl})` } as React.CSSProperties}>
      <img src={dragonLanternLUrl} alt="" aria-hidden className="dragon-lantern is-left" draggable={false} />
      <img src={dragonLanternRUrl} alt="" aria-hidden className="dragon-lantern is-right" draggable={false} />
      {title && <h2 className="dragon-title">{title}</h2>}
      {children}
    </div>
  );
}
