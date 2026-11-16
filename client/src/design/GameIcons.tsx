import { useId, type ReactNode } from 'react';

/**
 * Game-style SVG icons: thick ink outline, 3 tones per part (base / shade / highlight),
 * light from the top-left. All share one 64x64 viewBox so they line up in a dock.
 */

const INK = '#2B1D14';

/** Unique, url()-safe gradient ids per icon instance. */
function useIds<const K extends string>(...keys: K[]) {
  const base = useId().replace(/:/g, '');
  return Object.fromEntries(keys.map((k) => [k, `${base}-${k}`])) as Record<K, string>;
}

function Grad({ id, stops }: { id: string; stops: [number, string][] }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      {stops.map(([o, c]) => (
        <stop key={o} offset={o} stopColor={c} />
      ))}
    </linearGradient>
  );
}

const GOLD: [number, string][] = [[0, '#FFF3B0'], [0.45, '#FFD45C'], [1, '#E08F22']];
const RED: [number, string][] = [[0, '#FF8A8A'], [0.5, '#E8414F'], [1, '#B3243A']];

function Frame({ size, label, children }: { size: number; label: string; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={label}>
      <ellipse cx="32" cy="60" rx="20" ry="3" fill="#000" opacity=".2" />
      {children}
    </svg>
  );
}

export function GiftIcon({ size = 64 }: { size?: number }) {
  const id = useIds('red', 'redLid', 'gold');
  return (
    <Frame size={size} label="ของขวัญ">
      <defs>
        <Grad id={id.red} stops={RED} />
        <Grad id={id.redLid} stops={[[0, '#FF9E9E'], [1, '#E8414F']]} />
        <Grad id={id.gold} stops={GOLD} />
      </defs>
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* bow loops (behind lid) */}
        <path d="M32 22 C25 7 11 9 15 18 C17 22 25 23 32 22 Z" fill={`url(#${id.gold})`} />
        <path d="M32 22 C39 7 53 9 49 18 C47 22 39 23 32 22 Z" fill={`url(#${id.gold})`} />
        {/* box */}
        <rect x="10" y="30" width="44" height="27" rx="4" fill={`url(#${id.red})`} />
        <rect x="27" y="30" width="10" height="27" fill={`url(#${id.gold})`} />
        {/* lid */}
        <rect x="6" y="21" width="52" height="12" rx="4" fill={`url(#${id.redLid})`} />
        <rect x="26" y="21" width="12" height="12" fill={`url(#${id.gold})`} />
        <circle cx="32" cy="21" r="4.5" fill="#F7B733" />
      </g>
      {/* shade under lid + highlights */}
      <rect x="11.5" y="34.5" width="41" height="3" fill="#000" opacity=".18" />
      <rect x="10" y="23.5" width="12" height="3" rx="1.5" fill="#fff" opacity=".75" />
      <rect x="13.5" y="40" width="3" height="12" rx="1.5" fill="#fff" opacity=".45" />
      <path d="M19 13 C21 11 24 12 26 15" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".8" />
    </Frame>
  );
}

export function EnvelopeIcon({ size = 64 }: { size?: number }) {
  const id = useIds('red', 'flap', 'gold');
  return (
    <Frame size={size} label="อั่งเปา">
      <defs>
        <Grad id={id.red} stops={RED} />
        <Grad id={id.flap} stops={[[0, '#D9364A'], [1, '#A81F35']]} />
        <Grad id={id.gold} stops={GOLD} />
      </defs>
      <g transform="translate(32 35) scale(0.86) translate(-32 -32) rotate(-8 32 32)">
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
          {/* coins peeking out */}
          <circle cx="26" cy="9" r="6.5" fill={`url(#${id.gold})`} />
          <circle cx="39" cy="7" r="8" fill={`url(#${id.gold})`} />
          <rect x="36.5" y="1.5" width="5" height="5" rx="1" fill="#C98A12" strokeWidth="2" />
          <rect x="14" y="8" width="36" height="49" rx="5" fill={`url(#${id.red})`} />
          <path d="M14 13 C14 10 16 8 19 8 H45 C48 8 50 10 50 13 V17 Q32 33 14 17 Z" fill={`url(#${id.flap})`} />
          {/* gold seal */}
          <circle cx="32" cy="27" r="8.5" fill={`url(#${id.gold})`} />
        </g>
        <rect x="29" y="24" width="6" height="6" rx="1" transform="rotate(45 32 27)" fill="none" stroke={INK} strokeWidth="2" />
        {/* gold trim lines */}
        <path d="M18 46 H46 M18 50 H46" stroke="#F7B733" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="48" r="2.4" fill="#FFE08A" stroke={INK} strokeWidth="1.5" />
        {/* highlights */}
        <rect x="17.5" y="22" width="3" height="20" rx="1.5" fill="#fff" opacity=".45" />
        <circle cx="29" cy="24" r="1.6" fill="#fff" opacity=".85" />
        <path d="M33.5 5 Q34.5 1.5 37 0.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </Frame>
  );
}

