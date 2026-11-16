import { useEffect } from 'react';

/**
 * Tints the phone browser's own bars (status bar / address bar) while this page is mounted, by
 * updating <meta name="theme-color">; the previous colour comes back on unmount.
 */
export function useThemeColor(color: string) {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return;
    const prev = meta.content;
    meta.content = color;
    return () => {
      meta.content = prev;
    };
  }, [color]);
}
