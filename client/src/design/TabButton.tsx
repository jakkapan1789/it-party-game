import type { ButtonHTMLAttributes } from 'react';

/** Tab hanging below a card. Active tab has a pointer notch on top. */
export function TabButton({
  active,
  tone = 'coral',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; tone?: 'coral' | 'purple' }) {
  const bg = tone === 'coral' ? '#E5735F' : '#5B4B9E';
  return (
    <button
      className={`relative flex-1 rounded-b-[12px] border-[3px] border-t-0 border-ink px-3 py-2 text-lg font-semibold ${active ? '' : 'opacity-70'} ${className}`}
      style={{ background: bg }}
      {...rest}
    >
      {active && (
        <span
          aria-hidden
          className="absolute -top-3 left-1/2 h-3 w-8 -translate-x-1/2 border-x-[3px] border-t-[3px] border-ink [clip-path:polygon(0_100%,50%_0,100%_100%)]"
          style={{ background: bg }}
        />
      )}
      <span className="text-outline-sm">{children}</span>
    </button>
  );
}
