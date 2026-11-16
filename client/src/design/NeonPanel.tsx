import type { CSSProperties, ReactNode } from 'react';
import { neonPanelUrl } from '../lobby/assets';

/**
 * Blue neon panel with a title tab on top. Scales with its width (container units) and only stretches vertically,
 * in the plain middle, so the chamfered corners, the tab and the wave corners never distort.
 */
export function NeonPanel({ title, className = '', children }: { title?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className="neon-wrap">
      <section className="neon-panel" style={{ '--neon-art': `url(${neonPanelUrl})` } as CSSProperties}>
        {title && <h2 className="neon-tab">{title}</h2>}
        <div className={`neon-body ${className}`}>{children}</div>
      </section>
    </div>
  );
}
