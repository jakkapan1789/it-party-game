import { promptBannerUrl } from '../lobby/assets';

/**
 * The question on the "Chinese festival banner": a red plate framed in gold with clouds and a ruby. The art
 * is a fixed shape, so the text adapts instead: it stays on one line while it fits, then drops to a smaller
 * two-line size, then smaller again, and past ~72 characters it is cut with "…" (the full text stays in the
 * element's label). Sizes are in cqw so they scale with the banner.
 */
const MAX_CHARS = 72;

export function PromptBanner({ text, host, hidden }: { text: string; host?: boolean; hidden?: boolean }) {
  const chars = [...text];
  const shown = chars.length > MAX_CHARS ? `${chars.slice(0, MAX_CHARS - 1).join('')}…` : text;
  const len = Math.min(chars.length, MAX_CHARS);
  const oneLine = 142 / Math.max(1, len); // font (cqw) at which the text just fits the plate on one line
  const font = oneLine >= 5.6 ? Math.min(8, oneLine) : len <= 56 ? 4.8 : 3.9;
  return (
    <div className={`prompt-frame ${host ? 'is-host' : ''}`} style={{ backgroundImage: `url(${promptBannerUrl})`, opacity: hidden ? 0 : 1, transition: 'opacity .35s ease' }} aria-hidden={hidden || undefined}>
      <p className="prompt-text" style={{ fontSize: `${font}cqw` }} aria-label={text}>
        {shown}
      </p>
    </div>
  );
}
