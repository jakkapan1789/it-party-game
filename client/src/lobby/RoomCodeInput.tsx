import { useRef, useState, type ChangeEvent } from 'react';
import { ROOM_CODE_LENGTH } from '@ng/shared';
import { th } from '../i18n/th';
import { roomCodePanelUrl } from './assets';
import { shakeElement, useShakeOnInvalid } from './useLobbyMotion';

// Where the six boxes sit inside the panel artwork, as % of the trimmed image (2141×691).
// Measured on the OUTER edge of each box's purple border, so the focus ring lines up with it.
export const SLOT_X = [16.95, 28.68, 40.4, 52.13, 63.85, 75.57];
export const SLOT_W = 9.76;
export const SLOT_Y = 40.52;
export const SLOT_H = 30.25;

interface Props {
  value: string;
  onChange: (code: string) => void;
  invalid?: boolean;
  /** Changes every time the form is refused, so the panel shakes again even if it was already red. */
  shakeKey?: number;
}

/**
 * Six digit slots drawn by the "Festive Thai Room Code Panel" artwork (title included in the art),
 * backed by ONE real input stretched over it, so typing, deleting, pasting and OTP autofill all
 * behave natively on every phone keyboard.
 */
export function RoomCodeInput({ value, onChange, invalid, shakeKey }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const slotsRef = useRef<HTMLDivElement>(null);

  const shake = () => shakeElement(slotsRef.current); // a letter was typed instead of a digit
  useShakeOnInvalid(slotsRef, !!invalid, shakeKey); // the code was refused / left incomplete

  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Spaces/dashes from a pasted "123 456" are fine; letters are not.
    const bad = /[^\d\s-]/.test(raw);
    if (bad) shake();
    onChange(raw.replace(/\D/g, '').slice(0, ROOM_CODE_LENGTH));
  };

  const done = value.length === ROOM_CODE_LENGTH;

  return (
    <div className="field">
      {/* the title is painted into the panel art; keep a real label for screen readers */}
      <label htmlFor="room-code" className="sr-only">
        {th.join.roomCode}
      </label>
      <div
        ref={slotsRef}
        className={`code-panel ${invalid ? 'is-invalid' : ''}`}
        style={{ backgroundImage: `url(${roomCodePanelUrl})` }}
        onClick={() => ref.current?.focus()}
      >
        {Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => {
          const active = focused && (i === value.length || (done && i === ROOM_CODE_LENGTH - 1));
          return (
            <span
              key={i}
              className={`code-slot ${value[i] ? 'is-filled' : ''} ${active ? 'is-active' : ''}`}
              style={{ left: `${SLOT_X[i]}%`, top: `${SLOT_Y}%`, width: `${SLOT_W}%`, height: `${SLOT_H}%` }}
            >
              {value[i] ? <span className="code-digit">{value[i]}</span> : active ? <span className="code-caret" /> : <span className="code-dot" />}
            </span>
          );
        })}
        <input
          ref={ref}
          id="room-code"
          value={value}
          onChange={handle}
          onFocus={(e) => {
            setFocused(true);
            const n = e.target.value.length;
            e.target.setSelectionRange(n, n);
          }}
          onBlur={() => setFocused(false)}
          inputMode="numeric"
          pattern="\d*"
          autoComplete="one-time-code"
          enterKeyHint="next"
          maxLength={ROOM_CODE_LENGTH + 4 /* let a pasted "123 456" through to be cleaned */}
          aria-invalid={invalid || undefined}
          className="code-input"
        />
      </div>
    </div>
  );
}
