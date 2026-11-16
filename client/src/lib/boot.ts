// Minimum time the loading screen covers the app after a page load/refresh. 0 = no loading screen on refresh
// (the lobby's entrance animations then start immediately).
export const BOOT_MIN_MS = 0;

const bootEndsAt = performance.now() + BOOT_MIN_MS;

/** Seconds until the boot overlay lifts (0 on later client-side navigations), so entrances play when visible. */
export function bootDelaySec(): number {
  return Math.max(0, bootEndsAt - performance.now()) / 1000;
}
