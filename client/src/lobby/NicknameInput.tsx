import { useRef, useState, type CSSProperties } from 'react';
import { NICKNAME_MAX } from '@ng/shared';
import { th } from '../i18n/th';
import { nicknamePanelUrl } from './assets';
import { useShakeOnInvalid } from './useLobbyMotion';

// The cream writing area inside the panel artwork, as % of the trimmed image (2120×729).
const FIELD: CSSProperties = { left: '13.25%', top: '37.59%', width: '76.27%', height: '38.55%' };

/**
 * Nickname field drawn by the "Thai Fantasy Nickname Input Panel" artwork (title included in the
 * art); the real input sits over its cream area. An empty field after blur glows red (no message).
 */
export function NicknameInput({ value, onChange, invalid, shakeKey }: { value: string; onChange: (v: string) => void; invalid?: boolean; shakeKey?: number }) {
  const [touched, setTouched] = useState(false);
  const bad = (touched && value.trim().length === 0) || !!invalid;
  const panelRef = useRef<HTMLDivElement>(null);
  useShakeOnInvalid(panelRef, bad, shakeKey);
  return (
    <div className="field">
      {/* the title is painted into the panel art; keep a real label for screen readers */}
      <label htmlFor="nickname" className="sr-only">
        {th.join.nickname}
      </label>
      <div ref={panelRef} className={`nick-panel ${bad ? 'is-invalid' : ''}`} style={{ backgroundImage: `url(${nicknamePanelUrl})` }}>
        <div className="nick-field" style={FIELD}>
          <input
            id="nickname"
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, NICKNAME_MAX))}
            onBlur={() => setTouched(true)}
            placeholder={th.join.nicknamePlaceholder}
            maxLength={NICKNAME_MAX}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            aria-invalid={bad || undefined}
            className="nick-input"
          />
          <span className="nick-count" aria-hidden>
            {value.length}/{NICKNAME_MAX}
          </span>
        </div>
      </div>
    </div>
  );
}
