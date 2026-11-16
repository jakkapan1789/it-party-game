import type { EndedPayload, GameSettings, LeaderboardPayload, Phase, YourResult } from '@ng/shared';

export interface Player {
  id: string;
  nickname: string;
  avatarId: number;
  score: number;
  /** Consecutive correct answers so far. */
  streak: number;
  socketId: string | null;
  connected: boolean;
}

export type Viewer = 'host' | string; // 'host' or a playerId

export interface Round {
  questionId: string;
  /** When the intro ends and answers open (server clock). Shown to clients. */
  startsAt: number;
  /** Origin for elapsedMs (= startsAt unless re-derived on resume). */
  startedAt: number;
  endsAt: number;
  limitMs: number;
  /** Everyone present when the question started; late joiners wait. */
  eligible: Set<string>;
  /** elapsedMs excludes time spent paused. */
  answers: Map<string, { answer: unknown; elapsedMs: number }>;
  pausedMs: number;
  pausedAt?: number;
  remainingMs?: number;
  timer?: NodeJS.Timeout;
  results?: Map<string, YourResult>;
  revealFor?: (viewer: Viewer) => unknown;
}

/** One revealed question, kept so a report can be built even after players leave. */
export interface RoundRecord {
  index: number;
  questionId: string;
  label: string;
  limitMs: number;
  eligible: number;
  entries: {
    playerId: string;
    nickname: string;
    avatarId: number;
    answered: boolean;
    correct: boolean;
    points: number;
    elapsedMs: number | null;
  }[];
}

export interface GameRun {
  startedAt: number;
  endedAt?: number;
  history: RoundRecord[];
  /** One entry per game of the package; `state` is owned by that GameModule. */
  steps: { moduleId: string; state: unknown }[];
  /** Every question of the run in order: which step it belongs to and its index inside that game. */
  plan: { step: number; local: number }[];
  /** = plan.length */
  total: number;
  index: number;
  round?: Round;
  prevRanks: Map<string, number>;
  board?: { payload: LeaderboardPayload; ranks: Map<string, number> };
  final?: { payload: EndedPayload; ranks: Map<string, number> };
}

export interface Room {
  code: string;
  phase: Phase;
  players: Map<string, Player>;
  createdAt: number;
  settings: GameSettings;
  game?: GameRun;
}
