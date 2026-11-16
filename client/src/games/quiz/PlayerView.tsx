import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { QuizQuestionView, QuizRevealView } from '@ng/shared';
import type { PlayerViewProps } from '../../core/GameModule';
import { clock } from '../../lib/clock';
import { sfx } from '../../lib/sfx';
import { th } from '../../i18n/th';
import { BannerButton, BottomAction, CountUp, FloatingScore, PromptBanner, ResultFrame, SlideBanner, SPRING_POP, StatusPill, StreakBadge, TimerBar, WaitBanner, fx, popIn, staggerChildren } from '../../design';
import { firstTime } from '../../lib/once';
import { useBeforeStart } from '../../core/QuestionIntro';
import { ChoiceButton, type ChoiceMark } from './ChoiceButton';

const LABELS = ['A', 'B', 'C', 'D'];

export default function PlayerView({ feed, submitAnswer }: PlayerViewProps) {
  if (feed.phase === 'REVEAL' && feed.reveal) return <Reveal feed={feed} />;
  if (feed.phase === 'QUESTION' && feed.question) return <Question key={feed.question.questionId} feed={feed} submitAnswer={submitAnswer} />;
  return null;
}

function Question({ feed, submitAnswer }: PlayerViewProps) {
  const q = feed.question!;
  const view = q.view as QuizQuestionView;
  const endsAt = clock.toLocal(q.endsAt);
  const [selected, setSelected] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [expired, setExpired] = useState(() => Date.now() >= endsAt);
  const [hint, setHint] = useState(false);
  const paused = !!q.paused;
  const beforeStart = useBeforeStart(clock.toLocal(q.startsAt), paused);
  const expiredOnMount = useRef(expired);

  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => setExpired(true), Math.max(0, endsAt - Date.now()));
    return () => window.clearTimeout(t);
  }, [endsAt, paused]);

  // Server refused the answer: undo the optimistic lock.
  const rejected = feed.answerRejected;
  useEffect(() => {
    if (!rejected || feed.myAnswer != null) return;
    setSent(false);
    if (rejected === 'TOO_LATE') return setExpired(true);
    setHint(true);
    const t = window.setTimeout(() => setHint(false), 2500);
    return () => window.clearTimeout(t);
  }, [rejected, feed.myAnswer]);

  const locked = sent || feed.myAnswer != null;
  const chosen = (feed.myAnswer as string | null) ?? selected;
  const frozen = locked || expired || paused || beforeStart;

  useEffect(() => {
    if (expired && !locked && !expiredOnMount.current) sfx.buzzer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  const submit = () => {
    if (!selected || frozen) return;
    setSent(true);
    sfx.lock();
    submitAnswer({ questionId: q.questionId, choiceId: selected });
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TimerBar endsAt={endsAt} durationMs={q.limitMs} frozenLeftMs={paused ? q.remainingMs : undefined} />
      <SlideBanner show={paused}>⏸ {th.game.pausedBanner}</SlideBanner>
      <SlideBanner show={hint && !paused}>{th.game.notTaken}</SlideBanner>
      <PromptBanner text={view.prompt} hidden={beforeStart} />
      <motion.div variants={staggerChildren(70)} initial="hidden" animate={beforeStart ? 'hidden' : 'show'} className="qz-list my-auto">
        {view.choices.map((c, i) => (
          <motion.div key={c.id} variants={popIn}>
            <ChoiceButton
              index={i}
              text={c.text}
              selected={chosen === c.id}
              locked={locked && chosen === c.id}
              dimmed={chosen != null && chosen !== c.id}
              disabled={frozen}
              onSelect={() => setSelected(c.id)}
            />
          </motion.div>
        ))}
      </motion.div>
      <BottomAction>
        {locked ? (
          <StatusPill dots>{th.game.lockedWaiting}</StatusPill>
        ) : paused ? (
          <StatusPill tone="calm">{th.admin.paused}</StatusPill>
        ) : expired ? (
          <StatusPill tone="stop">{th.game.timesUp}</StatusPill>
        ) : (
          <BannerButton disabled={!selected} onClick={submit}>{selected ? th.game.submitPick(LABELS[view.choices.findIndex((c) => c.id === selected)]) : th.game.pickAnswer}</BannerButton>
        )}
      </BottomAction>
    </div>
  );
}

// Reveal timeline (seconds after the reveal arrives), same as the picture game.
const T = { correctPulse: 0.4, card: 0.7, points: 0.9, streak: 1.1 };

function Reveal({ feed }: { feed: PlayerViewProps['feed'] }) {
  const r = feed.reveal!;
  const view = r.view as QuizRevealView;
  const y = r.yourResult;
  const picked = y?.answer as string | null | undefined;
  const markOf = (id: string): ChoiceMark => (id === view.correctChoiceId ? 'correct' : id === picked ? 'wrong' : null);
  const prev = feed.me.prevRank;
  const climbed = !!y && prev != null && y.rank < prev;

  useEffect(() => {
    if (!y?.answered) return;
    const t = window.setTimeout(() => {
      if (!firstTime(`reveal:${r.questionId}`)) return;
      if (y.correct) {
        sfx.correct();
        fx.correct();
      } else sfx.wrong();
      if (climbed) window.setTimeout(sfx.rankUp, (T.points - T.card + 0.3) * 1000);
    }, T.card * 1000);
    return () => window.clearTimeout(t);
  }, [r.questionId, y?.answered, y?.correct, climbed]);

  const headline = !y ? '' : y.correct ? th.game.correct : y.answered ? th.game.wrong : th.game.noAnswer;
  const cardMotion = y?.correct
    ? { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 }, transition: { ...SPRING_POP, delay: T.card } }
    : y?.answered
      ? { initial: { opacity: 0, x: 0 }, animate: { opacity: 1, x: [0, -8, 8, -5, 5, 0] }, transition: { delay: T.card, duration: 0.4 } }
      : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: T.card, duration: 0.3 } };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PromptBanner text={view.prompt} />
      <div className="qz-list is-reveal">
        {view.choices.map((c, i) => (
          <motion.div
            key={c.id}
            animate={c.id === view.correctChoiceId ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={c.id === view.correctChoiceId ? { delay: T.correctPulse, duration: 0.45 } : { duration: 0.3 }}
          >
            <ChoiceButton index={i} text={c.text} mark={markOf(c.id)} dimmed={c.id !== view.correctChoiceId && c.id !== picked} disabled />
          </motion.div>
        ))}
      </div>
      {y && (
        <ResultFrame
          {...cardMotion}
          tone={y.correct ? 'correct' : y.answered ? 'wrong' : 'none'}
          headline={headline}
          points={y.points > 0 ? <span>+<CountUp value={y.points} from={0} delayMs={T.points * 1000} /> {th.game.points}</span> : <span>{th.game.zeroPoints}</span>}
          extra={y.streak >= 2 ? <StreakBadge streak={y.streak} delay={T.streak} /> : undefined}
          pill={`${th.game.rankShort} #${y.rank}`}
          overlay={y.correct && y.points > 0 ? <div className="rf-overlay"><FloatingScore key={r.questionId} value={y.points} delay={T.points} /></div> : undefined}
        />
      )}
      <BottomAction>
        <WaitBanner>{th.game.waitNext}</WaitBanner>
      </BottomAction>
    </div>
  );
}
