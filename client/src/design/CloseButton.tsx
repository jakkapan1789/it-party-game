import type { ButtonHTMLAttributes } from 'react';

/** Round dark close button with a cream X. */
export function CloseButton({ className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label="ปิด"
      className={`grid size-14 place-items-center rounded-full border-[5px] border-[#6B4A36] bg-night shadow-[0_4px_0_var(--color-ink)] active:translate-y-1 active:shadow-none ${className}`}
      {...rest}
    >
      <svg width="26" height="26" viewBox="0 0 26 26" stroke="#FFF4DC" strokeWidth="6" strokeLinecap="round">
        <path d="M4 4 L22 22 M22 4 L4 22" />
      </svg>
    </button>
  );
}
