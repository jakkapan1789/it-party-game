import { CountUp } from './CountUp';
import { scoreboardFrameUrl } from '../lobby/assets';

interface StatBarProps {
  score: number;
  index?: number;
  total?: number;
  /** Hold the score roll this long (lets the reveal card land first). */
  delayMs?: number;
  className?: string;
}

/**
 * In-game status bar on the ornate scoreboard frame: score in the star slot, question x/y in the "?" slot
 * (the artwork has exactly those two). Text is positioned over the frame's purple slots in % of the art, and
 * sized in cqw, so everything scales with the frame.
 */
export function StatBar({ score, index, total, delayMs = 0, className = '' }: StatBarProps) {
  return (
    <div className={`scoreboard-wrap ${className}`}>
      <div className="scoreboard" style={{ backgroundImage: `url(${scoreboardFrameUrl})` }}>
        <div className="sb-slot sb-score" aria-label="score">
          <CountUp value={score} delayMs={delayMs} />
        </div>
        <div className="sb-slot sb-count" aria-label="question">
          {index !== undefined && total !== undefined ? `${index}/${total}` : '–'}
        </div>
      </div>
    </div>
  );
}
