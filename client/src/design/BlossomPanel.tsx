import type { HTMLAttributes, ReactNode } from 'react';
import { playersFrameUrl, playersTabUrl } from '../lobby/assets';

interface Props extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Shown on the red tab hanging over the top edge. */
  title?: ReactNode;
  /** Frame scale: sm for small cards (lobby, game tiles). */
  size?: 'sm' | 'md';
}

/**
 * Content panel on the gold cherry-blossom frame (9-slice: the corners never stretch) with an optional red title tab
 * that grows with its text. Cards inside are restyled lighter (see .blossom-panel .card-solid).
 */
export function BlossomPanel({ title, size = 'md', className = '', style, children, ...rest }: Props) {
  return (
    <section
      className={`blossom-panel ${title ? 'has-tab' : ''} is-${size} ${className}`}
      style={{ '--bp-frame': `url(${playersFrameUrl})`, '--bp-tab': `url(${playersTabUrl})`, ...style } as React.CSSProperties}
      {...rest}
    >
      {title && <h2 className="bp-tab">{title}</h2>}
      {children}
    </section>
  );
}
