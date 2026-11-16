export type Phase = 'LOBBY' | 'QUESTION' | 'REVEAL' | 'LEADERBOARD' | 'ENDED';

/** Avatars a player can get (random per join). Ids from the former 8-avatar set still load: the client shows `id % AVATAR_COUNT`. */
export const AVATAR_COUNT = 6;
export const ROOM_CODE_LENGTH = 6;
export const NICKNAME_MAX = 16;

export interface PlayerPublic {
  id: string;
  nickname: string;
  avatarId: number;
  score: number;
  connected: boolean;
}

export interface RoomState {
  roomCode: string;
  phase: Phase;
  playerCount: number;
  /** Present for player sockets: the player's own record. */
  you?: PlayerPublic;
  /** Joined mid-round: sits out until the next question. */
  waiting?: boolean;
  settings?: GameSettings;
}

/** A saved set of questions for ONE game ("which ones to play"), made on the host's games page. */
export interface GamePackage {
  id: string;
  name: string;
  moduleId: string;
  /** Questions to play, in the game's own order. */
  questionIds: string[];
  /** Play them in random order. */
  shuffle: boolean;
  /** Last saved (ms). Missing on packages saved before this was added. */
  updatedAt?: number;
}
/** A game the server can run, for the games page. Labels are the question texts only (never answers). */
export interface GameInfo {
  id: string;
  title: string;
  questions: { id: string; label: string }[];
}

export interface GameSettings {
  /** End a question as soon as every connected player has answered. */
  autoRevealWhenAllAnswered: boolean;
}

// ---- generic game payloads (module-specific content lives in `view`) ----

export interface QuestionPayload {
  moduleId: string;
  questionId: string;
  index: number;
  total: number;
  /** Server clock (ms): intro/countdown until this, answers accepted from it. */
  startsAt: number;
  /** Server clock (ms). Client converts with its measured clock offset. */
  endsAt: number;
  serverNow: number;
  limitMs: number;
  /** Host paused this question: timer frozen, answers rejected. */
  paused?: boolean;
  remainingMs?: number;
  view: unknown;
}

export interface PausePayload {
  paused: boolean;
  /** New deadline (server clock). While paused this is only a placeholder; use remainingMs. */
  endsAt: number;
  remainingMs: number;
  serverNow: number;
}

export interface YourResult {
  answer: unknown | null;
  answered: boolean;
  correct: boolean;
  points: number;
  streak: number;
  totalScore: number;
  rank: number;
}

export interface RevealPayload {
  moduleId: string;
  questionId: string;
  index: number;
  total: number;
  view: unknown;
  yourResult?: YourResult;
}

export interface LeaderboardEntry {
  playerId: string;
  nickname: string;
  avatarId: number;
  score: number;
  rank: number;
  /** Rank at the previous leaderboard, null if not on it. Drives ▲▼ and the reorder animation. */
  prevRank: number | null;
}

export interface LeaderboardPayload {
  index: number;
  total: number;
  isLast: boolean;
  top: LeaderboardEntry[];
  you?: { rank: number; score: number };
  playerCount: number;
}

export interface EndedPayload {
  /** Final standings, best first: everyone up to 100 players (the host podium only uses the first three). */
  top: LeaderboardEntry[];
  you?: { rank: number; score: number };
  playerCount: number;
}

export interface AnswerCount {
  answered: number;
  total: number;
}

// ---- "pick the right image" views ----
export interface PickImageImage {
  id: string;
  src: string;
}
export interface PickImageQuestionView {
  prompt: string;
  images: PickImageImage[];
}
export interface PickImageRevealView extends PickImageQuestionView {
  correctImageId: string;
  distribution: Record<string, number>;
  noAnswer: number;
}

// ---- "answer the question" (text choices) views ----
export interface QuizChoice {
  id: string;
  text: string;
}
export interface QuizQuestionView {
  prompt: string;
  choices: QuizChoice[];
}
export interface QuizRevealView extends QuizQuestionView {
  correctChoiceId: string;
  distribution: Record<string, number>;
  noAnswer: number;
}

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'NAME_TAKEN'
  | 'TOO_MANY_ATTEMPTS'
  | 'WRONG_PHASE'
  | 'NO_PLAYERS'
  | 'NO_QUESTIONS'
  | 'NOT_ELIGIBLE'
  | 'ALREADY_ANSWERED'
  | 'TOO_LATE'
  | 'BAD_ANSWER'
  | 'PAUSED';

// ───────────── Game report (host-only, built from the rounds that were revealed) ─────────────

export interface ReportQuestion {
  index: number;
  questionId: string;
  label: string;
  limitMs: number;
  /** Players present when the question started. */
  eligible: number;
  answered: number;
  correct: number;
  /** Mean answer time over everyone who answered / over correct answers only. */
  avgMs: number | null;
  avgCorrectMs: number | null;
}

export interface ReportPlayer {
  playerId: string;
  nickname: string;
  avatarId: number;
  rank: number;
  score: number;
  correct: number;
  wrong: number;
  unanswered: number;
  bestStreak: number;
  avgMs: number | null;
}

export interface GameReport {
  id: string;
  roomCode: string;
  moduleId: string;
  startedAt: number;
  endedAt: number | null;
  /** Questions in the set vs. questions that were actually revealed (less if ended early). */
  totalQuestions: number;
  questions: ReportQuestion[];
  players: ReportPlayer[];
}

export interface ReportSummary {
  id: string;
  roomCode: string;
  startedAt: number;
  endedAt: number | null;
  playerCount: number;
  questionCount: number;
  totalQuestions: number;
}
