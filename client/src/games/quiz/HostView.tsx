import { motion } from 'framer-motion';
import type { QuizQuestionView, QuizRevealView } from '@ng/shared';
import type { HostViewProps } from '../../core/GameModule';
import { clock } from '../../lib/clock';
import { th } from '../../i18n/th';
import { Card, CountUp, PromptBanner, TimerBar } from '../../design';
import { useBeforeStart } from '../../core/QuestionIntro';
import { AnswerMeter, useVerdict } from '../pickImage/HostView';
import { ChoiceButton } from './ChoiceButton';

const R = { verdict: 1.0, bars: 1.4 };

export default function HostView({ feed }: HostViewProps) {
  const revealing = !!(feed.phase === 'REVEAL' && feed.reveal);
  const view = (revealing ? feed.reveal!.view : feed.question?.view) as (QuizQuestionView & Partial<QuizRevealView>) | undefined;
  const qid = (feed.reveal ?? feed.question)?.questionId;
  const verdict = useVerdict(revealing, qid);
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

      <div className="qz-host-grid w-full max-w-5xl transition-opacity duration-300" style={{ opacity: beforeStart ? 0 : 1 }}>
        {view.choices.map((c, i) => {
          const isCorrect = c.id === view.correctChoiceId;
          const n = dist?.[c.id] ?? 0;
          return (
            <motion.div key={c.id} animate={revealing && verdict ? (isCorrect ? { scale: [1, 1.05, 1.02] } : { scale: 0.97 }) : { scale: 1 }} transition={{ duration: 0.45 }} className="space-y-1">
              <ChoiceButton host index={i} text={c.text} mark={revealing && verdict ? (isCorrect ? 'correct' : null) : null} dimmed={revealing && verdict && !isCorrect} />
              {revealing && (
                <div className="flex items-center gap-3">
                  <div className="timer-track h-7 flex-1 overflow-hidden rounded-full">
                    <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: n / maxCount }} transition={{ delay: R.bars, duration: 0.9, ease: 'easeOut' }} className={`h-full origin-left ${isCorrect ? 'bg-go' : 'bg-alt'}`} />
                  </div>
                  <p className="min-w-[7ch] font-display text-2xl text-white [text-shadow:0_2px_0_var(--color-ink)]">
                    <CountUp value={n} from={0} delayMs={R.bars * 1000} durationMs={900} />
                    {total > 0 && <span className="ml-1 text-base opacity-80">({Math.round((n / total) * 100)}%)</span>}
                  </p>
                </div>
              )}
            </motion.div>
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
