import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { EndedPayload, LeaderboardEntry, LeaderboardPayload, Phase, PlayerPublic } from '@ng/shared';
import { th } from '../i18n/th';
import { BlossomPanel, Button3D, CountUp, PageBanner, RankBadge, SPRING_POP, fx } from '../design';
import { scorePillUrl } from '../lobby/assets';
import { sfx } from '../lib/sfx';
import { Avatar } from '../mascot/Avatar';

const trend = (e: LeaderboardEntry) => {
  if (e.prevRank == null || e.prevRank === e.rank) return null;
  return e.prevRank > e.rank ? { sym: '▲', cls: 'text-go' } : { sym: '▼', cls: 'text-stop' };
};

/** Starts in last board's order, then re-sorts so rows visibly swap places. */
export function HostLeaderboard({ board }: { board: LeaderboardPayload }) {
  const byPrev = useMemo(
    () => [...board.top].sort((a, b) => (a.prevRank ?? 999) - (b.prevRank ?? 999) || a.rank - b.rank),
    [board],
  );
  const [order, setOrder] = useState(byPrev);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setOrder(byPrev);
    setSettled(false);
    const t = setTimeout(() => {
      setOrder([...board.top].sort((a, b) => a.rank - b.rank));
      setSettled(true);
    }, 900);
    return () => clearTimeout(t);
  }, [board, byPrev]);

  // Biggest climber since the last board (only if someone actually moved up).
  const climber = useMemo(() => {
    let best: { id: string; by: number } | null = null;
    for (const e of board.top) {
      const by = e.prevRank == null ? 0 : e.prevRank - e.rank;
      if (by > 0 && (!best || by > best.by)) best = { id: e.playerId, by };
    }
    return best?.id;
  }, [board]);

  return (
    <div className={`host-lb mx-auto flex w-full flex-1 flex-col gap-3 px-6 ${order.length > 5 ? 'max-w-[min(100%,90rem)]' : 'max-w-[min(100%,56rem)]'}`}>
      <PageBanner className="is-host">{th.game.leaderboard}</PageBanner>
      <BlossomPanel>
      <ul className={`host-lb-list ${order.length > 5 ? 'is-two' : ''}`}>
        {order.map((e) => {
          const t = trend(e);
          const hot = settled && e.playerId === climber;
          return (
            <motion.li
              layout
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              key={e.playerId}
              className={`lr flex items-center ${hot ? 'is-mine' : ''}`}
            >
              <RankBadge rank={e.rank} />
              <Avatar id={e.avatarId} size={48} />
              <span className="lr-name min-w-0 flex-1 truncate">{e.nickname}</span>
              {hot && (
                <motion.span
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: -6 }}
                  transition={SPRING_POP}
                  className="shrink-0 rounded-full border-[3px] border-ink bg-stop px-3 py-0.5 font-display text-lg text-white"
                >
                  🚀 {th.admin.biggestClimb}
                </motion.span>
              )}
              {t && <span className={`text-2xl ${t.cls}`}>{t.sym}</span>}
              <span className="score-pill" style={{ backgroundImage: `url(${scorePillUrl})` }}>{e.score.toLocaleString()}</span>
            </motion.li>
          );
        })}
      </ul>
      </BlossomPanel>
    </div>
  );
}

// Podium reveal (ms): pillars rise, then 3rd, 2nd, a drumroll, and 1st with the crown.
const P = { place3: 1000, place2: 2200, roll: 2900, place1: 4500 };
const SLOT_ORDER = [1, 0, 2]; // columns left→right show list positions 2nd, 1st, 3rd
const PILLAR_H = ['h-[min(22rem,24vh)]', 'h-[min(16rem,18vh)]', 'h-[min(12rem,13.5vh)]'];

