import { useEffect, useReducer } from 'react';
import { resetOnce } from '../lib/once';
import type {
  AnswerCount,
  EndedPayload,
  ErrorCode,
  GameSettings,
  LeaderboardPayload,
  PausePayload,
  Phase,
  PlayerPublic,
  QuestionPayload,
  RevealPayload,
  RoomState,
} from '@ng/shared';
import { socket } from '../lib/socket';
import { clock } from '../lib/clock';

export interface FeedState {
  roomCode: string | null;
  phase: Phase;
  count: number;
  players: PlayerPublic[];
  you?: PlayerPublic;
  waiting: boolean;
  settings: GameSettings;
  question: QuestionPayload | null;
  reveal: RevealPayload | null;
  leaderboard: LeaderboardPayload | null;
  ended: EndedPayload | null;
  answerCount: AnswerCount | null;
  /** This player's accepted (locked) answer for the current question. */
  myAnswer: unknown | null;
  /** Server refused this player's answer for the current question (undoes the optimistic lock). */
  answerRejected: ErrorCode | null;
  /** prevRank = rank before the latest reveal (drives the ▲/▼ chip); null when unknown. */
  me: { score: number; rank: number | null; prevRank: number | null };
}

/** Errors that mean "this answer was not taken" (ALREADY_ANSWERED is not one: an answer is locked). */
const ANSWER_ERRORS: ErrorCode[] = ['TOO_LATE', 'WRONG_PHASE', 'PAUSED', 'BAD_ANSWER', 'NOT_ELIGIBLE'];

const initial: FeedState = {
  roomCode: null,
  phase: 'LOBBY',
  count: 0,
  players: [],
  waiting: false,
  settings: { autoRevealWhenAllAnswered: true },
  question: null,
  reveal: null,
  leaderboard: null,
  ended: null,
  answerCount: null,
  myAnswer: null,
  answerRejected: null,
  me: { score: 0, rank: null, prevRank: null },
};

type Action =
  | { t: 'state'; s: RoomState }
  | { t: 'players'; p: { count: number; players: PlayerPublic[] } }
  | { t: 'settings'; s: GameSettings }
  | { t: 'question'; q: QuestionPayload }
  | { t: 'ack'; answer: unknown }
  | { t: 'rejected'; code: ErrorCode }
  | { t: 'count'; c: AnswerCount }
  | { t: 'pause'; p: PausePayload }
  | { t: 'reveal'; r: RevealPayload }
  | { t: 'board'; b: LeaderboardPayload }
  | { t: 'ended'; e: EndedPayload };

function reducer(st: FeedState, a: Action): FeedState {
  switch (a.t) {
    case 'state':
      // A fresh snapshot (join/reconnect): drop stale screens; the server replays the current phase right after.
      return {
        ...initial,
        roomCode: a.s.roomCode,
        phase: a.s.phase,
        count: a.s.playerCount,
        players: st.players,
        you: a.s.you,
        waiting: !!a.s.waiting,
        settings: a.s.settings ?? st.settings,
        me: { score: a.s.you?.score ?? 0, rank: null, prevRank: null },
      };
    case 'players':
      return { ...st, count: a.p.count, players: a.p.players };
    case 'settings':
      return { ...st, settings: a.s };
    case 'question':
      return { ...st, phase: 'QUESTION', question: a.q, reveal: null, leaderboard: null, myAnswer: null, answerRejected: null, answerCount: null, waiting: false };
    case 'ack':
      return { ...st, myAnswer: a.answer, answerRejected: null };
    case 'rejected':
      return st.phase === 'QUESTION' && st.myAnswer == null ? { ...st, answerRejected: a.code } : st;
    case 'count':
      return { ...st, answerCount: a.c };
    case 'pause':
      return st.question
        ? {
            ...st,
            question: {
              ...st.question,
              paused: a.p.paused,
              endsAt: a.p.endsAt,
              remainingMs: a.p.remainingMs,
              // resuming a pause taken during the intro starts the question right away (server does the same)
              startsAt: a.p.paused ? st.question.startsAt : Math.min(st.question.startsAt, a.p.serverNow),
            },
          }
        : st;
    case 'reveal': {
      const y = a.r.yourResult;
      return { ...st, phase: 'REVEAL', reveal: a.r, me: y ? { score: y.totalScore, rank: y.rank, prevRank: st.me.rank } : st.me };
    }
    case 'board':
      return { ...st, phase: 'LEADERBOARD', leaderboard: a.b, me: a.b.you ? { score: a.b.you.score, rank: a.b.you.rank, prevRank: st.me.prevRank } : st.me };
    case 'ended':
      return { ...st, phase: 'ENDED', ended: a.e, me: a.e.you ? { score: a.e.you.score, rank: a.e.you.rank, prevRank: st.me.prevRank } : st.me };
  }
}

/** Single reducer over every room/game event, shared by the player and host screens. */
export function useGameFeed(): FeedState {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    const h = {
      state: (s: RoomState) => {
        if (s.phase === 'LOBBY') resetOnce(); // no game running (new room or "play again"): one-shot effects may fire again
        dispatch({ t: 'state', s });
      },
      players: (p: { count: number; players: PlayerPublic[] }) => dispatch({ t: 'players', p }),
      settings: (s: GameSettings) => dispatch({ t: 'settings', s }),
      question: (q: QuestionPayload) => {
        clock.observe(q.serverNow);
        dispatch({ t: 'question', q });
      },
      ack: (a: { answer: unknown }) => dispatch({ t: 'ack', answer: a.answer }),
      error: (e: { code: ErrorCode }) => {
        if (ANSWER_ERRORS.includes(e.code)) dispatch({ t: 'rejected', code: e.code });
      },
      count: (c: AnswerCount) => dispatch({ t: 'count', c }),
      pause: (p: PausePayload) => {
        clock.observe(p.serverNow);
        dispatch({ t: 'pause', p });
      },
      reveal: (r: RevealPayload) => dispatch({ t: 'reveal', r }),
      board: (b: LeaderboardPayload) => dispatch({ t: 'board', b }),
      ended: (e: EndedPayload) => dispatch({ t: 'ended', e }),
    };
    socket.on('room:state', h.state);
    socket.on('room:players', h.players);
    socket.on('room:settings', h.settings);
    socket.on('game:question', h.question);
    socket.on('player:answerAck', h.ack);
    socket.on('error', h.error);
    socket.on('game:answerCount', h.count);
    socket.on('game:pause', h.pause);
    socket.on('game:reveal', h.reveal);
    socket.on('game:leaderboard', h.board);
    socket.on('game:ended', h.ended);
    return () => {
      socket.off('room:state', h.state);
      socket.off('room:players', h.players);
      socket.off('room:settings', h.settings);
      socket.off('game:question', h.question);
      socket.off('player:answerAck', h.ack);
      socket.off('error', h.error);
      socket.off('game:answerCount', h.count);
      socket.off('game:pause', h.pause);
      socket.off('game:reveal', h.reveal);
      socket.off('game:leaderboard', h.board);
      socket.off('game:ended', h.ended);
    };
  }, []);

  return state;
}
