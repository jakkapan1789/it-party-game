import type { ReactNode } from 'react';
import { waitBannerUrl } from '../lobby/assets';

/**
 * "Waiting for the host…" message on the gold-and-purple banner (the art is a blank purple plate, so the text is
 * real and sized with the banner). Goes in the bottom bar during reveal and leaderboard screens.
 */
export function WaitBanner({ children }: { children: ReactNode }) {
  return (
    <div className="wait-banner" role="status" style={{ backgroundImage: `url(${waitBannerUrl})` }}>
      <p>{children}</p>
    </div>
  );
}
