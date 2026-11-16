import type { ReactNode } from 'react';
import { noticeBannerUrl } from '../lobby/assets';

/**
 * Notice card with the chibi hero giving a thumbs-up over a cream board and a red plate. The art has no text:
 * `title` goes on the cream board (big, dark) and `sub` on the red plate (white), both positioned in % of the art
 * (trimmed 1210×1138) and sized in cqw so they scale with the card.
 */
export function NoticeBanner({ title, sub }: { title: ReactNode; sub: ReactNode }) {
  return (
    <div className="notice-banner" role="status" style={{ backgroundImage: `url(${noticeBannerUrl})` }}>
      <p className="notice-title">{title}</p>
      <p className="notice-sub">{sub}</p>
    </div>
  );
}
