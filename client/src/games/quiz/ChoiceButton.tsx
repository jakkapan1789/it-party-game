import { sfx } from '../../lib/sfx';

export type ChoiceMark = 'correct' | 'wrong' | null;
const LETTERS = ['A', 'B', 'C', 'D'];

interface Props {
  index: number;
  text: string;
  selected?: boolean;
  locked?: boolean;
  dimmed?: boolean;
  disabled?: boolean;
  mark?: ChoiceMark;
  /** Host projector: bigger, not a button. */
  host?: boolean;
  onSelect?: () => void;
}

/** One answer option: gold-rimmed cream panel with a lettered badge. Used on phones (tap) and on the host screen (display only). */
export function ChoiceButton({ index, text, selected, locked, dimmed, disabled, mark, host, onSelect }: Props) {
  const cls = `qz-choice ${host ? 'is-host' : ''} ${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''} ${dimmed ? 'is-dimmed' : ''} ${mark ? `is-${mark}` : ''}`;
  const body = (
    <>
      <span className="qz-letter">{LETTERS[index]}</span>
      <span className="qz-text">{text}</span>
      {mark === 'correct' && <span className="qz-mark" aria-hidden>✓</span>}
      {mark === 'wrong' && <span className="qz-mark" aria-hidden>✕</span>}
    </>
  );
  if (host) return <div className={cls}>{body}</div>;
  return (
    <button type="button" className={cls} disabled={disabled} aria-pressed={selected} onClick={() => { if (!disabled) { sfx.click(); onSelect?.(); } }}>
      {body}
    </button>
  );
}
