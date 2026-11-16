import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { PickImageQuestionView, PickImageRevealView } from '@ng/shared';
import type { PlayerViewProps } from '../../core/GameModule';
import { clock } from '../../lib/clock';
import { sfx } from '../../lib/sfx';
import { th } from '../../i18n/th';
import { BannerButton, BottomAction, Card, CountUp, FloatingScore, PromptBanner, ResultFrame, WaitBanner, SlideBanner, SPRING_POP, StatusPill, StreakBadge, TimerBar, fx, popIn, staggerChildren } from '../../design';
import { firstTime } from '../../lib/once';
import { ImageChoice, ZoomOverlay, type Mark } from './ImageChoice';
import { useBeforeStart } from '../../core/QuestionIntro';

const LABELS = ['A', 'B', 'C', 'D'];

export default function PlayerView({ feed, submitAnswer }: PlayerViewProps) {
  if (feed.phase === 'REVEAL' && feed.reveal) return <Reveal feed={feed} />;
  if (feed.phase === 'QUESTION' && feed.question) {
    // keyed so selection/lock state resets for every question
    return <Question key={feed.question.questionId} feed={feed} submitAnswer={submitAnswer} />;
  }
  return null;
}

function Question({ feed, submitAnswer }: PlayerViewProps) {
  const q = feed.question!;
  const view = q.view as PickImageQuestionView;
  const endsAt = clock.toLocal(q.endsAt);
  const [selected, setSelected] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [expired, setExpired] = useState(() => Date.now() >= endsAt);
  const [hint, setHint] = useState(false);
  const paused = !!q.paused;
  const beforeStart = useBeforeStart(clock.toLocal(q.startsAt), paused);
  const expiredOnMount = useRef(expired);

  useEffect(() => {
    if (paused) return; // clock is frozen; the new deadline arrives on resume
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

  const select = (id: string) => {
    if (id !== selected) sfx.click();
    setSelected(id);
  };
  const submit = () => {
    if (!selected || frozen) return;
    setSent(true);
    sfx.lock();
    submitAnswer({ questionId: q.questionId, imageId: selected });
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <TimerBar endsAt={endsAt} durationMs={q.limitMs} frozenLeftMs={paused ? q.remainingMs : undefined} />
      <SlideBanner show={paused}>⏸ {th.game.pausedBanner}</SlideBanner>
      <SlideBanner show={hint && !paused}>{th.game.notTaken}</SlideBanner>
      <PromptBanner text={view.prompt} hidden={beforeStart} />
      <motion.div
        variants={staggerChildren(70)}
        initial="hidden"
        animate={beforeStart ? 'hidden' : 'show'}
        className="fit-grid my-auto grid grid-cols-2 gap-4"
      >
        {view.images.map((img, i) => (
          <motion.div key={img.id} variants={popIn}>
            <ImageChoice
              src={img.src}
              index={i}
              priority
              selected={chosen === img.id}
              locked={locked && chosen === img.id}
              dimmed={chosen != null && chosen !== img.id}
              disabled={frozen}
              onSelect={() => select(img.id)}
              onZoom={() => setZoom(img.src)}
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
          <BannerButton disabled={!selected} onClick={submit}>{selected ? th.game.submitPick(LABELS[view.images.findIndex((i) => i.id === selected)]) : th.game.pickPrompt}</BannerButton>
        )}
      </BottomAction>
      <ZoomOverlay src={zoom} onClose={() => setZoom(null)} />
    </div>
  );
}

// Reveal timeline (seconds after the reveal arrives) — see docs/GAME_FEEL_PLAN.md §3.
const T = { correctPulse: 0.4, card: 0.7, points: 0.9, streak: 1.1 };

function Reveal({ feed }: { feed: PlayerViewProps['feed'] }) {
  const r = feed.reveal!;
  const view = r.view as PickImageRevealView;
  const y = r.yourResult;
  const [zoom, setZoom] = useState<string | null>(null);
  const picked = y?.answer as string | null | undefined;

  const markOf = (id: string): Mark =>
    id === view.correctImageId ? 'correct' : id === picked ? 'wrong' : null;

  const prev = feed.me.prevRank;
  const climbed = !!y && prev != null && y.rank < prev;

  // Sound / haptics / confetti land with the result card, once per question (not on replay).
  useEffect(() => {
    if (!y?.answered) return;
    const t = window.setTimeout(() => {
      if (!firstTime(`reveal:${r.questionId}`)) return; // checked on fire so StrictMode's double mount keeps it
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
      <div className="fit-grid grid grid-cols-2 gap-4">
        {view.images.map((img) => {
          const isCorrect = img.id === view.correctImageId;
          return (
            <motion.div
              key={img.id}
              initial={{ opacity: 1, scale: 1 }}
              animate={isCorrect ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={isCorrect ? { delay: T.correctPulse, duration: 0.45 } : { duration: 0.3 }}
            >
              <ImageChoice src={img.src} index={view.images.indexOf(img)} mark={markOf(img.id)} dimmed={!isCorrect && img.id !== picked} disabled onZoom={() => setZoom(img.src)} />
            </motion.div>
          );
        })}
      </div>

      {y && (
        <ResultFrame
          {...cardMotion}
          tone={y.correct ? 'correct' : y.answered ? 'wrong' : 'none'}
          headline={headline}
          points={
            y.points > 0 ? (
              <span>
                +<CountUp value={y.points} from={0} delayMs={T.points * 1000} /> {th.game.points}
              </span>
            ) : (
              <span>{th.game.zeroPoints}</span>
            )
          }
          extra={y.streak >= 2 ? <StreakBadge streak={y.streak} delay={T.streak} /> : undefined}
          pill={`${th.game.rankShort} #${y.rank}`}
          overlay={
            y.correct && y.points > 0 ? (
              <div className="rf-overlay">
                <FloatingScore key={r.questionId} value={y.points} delay={T.points} />
              </div>
            ) : undefined
          }
        />
      )}
      <BottomAction>
        <WaitBanner>{th.game.waitNext}</WaitBanner>
      </BottomAction>
      <ZoomOverlay src={zoom} onClose={() => setZoom(null)} />
    </div>
  );
}
