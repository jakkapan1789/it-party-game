import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PickImageQuestionView, PickImageRevealView } from '@ng/shared';
import type { HostViewProps } from '../../core/GameModule';
import { clock } from '../../lib/clock';
import { sfx } from '../../lib/sfx';
import { th } from '../../i18n/th';
import { Card, CountUp, PromptBanner, SPRING_POP, TimerBar } from '../../design';
import { QuizFrame } from './QuizFrame';
import { useBeforeStart } from '../../core/QuestionIntro';

const IMG = 'min(var(--host-card-h, 40vh), 32vw)'; // card width; the frame is ~1.03× as tall. Smaller on short screens (index.css)
// Reveal timeline (seconds): images shake under a drumroll, then the verdict, then the bars grow.
const R = { verdict: 1.0, bars: 1.4 };

export default function HostView({ feed }: HostViewProps) {
  const revealing = !!(feed.phase === 'REVEAL' && feed.reveal);
  const view = (revealing ? feed.reveal!.view : feed.question?.view) as (PickImageQuestionView & Partial<PickImageRevealView>) | undefined;
  const qid = (feed.reveal ?? feed.question)?.questionId;
  const verdict = useVerdict(revealing, qid);
  // question text and pictures stay hidden through the 3·2·1 lead-in
  const beforeStart = useBeforeStart(feed.question && !revealing ? clock.toLocal(feed.question.startsAt) : undefined, feed.question?.paused);
  if (!view) return null;
  const q = feed.question;
  const answered = feed.answerCount;
  const dist = view.distribution;
  const maxCount = Math.max(1, ...Object.values(dist ?? {}), view.noAnswer ?? 0);
  const total = dist ? Object.values(dist).reduce((a, b) => a + b, 0) + (view.noAnswer ?? 0) : 0;

  return (
    <div className="flex flex-1 flex-col items-center gap-5 px-6">
      <PromptBanner text={view.prompt} host hidden={beforeStart} />

      {!revealing && q && (
        <div className="w-full max-w-3xl space-y-3">
          <TimerBar endsAt={clock.toLocal(q.endsAt)} durationMs={q.limitMs} frozenLeftMs={q.paused ? q.remainingMs : undefined} />
          {q.paused && <p className="text-center text-3xl font-semibold text-white [text-shadow:0_2px_0_var(--color-ink)]">⏸ {th.admin.paused}</p>}
          <AnswerMeter answered={answered?.answered ?? 0} total={answered?.total ?? 0} />
        </div>
      )}

      <div className="flex items-start justify-center gap-10 transition-opacity duration-300" style={{ opacity: beforeStart ? 0 : 1 }}>
        {view.images.map((img, i) => {
          const isCorrect = img.id === view.correctImageId;
          const n = dist?.[img.id] ?? 0;
          return (
            <div key={img.id} className="flex flex-col items-center gap-3">
              <motion.div
                style={{ width: IMG }}
                animate={
                  !revealing
                    ? { x: 0, scale: 1 }
                    : !verdict
                      ? { x: [0, -5, 5, -5, 5, 0], scale: 1 }
                      : isCorrect
                        ? { x: 0, scale: [1, 1.12, 1.05] }
                        : { x: 0, scale: 0.95 }
                }
                transition={!verdict && revealing ? { x: { duration: 0.35, repeat: Infinity } } : { duration: 0.45 }}
              >
                <QuizFrame index={i} state={verdict && isCorrect ? 'is-correct' : ''}>
                  <img src={img.src} alt="" className="size-full object-cover" />
                  {/* solid shade for the wrong picture instead of transparency, so the scene never shows through */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[#0B0626] transition-opacity duration-500"
                    style={{ opacity: revealing && verdict && !isCorrect ? 0.6 : 0 }}
                  />
                </QuizFrame>
              </motion.div>
              {revealing && (
                <div style={{ width: IMG }} className="space-y-1">
                  <div className="timer-track h-9 overflow-hidden rounded-full">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: n / maxCount }}
                      transition={{ delay: R.bars, duration: 0.9, ease: 'easeOut' }}
                      className={`h-full origin-left ${isCorrect ? 'bg-go' : 'bg-alt'}`}
                    />
                  </div>
                  <p className="text-center font-display text-3xl text-white [text-shadow:0_2px_0_var(--color-ink)]">
                    <CountUp value={n} from={0} delayMs={R.bars * 1000} durationMs={900} /> {th.game.people}
                    {total > 0 && <span className="ml-2 text-xl opacity-80">({Math.round((n / total) * 100)}%)</span>}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {revealing && (view.noAnswer ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: R.bars + 0.6 }}>
          <Card className="py-2 text-lg font-semibold">{th.game.noAnswerCount(view.noAnswer!)}</Card>
        </motion.div>
      )}
    </div>
  );
}

/** false during the drumroll after a reveal arrives, true once the answer is shown. */
export function useVerdict(revealing: boolean, qid: string | undefined) {
  const [verdict, setVerdict] = useState(false);
  useEffect(() => {
    setVerdict(false);
    if (!revealing) return;
    // sounds go through timers so an effect cleanup (StrictMode remount) cancels them
    const roll = window.setTimeout(() => sfx.drumroll(R.verdict * 1000 - 100), 0);
    const t = window.setTimeout(() => {
      setVerdict(true);
      sfx.reveal();
    }, R.verdict * 1000);
    return () => {
      window.clearTimeout(roll);
      window.clearTimeout(t);
    };
  }, [revealing, qid]);
  return verdict;
}

/** "ตอบแล้ว 37/42" with a filling bar; flashes "ครบแล้ว!" when everyone is in. */
export function AnswerMeter({ answered, total }: { answered: number; total: number }) {
  const all = total > 0 && answered >= total;
  return (
    <div className="mx-auto w-full max-w-xl space-y-1">
      <div className="flex items-baseline justify-center gap-3 font-display text-white [text-shadow:0_3px_0_var(--color-ink)]">
        <span className="text-2xl">✍️ {th.admin.answeredLabel}</span>
        <span className="text-5xl">
          <CountUp value={answered} durationMs={300} />
        </span>
        <span className="text-3xl opacity-80">/ {total}</span>
      </div>
      <div className="timer-track relative h-5 overflow-hidden rounded-full">
        <motion.div
          animate={{ scaleX: total ? answered / total : 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          className="h-full origin-left bg-go"
        />
      </div>
      <AnimatePresence>
        {all && (
          <motion.p
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING_POP}
            className="text-outline text-center text-4xl"
            style={{ color: 'var(--color-go)' }}
          >
            {th.admin.allAnswered}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
