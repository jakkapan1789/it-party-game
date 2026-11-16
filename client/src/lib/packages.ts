import { useCallback, useEffect, useState } from 'react';
import type { GameInfo, GamePackage } from '@ng/shared';
import { adminPin } from './session';

export const adminHeaders = () => ({ 'x-admin-pin': adminPin.get() ?? '' });

/** What the host will play: a whole game, or one saved package of it. */
export interface PlaySelection {
  moduleId: string;
  packageId: string | null;
}

const SELECTION_KEY = 'ng.play';
const START_KEY = 'ng.startNow';

export function loadSelection(): PlaySelection | null {
  try {
    const v = JSON.parse(localStorage.getItem(SELECTION_KEY) ?? 'null');
    return v && typeof v.moduleId === 'string' ? { moduleId: v.moduleId, packageId: typeof v.packageId === 'string' ? v.packageId : null } : null;
  } catch {
    return null;
  }
}
export function saveSelection(s: PlaySelection) {
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
/** "Start" pressed on the games page: the lobby (which owns the socket) starts the game once it's back on screen. */
export const startOnReturn = {
  set: () => { try { sessionStorage.setItem(START_KEY, '1'); } catch { /* ignore */ } },
  take: () => {
    try {
      const v = sessionStorage.getItem(START_KEY) === '1';
      sessionStorage.removeItem(START_KEY);
      return v;
    } catch {
      return false;
    }
  },
};

/** Per-game extras the server doesn't send: where its question bank is edited and a one-line description. */
export const GAME_META: Record<string, { editPath: string; blurb: string; icon: string }> = {
  pickImage: { editPath: '/admin/questions', blurb: 'โจทย์ + ภาพ 2 ภาพ ให้เลือกภาพที่ถูก', icon: '🖼️' },
  quiz: { editPath: '/admin/quiz-questions', blurb: 'โจทย์ข้อความ ตอบด้วยตัวเลือก A–D', icon: '❓' },
};

/** Games + saved packages from the server (admin PIN needed). */
export function useCatalog(enabled = true) {
  const [games, setGames] = useState<GameInfo[] | null>(null);
  const [packages, setPackages] = useState<GamePackage[] | null>(null);
  const [failed, setFailed] = useState(false);
  const reload = useCallback(() => {
    const headers = adminHeaders();
    setFailed(false);
    fetch('/api/admin/games', { headers }).then((r) => (r.ok ? r.json() : Promise.reject())).then(setGames).catch(() => setFailed(true));
    fetch('/api/admin/packages', { headers }).then((r) => (r.ok ? r.json() : Promise.reject())).then(setPackages).catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);
  return { games, packages, failed, reload };
}

export async function savePackages(list: GamePackage[]) {
  const r = await fetch('/api/admin/packages', { method: 'PUT', headers: { ...adminHeaders(), 'content-type': 'application/json' }, body: JSON.stringify(list) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.issues?.[0]?.message ?? body.error ?? String(r.status));
}

export interface Resolved {
  game: GameInfo;
  pkg: GamePackage | null;
  /** Question ids that will actually be played (a package may name questions that were deleted since). */
  ids: string[];
}

/** Turns the remembered selection into something showable, falling back to "all of the first game" when it is stale. */
export function resolveSelection(sel: PlaySelection | null, games: GameInfo[], packages: GamePackage[]): Resolved | null {
  if (!games.length) return null;
  const pkg = sel?.packageId ? packages.find((p) => p.id === sel.packageId && games.some((g) => g.id === p.moduleId)) ?? null : null;
  const game = games.find((g) => g.id === (pkg?.moduleId ?? sel?.moduleId)) ?? games[0];
  const have = new Set(game.questions.map((q) => q.id));
  const ids = pkg ? pkg.questionIds.filter((id) => have.has(id)) : game.questions.map((q) => q.id);
  return { game, pkg: pkg && pkg.moduleId === game.id ? pkg : null, ids };
}
