import type { ReactNode } from 'react';
import { promptBannerUrl } from '../lobby/assets';

/** Page heading on the red-and-gold festival plate (the question banner art). Long titles shrink to fit. */
export function PageBanner({ children, className = '' }: { children: ReactNode; className?: string }) {
  const len = typeof children === 'string' ? [...children].length : 12;
  const font = Math.min(7.2, 118 / Math.max(1, len)); // cqw: one line across the plate
  return (
    <div className={`prompt-frame page-banner ${className}`} style={{ backgroundImage: `url(${promptBannerUrl})` }}>
      <h1 className="prompt-text" style={{ fontSize: `${font}cqw` }}>{children}</h1>
    </div>
  );
}
