import type { EndedPayload, LeaderboardEntry, LeaderboardPayload } from '@ng/shared';
import { th } from '../i18n/th';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BottomAction, Card, ExitButton, LeaderFrame, NoticeBanner, RankBadge, WaitBanner, CountUp, ScreenTitle, SPRING_POP, SPRING_SOFT, fadeUp, fx, staggerChildren } from '../design';
import { sfx } from '../lib/sfx';
import { firstTime } from '../lib/once';
import { Avatar } from '../mascot/Avatar';
import { scorePillUrl } from '../lobby/assets';
import type { FeedState } from './useGameFeed';

/** Shown to a player who joined after the game started: they sit out until the next question, or can leave. */
export function WaitingScreen({ onLeave }: { onLeave: () => void }) {
  return (
    <div className="my-auto flex flex-col items-center gap-3">
      <NoticeBanner title={th.game.waitingJoinTitle} sub={th.game.waitingJoinSub} />
      <ExitButton onClick={onLeave} />
    </div>
  );
}

const trend = (prev: number | null | undefined, now: number) =>
  prev == null || prev === now ? null : prev > now ? { sym: `▲${prev - now}`, cls: 'bg-go' } : { sym: `▼${now - prev}`, cls: 'bg-stop' };

function TrendChip({ prev, now }: { prev: number | null | undefined; now: number }) {
  const t = trend(prev, now);
  if (!t) return null;
  return <span className={`rounded-full border-2 border-ink px-1.5 font-display text-xs leading-5 text-white ${t.cls}`}>{t.sym}</span>;
}

function Row({ e, mine }: { e: LeaderboardEntry; mine: boolean }) {
  return (
    <div
      data-mine={mine ? '' : undefined}
      className={`lr flex items-center gap-2 ${mine ? 'is-mine' : ''}`}
    >
      <RankBadge rank={e.rank} />
      <Avatar id={e.avatarId} size={36} />
      <span className="lr-name min-w-0 flex-1 truncate">{e.nickname}</span>
      <TrendChip prev={e.prevRank} now={e.rank} />
      <span className="score-pill" style={{ backgroundImage: `url(${scorePillUrl})` }}>
        {e.score.toLocaleString()}
      </span>
    </div>
  );
}

const ROW_STAGGER = 0.12;

/** Rows land bottom-up (5th first, 1st last) so the top spot is the payoff. */
export function LeaderboardScreen({ board, myId, myPrevRank }: { board: LeaderboardPayload; myId?: string; myPrevRank?: number | null }) {
  const top = board.top.slice(0, 5);
  const mineInTop = top.some((e) => e.playerId === myId);
  return (
    <>
      <ScreenTitle>{th.game.leaderboard}</ScreenTitle>
      <Card className="space-y-2">
        <ul className="space-y-2">
          {top.map((e, i) => (
            <motion.li
              key={e.playerId}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SPRING_SOFT, delay: (top.length - 1 - i) * ROW_STAGGER }}
            >
              <Row e={e} mine={e.playerId === myId} />
            </motion.li>
          ))}
        </ul>
        {board.you && !mineInTop && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: top.length * ROW_STAGGER + 0.2 }}
            className="flex items-center justify-center gap-2 border-t-2 border-dashed border-[#5B3A29] pt-2 font-semibold"
          >
            {th.game.you}: #{board.you.rank} · {board.you.score.toLocaleString()} {th.game.score}
            <TrendChip prev={myPrevRank} now={board.you.rank} />
          </motion.div>
        )}
      </Card>
      <BottomAction>
        <WaitBanner>{th.game.waitNext}</WaitBanner>
      </BottomAction>
    </>
  );
}

// Ended timeline (seconds): lead-in text → big rank + fanfare → score line → winners.
const E = { rank: 0.8, score: 1.3, winners: 1.7 };

export function EndedScreen({ ended, myId }: { ended: EndedPayload; myId?: string }) {
  const you = ended.you;

  useEffect(() => {
    if (!you) return;
    // firstTime is checked when the timer fires (not before) so StrictMode's mount→unmount→mount keeps it
    const t = window.setTimeout(() => {
      if (!firstTime(`ended:${myId}`)) return;
      sfx.fanfare();
      if (you.rank <= 3) fx.win(3000);
      else fx.sprinkle();
    }, E.rank * 1000);
    return () => {
      window.clearTimeout(t);
      fx.reset();
    };
  }, [you, myId]);

  const rows = ended.top;
  const listRef = useRef<HTMLUListElement>(null);

  // A long list: after it has appeared, scroll your own row to the middle of the board.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const board = listRef.current?.parentElement;
      const mine = listRef.current?.querySelector<HTMLElement>('[data-mine]');
      if (!board || !mine) return;
      const m = mine.getBoundingClientRect();
      const b = board.getBoundingClientRect();
      board.scrollTo({ top: board.scrollTop + (m.top - b.top) - board.clientHeight / 2 + m.height / 2, behavior: 'smooth' });
    }, E.winners * 1000 + 900);
    return () => window.clearTimeout(t);
  }, [myId, rows.length]);

  return (
    <motion.div variants={staggerChildren(Math.max(25, Math.min(120, 1800 / Math.max(1, rows.length))), E.winners * 1000)} initial="hidden" animate="show" className="flex min-h-0 flex-1 flex-col">
      <LeaderFrame>
        <ul ref={listRef} className="leader-list">
          {rows.map((e) => (
            <motion.li key={e.playerId} variants={fadeUp}>
              <Row e={{ ...e, prevRank: null }} mine={e.playerId === myId} />
            </motion.li>
          ))}
        </ul>
      </LeaderFrame>
    </motion.div>
  );
}
