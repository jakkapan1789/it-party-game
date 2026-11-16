import type { CSSProperties, ReactNode } from 'react';
import { quizFrameAUrl, quizFrameBUrl } from '../../lobby/assets';

// Per frame: where the picture window and the magnifier sit, in % of the trimmed art (806×828 / 809×827).
// win = left, top, right, bottom insets of the window; mag = magnifier centre x, y and diameter (as % of width).
const FRAMES = [
  { url: quizFrameAUrl, w: 806, h: 828, win: [7.69, 16.67, 7.32, 14.01], mag: [84.24, 20.89, 17.87] },
  { url: quizFrameBUrl, w: 809, h: 827, win: [7.42, 17.17, 7.54, 14.39], mag: [83.81, 21.04, 17.8] },
] as const;

interface Props {
  /** 0 = frame "A", 1 = frame "B". */
  index: number;
  /** '', 'is-selected', 'is-correct' or 'is-wrong': drawn as a glow around the frame (see index.css). */
  state?: string;
  /** The picture (and anything that belongs inside the window). */
  children: ReactNode;
  /** Laid over the whole card (hit areas, badges…). */
  overlay?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * "Ornate A / B quiz frame": gold-and-red card with the A/B badge and a magnifier painted in. The artwork's cream
 * window was made transparent, so the picture sits under the art and the corner fretwork lies over it. The card
 * is sized by its parent's width; the magnifier's position is exposed to CSS for the zoom hit area.
 */
export function QuizFrame({ index, state = '', children, overlay, className = '', style }: Props) {
  const f = FRAMES[index % 2];
  const vars = {
    '--frame': `url(${f.url})`,
    '--ratio': `${f.w} / ${f.h}`,
    '--wl': `${f.win[0]}%`,
    '--wt': `${f.win[1]}%`,
    '--wr': `${f.win[2]}%`,
    '--wb': `${f.win[3]}%`,
    '--mx': `${f.mag[0] - f.mag[2] / 2}%`,
    '--my': `${f.mag[1] - (f.mag[2] * f.w) / f.h / 2}%`, // diameter is a share of the width; convert to a share of the height
    '--md': `${f.mag[2]}%`,
    ...style,
  } as CSSProperties;
  return (
    <div className={`quiz-card ${state} ${className}`} style={vars}>
      <div className="quiz-window">{children}</div>
      <span aria-hidden className="quiz-art" />
      {overlay}
    </div>
  );
}
