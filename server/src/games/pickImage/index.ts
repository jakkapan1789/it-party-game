import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { PickImageQuestionView, PickImageRevealView } from '@ng/shared';
import type { GameModule } from '../../core/GameModule';
import { DATA_DIR } from '../../paths';

const DEFAULT_TIME_SEC = 10;
const BASE_POINTS = 500;
const SPEED_BONUS_MAX = 500;
const STREAK_BONUS = 100;
const STREAK_BONUS_CAP = 500;

export const questionSchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    images: z.array(z.object({ id: z.string().min(1), src: z.string().min(1) })).length(2),
    correctImageId: z.string().min(1),
    timeLimitSec: z.number().positive().max(120).default(DEFAULT_TIME_SEC),
  })
  .refine((q) => q.images.some((i) => i.id === q.correctImageId), { message: 'correctImageId not in images' });

export type Question = z.infer<typeof questionSchema>;

interface State {
  questions: Question[];
  /** index -> playerId -> image ids in that player's left/right order */
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

export const QUESTIONS_FILE = path.join(DATA_DIR, 'game1-questions.json');

/** Re-read on every game start so edited question sets apply without a restart. */
export function loadQuestions(): Question[] {
  const raw = JSON.parse(readFileSync(QUESTIONS_FILE, 'utf8'));
  return z.array(questionSchema).min(1).parse(raw);
}

const orderedImages = (q: Question, ids?: string[]) =>
  ids ? ids.map((id) => q.images.find((i) => i.id === id)!) : q.images;

export const pickImage: GameModule<State> = {
  id: 'pickImage',
  title: 'เกมเลือกภาพ',

  listQuestions() {
    try {
      return loadQuestions().map((q) => ({ id: q.id, label: q.prompt }));
    } catch {
      return [];
    }
  },

  onStart(sel) {
    const all = loadQuestions();
    const picked = sel?.questionIds?.length ? all.filter((q) => sel.questionIds!.includes(q.id)) : all;
    if (picked.length === 0) throw new Error('no matching questions');
    const questions = sel?.shuffle ? shuffled(picked) : picked;
    return { state: { questions, orders: new Map() }, total: questions.length };
  },

  onQuestion(state, index, playerIds) {
    const q = state.questions[index];
    const ids = q.images.map((i) => i.id);
    const perPlayer = new Map<string, string[]>();
    for (const id of playerIds) perPlayer.set(id, shuffled(ids)); // anti-peeking: random left/right per player
    state.orders.set(index, perPlayer);
    return { questionId: q.id, timeLimitMs: q.timeLimitSec * 1000 };
  },

  reportLabel(state, index) {
    return state.questions[index].prompt;
  },

  viewFor(state, index, viewer): PickImageQuestionView {
    const q = state.questions[index];
    // correctImageId is deliberately not part of this view
    return { prompt: q.prompt, images: orderedImages(q, state.orders.get(index)?.get(viewer)) };
  },

  onAnswer(state, index, raw) {
    const imageId = (raw as { imageId?: unknown })?.imageId;
    return typeof imageId === 'string' && state.questions[index].images.some((i) => i.id === imageId)
      ? imageId
      : undefined;
  },

  scoreAnswer(state, index, answer, elapsedMs, prevStreak) {
    const q = state.questions[index];
    if (answer !== q.correctImageId) return { correct: false, points: 0 };
    const limitMs = q.timeLimitSec * 1000;
    const left = 1 - Math.min(Math.max(elapsedMs, 0), limitMs) / limitMs; // linear decay
    const speed = Math.round(SPEED_BONUS_MAX * left);
    const streak = Math.min(prevStreak * STREAK_BONUS, STREAK_BONUS_CAP);
    return { correct: true, points: BASE_POINTS + speed + streak };
  },

  onReveal(state, index, answers, eligibleCount) {
    const q = state.questions[index];
    const distribution: Record<string, number> = Object.fromEntries(q.images.map((i) => [i.id, 0]));
    for (const a of answers.values()) distribution[a as string]++;
    const noAnswer = Math.max(0, eligibleCount - answers.size);
    return (viewer): PickImageRevealView => ({
      prompt: q.prompt,
      images: orderedImages(q, state.orders.get(index)?.get(viewer)),
      correctImageId: q.correctImageId,
      distribution,
      noAnswer,
    });
  },
};
