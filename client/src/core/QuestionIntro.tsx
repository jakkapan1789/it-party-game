import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { th } from '../i18n/th';
import { sfx } from '../lib/sfx';
import { clock } from '../lib/clock';
import { SPRING_POP } from '../design';
import type { FeedState } from './useGameFeed';

const STEP_MS = 600; // each of 3 · 2 · 1
const GO_MS = 550; // how long "ไป!" stays after startsAt

type Stage = { k: 'card' } | { k: 'count'; n: number } | { k: 'go' } | { k: 'done' };

function stageAt(left: number): Stage {
  if (left <= -GO_MS) return { k: 'done' };
  if (left <= 0) return { k: 'go' };
  if (left <= STEP_MS * 3) return { k: 'count', n: Math.ceil(left / STEP_MS) };
  return { k: 'card' };
}

interface Props {
  /** Local-clock time the question opens. */
  startsAt: number;
  index: number;
  total: number;
  prompt?: string;
  /** Host projector: bigger type. */
  big?: boolean;
  paused?: boolean;
}

/**
 * Full-screen lead-in: "ข้อ 3 / 10" → prompt → 3 · 2 · 1 → ไป!
 * Driven by the server's startsAt, so every phone counts in step. Renders nothing
 * when mounted after the question already opened (reconnect / refresh).
 */
export function QuestionIntro({ startsAt, index, total, prompt, big, paused }: Props) {
  const [stage, setStage] = useState<Stage>(() => (Date.now() >= startsAt ? { k: 'done' } : stageAt(startsAt - Date.now())));
  const key = stage.k === 'count' ? `n${stage.n}` : stage.k;

  useEffect(() => {
    if (stage.k === 'done' || paused) return;
    const id = window.setInterval(() => setStage((s) => {
      const next = stageAt(startsAt - Date.now());
      return next.k === s.k && (next.k !== 'count' || next.n === (s as { n: number }).n) ? s : next;
    }), 50);
    return () => window.clearInterval(id);
  }, [startsAt, paused, stage.k]);

  useEffect(() => {
    if (stage.k === 'card') sfx.whoosh();
    if (stage.k === 'count') sfx.countdown(stage.n);
    if (stage.k === 'go') sfx.go();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const show = stage.k !== 'done' && !paused;
  const last = index + 1 === total;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          className="fixed inset-0 z-40 grid place-items-center bg-[#150A2B]/80 px-6 text-center"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-4">
            <motion.p
              initial={{ y: -40, scale: 0.6, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={SPRING_POP}
              className={`rounded-2xl border-4 border-ink bg-ribbon px-6 py-2 font-display shadow-[0_6px_0_var(--color-ink)] ${big ? 'text-6xl' : 'text-3xl'}`}
            >
              {last ? th.game.introLast : th.game.introQuestion(index + 1, total)}
            </motion.p>
            {prompt && (
              <motion.p
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className={`max-w-3xl font-semibold text-white [text-shadow:0_3px_0_var(--color-ink)] ${big ? 'text-5xl' : 'text-2xl'}`}
              >
                {prompt}
              </motion.p>
            )}
            <div className={`grid place-items-center ${big ? 'h-56' : 'h-36'}`}>
              <AnimatePresence mode="popLayout">
                {(stage.k === 'count' || stage.k === 'go') && (
                  <motion.span
                    key={key}
                    initial={{ scale: 2.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.12 } }}
                    transition={SPRING_POP}
                    className={`text-outline leading-none ${big ? 'text-[11rem] [-webkit-text-stroke:14px_var(--color-ink)]' : 'text-8xl [-webkit-text-stroke:9px_var(--color-ink)]'}`}
                    style={{ color: stage.k === 'go' ? 'var(--color-go)' : '#fff' }}
                  >
                    {stage.k === 'go' ? th.game.go : stage.n}
                  </motion.span>
                )}
                {stage.k === 'card' && (
                  <motion.span key="ready" initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} className="text-xl font-semibold text-white">
                    {th.game.getReady}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Intro for the feed's current question (keyed per question), or nothing outside QUESTION. */
export function RoundIntro({ feed, big }: { feed: FeedState; big?: boolean }) {
  const q = feed.question;
  if (feed.phase !== 'QUESTION' || !q) return null;
  return (
    <QuestionIntro
      key={q.questionId}
      startsAt={clock.toLocal(q.startsAt)}
      index={q.index}
      total={q.total}
      paused={q.paused}
      big={big}
    />
  );
}

/** True until the question's startsAt (local clock) passes. Re-renders once when it does. */
export function useBeforeStart(startsAt: number | undefined, paused?: boolean) {
  const [before, setBefore] = useState(() => startsAt !== undefined && Date.now() < startsAt);
  useEffect(() => {
    if (startsAt === undefined) return setBefore(false);
    const left = startsAt - Date.now();
    setBefore(left > 0);
    if (left <= 0 || paused) return;
    const t = window.setTimeout(() => setBefore(false), left);
    return () => window.clearTimeout(t);
  }, [startsAt, paused]);
  return before;
}