export function HostEnded({ ended }: { ended: EndedPayload }) {
  // How many places are uncovered, counting from 3rd: 0 → none, 3 → all.
  const [shown, setShown] = useState(0);
  const places = Math.min(3, ended.top.length);

  useEffect(() => {
    setShown(0);
    const at = (ms: number, f: () => void) => window.setTimeout(f, ms);
    const timers = [
      at(P.place3, () => {
        setShown((n) => Math.max(n, 1));
        if (places >= 3) sfx.reveal();
      }),
      at(P.place2, () => {
        setShown((n) => Math.max(n, 2));
        if (places >= 2) sfx.reveal();
      }),
      at(P.roll, () => sfx.drumroll(P.place1 - P.roll - 100)),
      at(P.place1, () => {
        setShown(3);
        sfx.fanfare();
        fx.win(5000);
      }),
    ];
    return () => {
      timers.forEach(clearTimeout);
      fx.reset();
    };
  }, [ended, places]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-[2vh] px-6">
      <PageBanner className="is-host">{th.game.gameOver}</PageBanner>
      <div className="flex flex-1 items-end justify-center gap-6">
        {SLOT_ORDER.filter((pos) => pos < places).map((pos) => {
          const e = ended.top[pos];
          // position 2 (3rd) is uncovered first, position 0 (1st) last
          const visible = shown >= 3 - pos;
          return (
            <div key={e.playerId} className="flex w-[clamp(14rem,22vh,20rem)] flex-col items-center gap-2">
              <div className="relative flex h-[min(18rem,27vh)] flex-col items-center justify-end gap-1">
                <AnimatePresence mode="wait">
                  {visible ? (
                    <motion.div
                      key="who"
                      initial={{ scale: 0.3, opacity: 0, y: 30 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={SPRING_POP}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="podium-who">
                        <Avatar id={e.avatarId} size={96} />
                        <motion.span
                          className="podium-medal"
                          initial={pos === 0 ? { y: -260, rotate: -30 } : { scale: 0 }}
                          animate={pos === 0 ? { y: 0, rotate: 0 } : { scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.25 }}
                        >
                          <RankBadge rank={e.rank} size="64px" />
                        </motion.span>
                      </div>
                      <p className="podium-name">{e.nickname}</p>
                    </motion.div>
                  ) : (
                    <motion.span key="q" exit={{ scale: 0, opacity: 0 }} className="text-outline text-8xl opacity-80">
                      ?
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.2 + (2 - pos) * 0.12 }}
                className={`${PILLAR_H[pos]} podium-pillar is-${pos + 1} w-full origin-bottom`}
              >
                <p className="podium-rank">{e.rank}</p>
                {visible && (
                  <span className="score-pill mx-auto" style={{ backgroundImage: `url(${scorePillUrl})` }}>
                    <CountUp value={e.score} from={0} durationMs={800} />
                  </span>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
      <p className="text-xl font-semibold text-white [text-shadow:0_2px_0_var(--color-ink)]">{th.game.outOf(ended.playerCount)}</p>
    </div>
  );
}

interface ControlsProps {
  phase: Phase;
  index: number;
  total: number;
  isLast: boolean;
  playerCount: number;
  paused: boolean;
  onShowPlayers: () => void;
  on: { pause(): void; resume(): void; reveal(): void; showLeaderboard(): void; next(): void; end(): void; restart(): void; newRoom(): void; report(): void };
}

/** Bottom bar: one primary button that always advances to the next phase. */
export function HostControls({ phase, index, total, isLast, playerCount, paused, onShowPlayers, on }: ControlsProps) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  const inGame = phase !== 'LOBBY' && phase !== 'ENDED';

  return (
    <footer className="night-bar night-bar-bottom z-10 mt-2 flex flex-wrap items-center gap-3 px-6 pb-3 pt-5" style={{ position: 'sticky', bottom: 0 }}>
      <div className="gold-trim absolute inset-x-0 top-0" />
      {phase !== 'LOBBY' && phase !== 'ENDED' && (
        <span className="gold-pill">{th.admin.question(index + 1, total)}</span>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {phase !== 'LOBBY' && (
          <Button3D variant="alt" className="!text-base" onClick={onShowPlayers}>{th.admin.playersBtn(playerCount)}</Button3D>
        )}
        {inGame && (
          <Button3D variant="stop" className="!text-base" onClick={() => (confirming ? on.end() : setConfirming(true))}>
            {confirming ? th.admin.confirmFinish : th.admin.finish}
          </Button3D>
        )}
        {phase === 'QUESTION' && (
          <>
            <Button3D variant="alt" onClick={paused ? on.resume : on.pause}>{paused ? `▶ ${th.admin.resume}` : `⏸ ${th.admin.pause}`}</Button3D>
            <Button3D variant="orange" onClick={on.reveal}>{th.admin.reveal}</Button3D>
          </>
        )}
        {phase === 'REVEAL' && (
          <>
            <Button3D variant="alt" onClick={on.next}>{isLast ? th.admin.finish : th.admin.next}</Button3D>
            <Button3D onClick={on.showLeaderboard}>{th.admin.showLeaderboard}</Button3D>
          </>
        )}
        {phase === 'LEADERBOARD' && <Button3D onClick={on.next}>{isLast ? th.admin.finish : th.admin.next}</Button3D>}
        {phase === 'ENDED' && (
          <>
            <Button3D variant="alt" onClick={on.report}>{th.report.open2}</Button3D>
            <Button3D onClick={on.restart}>{th.admin.playAgain}</Button3D>
            <Button3D variant="orange" onClick={on.newRoom}>{th.admin.newRoom}</Button3D>
          </>
        )}
      </div>
    </footer>
  );
}