export function TrophyIcon({ size = 64 }: { size?: number }) {
  const id = useIds('gold', 'goldDark', 'base');
  return (
    <Frame size={size} label="ถ้วยรางวัล">
      <defs>
        <Grad id={id.gold} stops={GOLD} />
        <Grad id={id.goldDark} stops={[[0, '#F2B640'], [1, '#B8740F']]} />
        <Grad id={id.base} stops={[[0, '#8A5CD6'], [0.6, '#5A2FA3'], [1, '#3A1A73']]} />
      </defs>
      {/* handles: ink under, gold on top */}
      <g fill="none" strokeLinecap="round">
        <path d="M18 15 H12 C9 15 8 17 8 20 C8 27 13 31 20 31 M46 15 H52 C55 15 56 17 56 20 C56 27 51 31 44 31" stroke={INK} strokeWidth="8" />
        <path d="M18 15 H12 C9 15 8 17 8 20 C8 27 13 31 20 31 M46 15 H52 C55 15 56 17 56 20 C56 27 51 31 44 31" stroke="#F2B640" strokeWidth="3" />
      </g>
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M27 38 H37 L38 46 H26 Z" fill={`url(#${id.goldDark})`} />
        <path d="M17 10 H47 V22 C47 32 40 39 32 39 C24 39 17 32 17 22 Z" fill={`url(#${id.gold})`} />
        <rect x="14" y="6" width="36" height="7" rx="3.5" fill="#FFE08A" />
        <rect x="17" y="45" width="30" height="12" rx="3" fill={`url(#${id.base})`} />
        <rect x="24" y="48.5" width="16" height="5" rx="1.5" fill="#F7B733" strokeWidth="2" />
        {/* star emblem */}
        <path d="M32 15.5 L34.2 20 L39 20.6 L35.5 24 L36.4 28.8 L32 26.5 L27.6 28.8 L28.5 24 L25 20.6 L29.8 20 Z" fill="#FFF6D6" strokeWidth="2" />
      </g>
      {/* shading + highlights */}
      <path d="M41 14 V22 C41 29 37 34 32 36 C39 36 44 30 44 22 V14 Z" fill="#B8740F" opacity=".35" />
      <path d="M21.5 15 V22 C21.5 26 23 29 25 31" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity=".8" />
      <rect x="18" y="8" width="10" height="2.4" rx="1.2" fill="#fff" opacity=".8" />
      <rect x="20" y="47" width="2.5" height="7" rx="1.2" fill="#fff" opacity=".35" />
    </Frame>
  );
}

export interface DockItem {
  icon: ReactNode;
  label: string;
  /** Red count bubble in the corner (hidden when 0/undefined). */
  badge?: number;
  onClick?: () => void;
}

/** Translucent pill of big game icons with outlined labels, like a mobile-game home bar. */
export function IconDock({ items }: { items: DockItem[] }) {
  return (
    <div className="icon-dock">
      {items.map((it) => {
        const body = (
          <>
            <span className="dock-icon">{it.icon}</span>
            <span className="text-outline-sm -mt-3 text-lg leading-none">{it.label}</span>
            {!!it.badge && <span className="dock-badge">{it.badge}</span>}
          </>
        );
        // Without an action it's decoration, so don't pretend to be a button.
        return it.onClick ? (
          <button key={it.label} type="button" className="dock-item" onClick={it.onClick}>{body}</button>
        ) : (
          <div key={it.label} className="dock-item">{body}</div>
        );
      })}
    </div>
  );
}
