// "Did this already happen on this tab?" — keeps one-shot effects (sound, vibration,
// confetti) from replaying when a refresh/reconnect replays the same reveal.

const KEY = 'ng.once';
let mem: string[] = [];

function load(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '[]');
  } catch {
    return mem;
  }
}

/** Forget everything (a new game in the same room reuses question ids and must play its effects again). */
export function resetOnce() {
  mem = [];
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Returns true the first time it is called with `id` on this tab, false afterwards. */
export function firstTime(id: string): boolean {
  const seen = load();
  if (seen.includes(id)) return false;
  mem = [...seen, id].slice(-50);
  try {
    sessionStorage.setItem(KEY, JSON.stringify(mem));
  } catch {
    /* storage unavailable: in-memory list still dedupes within this page load */
  }
  return true;
}
