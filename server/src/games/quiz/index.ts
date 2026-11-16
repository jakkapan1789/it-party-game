import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { QuizQuestionView, QuizRevealView } from '@ng/shared';
import type { GameModule } from '../../core/GameModule';
import { DATA_DIR } from '../../paths';

const DEFAULT_TIME_SEC = 15;
const BASE_POINTS = 500;
const SPEED_BONUS_MAX = 500;
const STREAK_BONUS = 100;
const STREAK_BONUS_CAP = 500;

export const quizQuestionSchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().trim().min(1).max(160),
    choices: z.array(z.object({ id: z.string().min(1), text: z.string().trim().min(1).max(60) })).min(2).max(4),
    correctChoiceId: z.string().min(1),
    timeLimitSec: z.number().positive().max(120).default(DEFAULT_TIME_SEC),
  })
  .refine((q) => q.choices.some((c) => c.id === q.correctChoiceId), { message: 'correctChoiceId not in choices' })
  .refine((q) => new Set(q.choices.map((c) => c.id)).size === q.choices.length, { message: 'duplicate choice id' });

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const QUIZ_QUESTIONS_FILE = path.join(DATA_DIR, 'game2-questions.json');

/** Re-read on every game start so edited question sets apply without a restart. */
export function loadQuizQuestions(): QuizQuestion[] {
  return z.array(quizQuestionSchema).min(1).parse(JSON.parse(readFileSync(QUIZ_QUESTIONS_FILE, 'utf8')));
}

interface State {
  questions: QuizQuestion[];
  /** index -> playerId -> choice ids in that player's order */
  orders: Map<number, Map<string, string[]>>;
}

const shuffled = <T>(a: T[]): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

const ordered = (q: QuizQuestion, ids?: string[]) => (ids ? ids.map((id) => q.choices.find((c) => c.id === id)!) : q.choices);

export const quiz: GameModule<State> = {
  id: 'quiz',
  title: 'เกมตอบคำถาม',

  listQuestions() {
    try {
      return loadQuizQuestions().map((q) => ({ id: q.id, label: q.prompt }));
    } catch {
      return [];
    }
  },

  onStart(sel) {
    const all = loadQuizQuestions();
    const picked = sel?.questionIds?.length ? all.filter((q) => sel.questionIds!.includes(q.id)) : all;
    if (picked.length === 0) throw new Error('no matching questions');
    const questions = sel?.shuffle ? shuffled(picked) : picked;
    return { state: { questions, orders: new Map() }, total: questions.length };
  },

  onQuestion(state, index, playerIds) {
    const q = state.questions[index];
    const ids = q.choices.map((c) => c.id);
    const perPlayer = new Map<string, string[]>();
    for (const id of playerIds) perPlayer.set(id, shuffled(ids)); // anti-peeking: every phone has its own order
    state.orders.set(index, perPlayer);
    return { questionId: q.id, timeLimitMs: q.timeLimitSec * 1000 };
  },

  reportLabel(state, index) {
    return state.questions[index].prompt;
  },

  viewFor(state, index, viewer): QuizQuestionView {
    const q = state.questions[index];
    // correctChoiceId is deliberately not part of this view
    return { prompt: q.prompt, choices: ordered(q, state.orders.get(index)?.get(viewer)) };
  },

  onAnswer(state, index, raw) {
    const choiceId = (raw as { choiceId?: unknown })?.choiceId;
    return typeof choiceId === 'string' && state.questions[index].choices.some((c) => c.id === choiceId) ? choiceId : undefined;
  },

  scoreAnswer(state, index, answer, elapsedMs, prevStreak) {
    const q = state.questions[index];
    if (answer !== q.correctChoiceId) return { correct: false, points: 0 };
    const limitMs = q.timeLimitSec * 1000;
    const left = 1 - Math.min(Math.max(elapsedMs, 0), limitMs) / limitMs;
    return { correct: true, points: BASE_POINTS + Math.round(SPEED_BONUS_MAX * left) + Math.min(prevStreak * STREAK_BONUS, STREAK_BONUS_CAP) };
  },

  onReveal(state, index, answers, eligibleCount) {
    const q = state.questions[index];
    const distribution: Record<string, number> = Object.fromEntries(q.choices.map((c) => [c.id, 0]));
    for (const a of answers.values()) distribution[a as string]++;
    const noAnswer = Math.max(0, eligibleCount - answers.size);
    return (viewer): QuizRevealView => ({
      prompt: q.prompt,
      choices: ordered(q, state.orders.get(index)?.get(viewer)),
      correctChoiceId: q.correctChoiceId,
      distribution,
      noAnswer,
    });
  },
};
