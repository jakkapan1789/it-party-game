import type { ReactNode } from 'react';
import { GameBackdrop } from './GameBackdrop';

/**
 * Host (projector) pages: the painted scene fixed behind, content scrolling over it. `calm` is for
 * in-game screens; the login and the waiting room use the full scene. Same root element type on every
 * render, so the backdrop stays mounted when the page switches between modes.
 */
export function HostShell({ calm, children }: { calm?: boolean; children: ReactNode }) {
  return (
    <>
      <GameBackdrop calm={calm} dim={calm ? 'full' : 'light'} />
      <div className="host-shell relative z-10">{children}</div>
    </>
  );
}
