// Everything here tolerates blocked/missing storage (private windows etc.).

export interface PlayerSession {
  playerId?: string;
  roomCode: string;
  nickname: string;
  avatarId: number;
}

const PLAYER_KEY = 'ng.player';
const ADMIN_PIN_KEY = 'ng.adminPin';
const ADMIN_ROOM_KEY = 'ng.adminRoom';

function read(store: Storage | undefined, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
function write(store: Storage | undefined, key: string, value: string | null) {
  try {
    if (value === null) store?.removeItem(key);
    else store?.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function loadPlayerSession(): PlayerSession | null {
  const raw = read(globalThis.localStorage, PLAYER_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    return typeof s?.roomCode === 'string' && typeof s?.nickname === 'string' ? s : null;
  } catch {
    return null;
  }
}
export const savePlayerSession = (s: PlayerSession) => write(globalThis.localStorage, PLAYER_KEY, JSON.stringify(s));
export const clearPlayerSession = () => write(globalThis.localStorage, PLAYER_KEY, null);

// Admin credentials live in sessionStorage so they die with the tab.
export const adminPin = {
  get: () => read(globalThis.sessionStorage, ADMIN_PIN_KEY),
  set: (v: string) => write(globalThis.sessionStorage, ADMIN_PIN_KEY, v),
  clear: () => write(globalThis.sessionStorage, ADMIN_PIN_KEY, null),
};
export const adminRoom = {
  get: () => read(globalThis.sessionStorage, ADMIN_ROOM_KEY),
  set: (v: string) => write(globalThis.sessionStorage, ADMIN_ROOM_KEY, v),
  clear: () => write(globalThis.sessionStorage, ADMIN_ROOM_KEY, null),
};
