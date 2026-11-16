import type { Viewer } from './types';

/**
 * A mini-game plugs into the core through this interface. The core owns rooms,
 * phases, the server clock, answer timing/grace, streaks and the leaderboard;
 * the module owns content, per-player presentation and how an answer is scored.
 * Module state `S` lives on the room's GameRun, so one module instance serves all rooms.
 */
export interface GameModule<S = unknown> {
  id: string;
  /** Name shown in the package editor. */
  title: string;
  /** The questions available right now (id + short label, never the answer), for the games page. */
  listQuestions(): { id: string; label: string }[];

  /** Load content and build per-room state. Throw if there is nothing playable. */
  /** `questionIds` limits the set (bank order kept), `shuffle` randomises it. Throws if nothing is left to play. */
  onStart(sel?: { questionIds?: string[]; shuffle?: boolean }): { state: S; total: number };

  /** Prepare round `index` (e.g. shuffle per-player). */
  onQuestion(state: S, index: number, playerIds: string[]): { questionId: string; timeLimitMs: number };

  /** What a viewer may see of the question. Must never leak the answer. */
  viewFor(state: S, index: number, viewer: Viewer): unknown;

  /** Validate an untrusted answer payload. Return the normalized answer, or undefined if invalid. */
  onAnswer(state: S, index: number, raw: unknown): unknown | undefined;

  /** `prevStreak` = consecutive correct answers before this round. */
  scoreAnswer(
    state: S,
    index: number,
    answer: unknown,
    elapsedMs: number,
    prevStreak: number,
  ): { correct: boolean; points: number };

  /** Short human-readable name of a round for the host report (e.g. the question text). */
  reportLabel?(state: S, index: number): string;

  /** Called once at reveal; returns the per-viewer reveal view. */
  onReveal(
    state: S,
    index: number,
    answers: Map<string, unknown>,
    eligibleCount: number,
  ): (viewer: Viewer) => unknown;
}
