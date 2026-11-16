import type {
  AnswerCount,
  EndedPayload,
  ErrorCode,
  GameSettings,
  LeaderboardEntry,
  LeaderboardPayload,
  QuestionPayload,
  RevealPayload,
  YourResult,
} from '@ng/shared';
import type { GameModule } from './GameModule';
import type { IO } from './socketTypes';
import type { GameRun, Player, Room, Round, Viewer } from './types';
import { buildReport, saveReport } from './report';

/** Answers arriving this long after `endsAt` are still accepted (network jitter). */
export const GRACE_MS = 300;
/** Answers this early (before `startsAt`) are accepted for client clock skew; elapsed is clamped to 0. */
const EARLY_MS = 200;
const COUNT_DEBOUNCE_MS = 250;
const TOP_N = 10;
/** The final board lists everyone up to this many (players scroll through it); the in-game board stays at TOP_N. */
const FINAL_N = 100;

const adminsRoom = (code: string) => `admins:${code}`;

type Result = ErrorCode | undefined;

/**
 * Runs the phase machine LOBBY → QUESTION → REVEAL → LEADERBOARD → (QUESTION | ENDED).
 * Everything time-related uses the server clock; clients only ever display it.
 */
export class GameController {
  private countTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private io: IO,
    private modules: Map<string, GameModule<any>>,
    private defaultModuleId: string,
    /** "Question 3/10 · 3-2-1" lead-in before the clock starts. 0 disables it. */
    private introMs = 0,
  ) {}

  // ───────────── admin transitions ─────────────

  /** Starts one game: all its questions, or the chosen subset (a saved package). Default: every question of the default game. */
  start(room: Room, sel?: { moduleId: string; questionIds?: string[]; shuffle?: boolean }): Result {
    if (room.phase !== 'LOBBY') return 'WRONG_PHASE';
    if (room.players.size === 0) return 'NO_PLAYERS';
    const steps: GameRun['steps'] = [];
    const plan: GameRun['plan'] = [];
    try {
      const mod = this.modules.get(sel?.moduleId ?? this.defaultModuleId);
      if (!mod) throw new Error(`unknown game "${sel?.moduleId}"`);
      const started = mod.onStart(sel);
      for (let local = 0; local < started.total; local++) plan.push({ step: 0, local });
      steps.push({ moduleId: mod.id, state: started.state });
    } catch (err) {
      console.error('Failed to load game content:', err);
      return 'NO_QUESTIONS';
    }
    if (plan.length === 0) return 'NO_QUESTIONS';
    for (const p of room.players.values()) {
      p.score = 0;
      p.streak = 0;
    }
    room.game = { steps, plan, total: plan.length, index: 0, prevRanks: new Map(), startedAt: Date.now(), history: [] };
    this.startQuestion(room, 0);
  }

  reveal(room: Room): Result {
    const g = room.game;
    const round = g?.round;
    if (!g || !round || room.phase !== 'QUESTION') return 'WRONG_PHASE';
    clearTimeout(round.timer);
    round.pausedAt = undefined; // revealing while paused is allowed
    const { mod, state, local, moduleId: _m } = this.at(room, g.index);

    // Score everyone who was eligible; silence = wrong = streak reset.
    const prelim = new Map<string, Omit<YourResult, 'rank' | 'totalScore'>>();
    const answers = new Map<string, unknown>();
    for (const id of round.eligible) {
      const p = room.players.get(id);
      if (!p) continue;
      const a = round.answers.get(id);
      let correct = false;
      let points = 0;
      if (a) {
        answers.set(id, a.answer);
        const elapsed = Math.min(Math.max(a.elapsedMs, 0), round.limitMs);
        ({ correct, points } = mod.scoreAnswer(state, local, a.answer, elapsed, p.streak));
      }
      p.streak = correct ? p.streak + 1 : 0;
      p.score += points;
      prelim.set(id, { answer: a?.answer ?? null, answered: !!a, correct, points, streak: p.streak });
    }

    const { ranks } = this.rank(room);
    round.results = new Map();
    for (const [id, r] of prelim) {
      round.results.set(id, { ...r, totalScore: room.players.get(id)!.score, rank: ranks.get(id)! });
    }
    g.history.push({
      index: g.index,
      questionId: round.questionId,
      label: mod.reportLabel?.(state, local) ?? round.questionId,
      limitMs: round.limitMs,
      eligible: round.eligible.size,
      entries: [...round.results].map(([id, r]) => {
        const p = room.players.get(id)!;
        const a = round.answers.get(id);
        return {
          playerId: id,
          nickname: p.nickname,
          avatarId: p.avatarId,
          answered: r.answered,
          correct: r.correct,
          points: r.points,
          elapsedMs: a ? Math.min(Math.max(a.elapsedMs, 0), round.limitMs) : null,
        };
      }),
    });
    this.persistReport(room);
    round.revealFor = mod.onReveal(state, local, answers, round.eligible.size);
    room.phase = 'REVEAL';

    this.emitToPlayers(room, (p) => round.eligible.has(p.id) && { ev: 'game:reveal', payload: this.revealPayload(room, p.id) });
    this.io.to(adminsRoom(room.code)).emit('game:reveal', this.revealPayload(room, 'host'));
  }

  showLeaderboard(room: Room): Result {
    const g = room.game;
    if (!g || room.phase !== 'REVEAL') return 'WRONG_PHASE';
    const { sorted, ranks } = this.rank(room);
    const payload: LeaderboardPayload = {
      index: g.index,
      total: g.total,
      isLast: g.index + 1 >= g.total,
      top: this.entries(sorted, ranks, g.prevRanks),
      playerCount: room.players.size,
    };
    g.board = { payload, ranks };
    g.prevRanks = ranks;
    room.phase = 'LEADERBOARD';
    this.emitToPlayers(room, (p) => ({ ev: 'game:leaderboard', payload: this.boardFor(room, p.id) }));
    this.io.to(adminsRoom(room.code)).emit('game:leaderboard', payload);
  }

  next(room: Room): Result {
    const g = room.game;
    if (!g || (room.phase !== 'REVEAL' && room.phase !== 'LEADERBOARD')) return 'WRONG_PHASE';
    if (g.index + 1 >= g.total) return this.end(room);
    this.startQuestion(room, g.index + 1);
  }

  end(room: Room): Result {
    const g = room.game;
    if (!g || room.phase === 'LOBBY' || room.phase === 'ENDED') return 'WRONG_PHASE';
    clearTimeout(g.round?.timer);
    if (g.round) g.round.pausedAt = undefined;
    const { sorted, ranks } = this.rank(room);
    const payload: EndedPayload = {
      top: this.entries(sorted, ranks, new Map(), FINAL_N),
      playerCount: room.players.size,
    };
    g.final = { payload, ranks };
    g.endedAt = Date.now();
    this.persistReport(room);
    room.phase = 'ENDED';
    this.emitToPlayers(room, (p) => ({ ev: 'game:ended', payload: this.finalFor(room, p.id) }));
    this.io.to(adminsRoom(room.code)).emit('game:ended', payload);
  }

  /** "Play again" in the same room: back to the lobby with everyone still in, scores wiped. Only after the game has ended. */
  restart(room: Room): Result {
    if (room.phase !== 'ENDED') return 'WRONG_PHASE';
    clearTimeout(room.game?.round?.timer);
    clearTimeout(this.countTimers.get(room.code));
    this.countTimers.delete(room.code);
    room.game = undefined;
    room.phase = 'LOBBY';
    for (const p of room.players.values()) {
      p.score = 0;
      p.streak = 0;
    }
    const base = { roomCode: room.code, phase: room.phase, playerCount: room.players.size, settings: room.settings };
    this.io.to(adminsRoom(room.code)).emit('room:state', base);
    for (const p of room.players.values()) {
      if (!p.socketId) continue;
      const you = { id: p.id, nickname: p.nickname, avatarId: p.avatarId, score: 0, connected: p.connected };
      this.io.to(p.socketId).emit('room:state', { ...base, you });
    }
  }

  private persistReport(room: Room) {
    const report = buildReport(room);
    if (report) saveReport(report).catch((err) => console.error('Failed to save report:', err));
  }

  /** Freeze the clock: remaining time is kept and answers are rejected until resume. */
  pause(room: Room): Result {
    const round = room.game?.round;
    if (!round || room.phase !== 'QUESTION' || round.pausedAt) return 'WRONG_PHASE';
    clearTimeout(round.timer);
    const now = Date.now();
    round.pausedAt = now;
    // Paused during the intro: the full limit is still ahead.
    round.remainingMs = Math.min(round.limitMs, Math.max(0, round.endsAt - now));
    this.emitPause(room, round);
  }

  resume(room: Room): Result {
    const round = room.game?.round;
    if (!round || room.phase !== 'QUESTION' || !round.pausedAt) return 'WRONG_PHASE';
    const now = Date.now();
    if (round.startsAt > round.pausedAt) round.startsAt = now; // paused in the intro: go straight in
    round.pausedMs += now - round.pausedAt;
    round.pausedAt = undefined;
    round.endsAt = now + (round.remainingMs ?? 0);
    // Keep elapsed = now - startedAt - pausedMs reaching exactly limitMs at endsAt.
    round.startedAt = round.endsAt - round.limitMs - round.pausedMs;
    this.scheduleDeadline(room, round, round.remainingMs ?? 0);
    this.emitPause(room, round);
  }

  setSettings(room: Room, s: GameSettings) {
    room.settings = s;
    this.io.to(adminsRoom(room.code)).emit('room:settings', s);
    this.maybeAutoReveal(room);
  }

  // ───────────── player input ─────────────

  submitAnswer(room: Room, playerId: string, raw: { questionId: string }): { error: ErrorCode } | { answer: unknown } {
    const g = room.game;
    const round = g?.round;
    if (!g || !round || room.phase !== 'QUESTION' || raw.questionId !== round.questionId) return { error: 'WRONG_PHASE' };
    if (round.pausedAt) return { error: 'PAUSED' };
    const now = Date.now();
    if (now < round.startsAt - EARLY_MS) return { error: 'WRONG_PHASE' }; // still in the intro
    if (now > round.endsAt + GRACE_MS) return { error: 'TOO_LATE' };
    if (!round.eligible.has(playerId)) return { error: 'NOT_ELIGIBLE' };
    if (round.answers.has(playerId)) return { error: 'ALREADY_ANSWERED' }; // first answer wins
    const cur = this.at(room, g.index);
    const answer = cur.mod.onAnswer(cur.state, cur.local, raw);
    if (answer === undefined) return { error: 'BAD_ANSWER' };
    round.answers.set(playerId, { answer, elapsedMs: now - round.startedAt - round.pausedMs });
    this.scheduleCount(room);
    this.maybeAutoReveal(room);
    return { answer };
  }

  // ───────────── roster / reconnect ─────────────

  isWaiting(room: Room, playerId: string): boolean {
    const g = room.game;
    if (!g?.round || room.phase === 'LOBBY' || room.phase === 'ENDED') return false;
    return !g.round.eligible.has(playerId);
  }

  /** Call after any join/leave/disconnect: keeps the live count right and can end the question early. */
  onRosterChange(room: Room) {
    if (room.phase !== 'QUESTION') return;
    this.scheduleCount(room);
    this.maybeAutoReveal(room);
  }

  removePlayer(room: Room, playerId: string) {
    const round = room.game?.round;
    round?.eligible.delete(playerId);
    round?.answers.delete(playerId);
    round?.results?.delete(playerId);
    room.game?.prevRanks.delete(playerId);
    this.onRosterChange(room);
  }

  /** Re-send whatever the current phase needs so a (re)joining socket can rebuild its screen. */
  replay(room: Room, viewer: Viewer, socketId: string) {
    const g = room.game;
    if (!g) return;
    const to = this.io.to(socketId);
    const isHost = viewer === 'host';
    if (!isHost && this.isWaiting(room, viewer)) return;
    switch (room.phase) {
      case 'QUESTION': {
        to.emit('game:question', this.questionPayload(room, viewer));
        const mine = isHost ? undefined : g.round?.answers.get(viewer);
        if (mine) to.emit('player:answerAck', { questionId: g.round!.questionId, answer: mine.answer });
        if (isHost) to.emit('game:answerCount', this.count(room));
        break;
      }
      case 'REVEAL':
        to.emit('game:reveal', this.revealPayload(room, viewer));
        break;
      case 'LEADERBOARD':
        to.emit('game:leaderboard', isHost ? g.board!.payload : this.boardFor(room, viewer));
        break;
      case 'ENDED':
        to.emit('game:ended', isHost ? g.final!.payload : this.finalFor(room, viewer));
        break;
    }
  }

  // ───────────── internals ─────────────

  /** The game, its state and the in-game question number for global question `index`. */
  private at(room: Room, index: number) {
    const g = room.game!;
    const { step, local } = g.plan[index];
    const { moduleId, state } = g.steps[step];
    return { mod: this.modules.get(moduleId)!, moduleId, state, local };
  }

  private startQuestion(room: Room, index: number) {
    const g = room.game!;
    const cur = this.at(room, index);
    const info = cur.mod.onQuestion(cur.state, cur.local, [...room.players.keys()]);
    const startsAt = Date.now() + this.introMs;
    const round: Round = {
      questionId: info.questionId,
      startsAt,
      startedAt: startsAt,
      endsAt: startsAt + info.timeLimitMs,
      limitMs: info.timeLimitMs,
      eligible: new Set(room.players.keys()),
      answers: new Map(),
      pausedMs: 0,
    };
    g.index = index;
    g.round = round;
    room.phase = 'QUESTION';
    this.scheduleDeadline(room, round, this.introMs + info.timeLimitMs);

    this.emitToPlayers(room, (p) => ({ ev: 'game:question', payload: this.questionPayload(room, p.id) }));
    this.io.to(adminsRoom(room.code)).emit('game:question', this.questionPayload(room, 'host'));
    this.io.to(adminsRoom(room.code)).emit('game:answerCount', this.count(room));
  }

  /** QUESTION → REVEAL is the one automatic transition: fires at the deadline (+grace for in-flight answers). */
  private scheduleDeadline(room: Room, round: Round, inMs: number) {
    clearTimeout(round.timer);
    round.timer = setTimeout(() => {
      if (room.game?.round === round && room.phase === 'QUESTION') this.reveal(room);
    }, inMs + GRACE_MS);
  }

  private emitPause(room: Room, round: Round) {
    const payload = {
      paused: !!round.pausedAt,
      endsAt: round.endsAt,
      remainingMs: round.remainingMs ?? 0,
      serverNow: Date.now(),
    };
    this.io.to(`players:${room.code}`).emit('game:pause', payload);
    this.io.to(adminsRoom(room.code)).emit('game:pause', payload);
  }

  private questionPayload(room: Room, viewer: Viewer): QuestionPayload {
    const g = room.game!;
    const r = g.round!;
    const cur = this.at(room, g.index);
    return {
      moduleId: cur.moduleId,
      questionId: r.questionId,
      index: g.index,
      total: g.total,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      serverNow: Date.now(),
      limitMs: r.limitMs,
      paused: r.pausedAt ? true : undefined,
      remainingMs: r.pausedAt ? r.remainingMs : undefined,
      view: cur.mod.viewFor(cur.state, cur.local, viewer),
    };
  }

  private revealPayload(room: Room, viewer: Viewer): RevealPayload {
    const g = room.game!;
    const r = g.round!;
    return {
      moduleId: this.at(room, g.index).moduleId,
      questionId: r.questionId,
      index: g.index,
      total: g.total,
      view: r.revealFor!(viewer),
      yourResult: viewer === 'host' ? undefined : r.results?.get(viewer),
    };
  }

  private boardFor(room: Room, playerId: string): LeaderboardPayload {
    const { payload, ranks } = room.game!.board!;
    const p = room.players.get(playerId);
    const rank = ranks.get(playerId);
    return { ...payload, you: p && rank ? { rank, score: p.score } : undefined };
  }

  private finalFor(room: Room, playerId: string): EndedPayload {
    const { payload, ranks } = room.game!.final!;
    const p = room.players.get(playerId);
    const rank = ranks.get(playerId);
    return { ...payload, you: p && rank ? { rank, score: p.score } : undefined };
  }

  /** Competition ranking: equal scores share a rank (1,2,2,4). */
  private rank(room: Room) {
    const sorted = [...room.players.values()].sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname));
    const ranks = new Map<string, number>();
    let prevScore = NaN;
    let prevRank = 0;
    sorted.forEach((p, i) => {
      const r = p.score === prevScore ? prevRank : i + 1;
      ranks.set(p.id, r);
      prevScore = p.score;
      prevRank = r;
    });
    return { sorted, ranks };
  }

  private entries(sorted: Player[], ranks: Map<string, number>, prev: Map<string, number>, limit = TOP_N): LeaderboardEntry[] {
    return sorted.slice(0, limit).map((p) => ({
      playerId: p.id,
      nickname: p.nickname,
      avatarId: p.avatarId,
      score: p.score,
      rank: ranks.get(p.id)!,
      prevRank: prev.get(p.id) ?? null,
    }));
  }

  private emitToPlayers(
    room: Room,
    build: (p: Player) => false | { ev: 'game:question' | 'game:reveal' | 'game:leaderboard' | 'game:ended'; payload: any },
  ) {
    for (const p of room.players.values()) {
      if (!p.socketId) continue;
      const m = build(p);
      if (m) this.io.to(p.socketId).emit(m.ev, m.payload);
    }
  }

  private count(room: Room): AnswerCount {
    const round = room.game?.round;
    return { answered: round?.answers.size ?? 0, total: round?.eligible.size ?? 0 };
  }

  private scheduleCount(room: Room) {
    if (this.countTimers.has(room.code)) return;
    this.countTimers.set(
      room.code,
      setTimeout(() => {
        this.countTimers.delete(room.code);
        this.io.to(adminsRoom(room.code)).emit('game:answerCount', this.count(room));
      }, COUNT_DEBOUNCE_MS),
    );
  }

  private maybeAutoReveal(room: Room) {
    const round = room.game?.round;
    if (!round || room.phase !== 'QUESTION' || !room.settings.autoRevealWhenAllAnswered) return;
    let anyone = false;
    for (const id of round.eligible) {
      const p = room.players.get(id);
      if (!p?.connected) continue; // don't wait on people who dropped
      anyone = true;
      if (!round.answers.has(id)) return;
    }
    if (anyone) this.reveal(room);
  }
}
