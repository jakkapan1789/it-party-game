import type { ReactNode } from 'react';
import { motion, type MotionProps } from 'framer-motion';
import { resultFrameUrl } from '../lobby/assets';

interface Props extends MotionProps {
  /** Big text on the red ribbon: correct / wrong / no answer. */
  headline: ReactNode;
  tone: 'correct' | 'wrong' | 'none';
  /** The "+850 points" line in the cream body. */
  points: ReactNode;
  /** Small extra next to the points (streak badge). */
  extra?: ReactNode;
  /** Text in the crown pill at the bottom (rank). */
  pill: ReactNode;
  /** Absolutely-positioned effects (floating score…), laid over the ribbon. */
  overlay?: ReactNode;
}

/**
 * Result card on the "gold-and-red game UI frame": red ribbon with three stars for the verdict, cream body for the
 * points, and a crown pill for the rank. The art has no text, so each slot is real text positioned in % of the art
 * (trimmed 1709×858) and sized in cqw, so it all scales with the card.
 */
export function ResultFrame({ headline, tone, points, extra, pill, overlay, ...motionProps }: Props) {
  return (
    <motion.div {...motionProps} className="result-frame" style={{ backgroundImage: `url(${resultFrameUrl})` }}>
      <div className={`rf-headline is-${tone}`}>{headline}</div>
      <div className="rf-points">
        {points}
        {extra && <span className="rf-extra">{extra}</span>}
      </div>
      <div className="rf-pill">{pill}</div>
      {overlay}
    </motion.div>
  );
}
