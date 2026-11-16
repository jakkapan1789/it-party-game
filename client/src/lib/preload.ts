import {
  leaderFrameUrl,
  noticeBannerUrl,
  promptBannerUrl,
  quizFrameAUrl,
  quizFrameBUrl,
  rankBadgeUrls,
  resultFrameUrl,
  scoreboardFrameUrl,
  scorePillUrl,
  submitBannerUrl,
  timerFrameUrl,
  waitBannerUrl,
} from '../lobby/assets';

/** Art the in-game screens paint with. The lobby doesn't use it, so it would otherwise only start loading when the first question pops up. */
export const IN_GAME_ART = [
  quizFrameAUrl,
  quizFrameBUrl,
  timerFrameUrl,
  promptBannerUrl,
  submitBannerUrl,
  waitBannerUrl,
  resultFrameUrl,
  noticeBannerUrl,
  scoreboardFrameUrl,
  leaderFrameUrl,
  scorePillUrl,
  ...rankBadgeUrls,
];

const warmed = new Set<string>();
// Safari has no requestIdleCallback
const idle = (fn: () => void) =>
  typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 300);

/**
 * Fetch and decode images in the background, one at a time while the page is idle, so they
 * never compete with what is on screen. Skipped with Data Saver on. Safe to call repeatedly.
 */
export function warmImages(urls: readonly string[]) {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  const queue = urls.filter((u) => u && !warmed.has(u));
  queue.forEach((u) => warmed.add(u));
  const next = () => {
    const url = queue.shift();
    if (!url) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    img.decode().catch(() => {}).finally(() => idle(next));
  };
  idle(next);
}
