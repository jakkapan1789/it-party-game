import type { ButtonHTMLAttributes } from 'react';
import { sfx } from '../lib/sfx';

type Variant = 'go' | 'stop' | 'alt' | 'orange';

// Two-tone face: lighter top half, deeper bottom half (flat, no blur).
const tones: Record<Variant, { top: string; bot: string }> = {
  go: { top: '#93E25F', bot: '#6BCB3C' },
  stop: { top: '#EB7B77', bot: '#D9534F' },
  alt: { top: '#F9E27F', bot: '#F2C94B' },
  orange: { top: '#F9C25C', bot: '#EE9B3A' },
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
}

/** Rounded-rect cartoon button: two-tone face, dark outline, sinks when pressed. */
export function Button3D({ variant = 'go', block, className = '', disabled, style, children, onClick, ...rest }: Props) {
  const t = tones[variant];
  return (
    <button
      disabled={disabled}
      onClick={(e) => {
        sfx.click();
        onClick?.(e);
      }}
      style={{
        background: `linear-gradient(to bottom, ${t.top} 50%, ${t.bot} 50%)`,
        ...style,
      }}
      className={[
        'relative min-h-12 rounded-[14px] border-[3px] border-ink px-6 py-2 text-xl font-semibold select-none',
        'shadow-[0_5px_0_0_var(--color-ink)] transition-transform duration-75',
        'enabled:active:translate-y-[5px] enabled:active:shadow-none',
        'disabled:opacity-60 disabled:saturate-50',
        block ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {/* small glint, top-left corner */}
      <span aria-hidden className="absolute left-1.5 top-1 size-1.5 rounded-full bg-white/70" />
      <span className="text-outline-sm">{children}</span>
    </button>
  );
}
