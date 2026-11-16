// Socket.io event contracts shared by client and server.
import type {
  AnswerCount,
  EndedPayload,
  ErrorCode,
  GameSettings,
  LeaderboardPayload,
  PausePayload,
  PlayerPublic,
  QuestionPayload,
  RevealPayload,
  RoomState,
} from './types';
import type { AdminStartPayload, PlayerAnswerPayload, PlayerJoinPayload, PlayerUpdatePayload } from './schemas';

export interface ClientToServerEvents {
  ping: (clientSentAt: number, ack: (res: { serverNow: number; clientSentAt: number }) => void) => void;

  'player:join': (p: PlayerJoinPayload) => void;
  'player:answer': (p: PlayerAnswerPayload) => void;
  /** Lobby only. Answers through the ack (not the global `error` event, which would drop the player out of the room). */
  /** Leave the room for good (the "leave" button): the player is removed, so the nickname is free again.
   *  A plain disconnect is different: it keeps the player as offline so they can come back. */
  'player:leave': (ack: () => void) => void;
  'player:update': (p: PlayerUpdatePayload, ack: (res: { ok: true } | { ok: false; code: ErrorCode }) => void) => void;

  'admin:auth': (p: { pin: string }) => void;
  'admin:createRoom': () => void;
  'admin:reconnect': (p: { roomCode: string }) => void;
  'admin:kick': (p: { playerId: string }) => void;
  /** Start the game; `packageId` = a saved package, else every question of `moduleId` (default game if none). */
  'admin:start': (p?: AdminStartPayload) => void;
  'admin:next': () => void;
  'admin:reveal': () => void;
  'admin:showLeaderboard': () => void;
  'admin:end': () => void;
  /** After the game ended: back to the lobby of the same room (players stay, scores reset). */
  'admin:restart': () => void;
  'admin:pause': () => void;
  'admin:resume': () => void;
  'admin:settings': (p: GameSettings) => void;
}

export interface ServerToClientEvents {
  hello: (msg: { message: string; serverNow: number }) => void;
  error: (e: { code: ErrorCode; message: string }) => void;

  'admin:authed': () => void;
  'player:kicked': () => void;

  /** Full snapshot, sent on join / reconnect. */
  'room:state': (s: RoomState) => void;
  /** Admin sockets get every player. Player sockets get the count, plus (only while waiting in the lobby) the latest few joiners. */
  'room:players': (p: { count: number; players: PlayerPublic[] }) => void;
  'room:settings': (s: GameSettings) => void;

  /** Never contains the answer; each player gets their own image order. */
  'game:question': (q: QuestionPayload) => void;
  /** Player's answer was accepted and locked. */
  'player:answerAck': (a: { questionId: string; answer: unknown }) => void;
  /** Admin sockets only. */
  'game:answerCount': (c: AnswerCount) => void;
  'game:pause': (p: PausePayload) => void;
  'game:reveal': (r: RevealPayload) => void;
  'game:leaderboard': (l: LeaderboardPayload) => void;
  'game:ended': (e: EndedPayload) => void;
}
