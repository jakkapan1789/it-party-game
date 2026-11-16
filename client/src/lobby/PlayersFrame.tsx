import { useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlayerPublic } from '@ng/shared';
import { Avatar } from '../mascot/Avatar';
import { th } from '../i18n/th';
import { playersTabUrl } from './assets';
import { DragonFrame } from './DragonFrame';

interface Props {
  players: PlayerPublic[];
  /** Players in the room when `players` is only a slice of them: shows a "+N" chip for the rest. */
  total?: number;
  title: string;
  /** Highlights this player's tile. */
  meId?: string;
  /** Host only: shows a kick button on every tile. */
  onKick?: (p: PlayerPublic) => void;
  emptyText?: string;
  /** Shrink the tiles to fit every player in the frame's height instead of scrolling (host / projector). */
  fit?: boolean;
  /** 'blossom' (default): wide gold cherry-blossom frame with a red tab (host). 'dragon': portrait dragon frame (phones). */
  variant?: 'blossom' | 'dragon';
}

const GAP = 12;
const PLATE_RATIO = 1.28; // tile height ≈ portrait × this (portrait + overlapping name plate)

/** Largest tile width (px) at which `count` tiles fit the box without scrolling. */
function fitTileSize(count: number, w: number, h: number) {
  for (let s = 132; s >= 36; s -= 2) {
    const cols = Math.max(1, Math.floor((w + GAP) / (s + GAP)));
    const rows = Math.ceil(count / cols);
    if (rows * (s * PLATE_RATIO + GAP) - GAP <= h) return s;
  }
  return 36;
}

function useFitTile(enabled: boolean, count: number) {
  const ref = useRef<HTMLUListElement>(null);
  const [size, setSize] = useState<number>();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const measure = () => setSize(fitTileSize(count, el.clientWidth - 8, el.clientHeight - 16));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabled, count]);
  return { ref, size };
}

/**
 * Gold cherry-blossom frame with a red title tab, holding purple portrait tiles (avatar + name plate).
 * Used on the host waiting room (every player, with kick buttons) and the player waiting room (latest joiners).
 */
export function PlayersFrame({ players, total, title, meId, onKick, emptyText, fit, variant = 'blossom' }: Props) {
  const more = total !== undefined ? total - players.length : 0;
  const { ref, size } = useFitTile(!!fit, players.length);
  const list = (
    <>
      {players.length === 0 ? (
        <p className="py-6 text-center text-xl font-semibold opacity-70">{emptyText}</p>
      ) : (
        <ul ref={ref} className="player-grid">
          <AnimatePresence initial={false}>
            {players.map((p) => (
              <motion.li
                key={p.id}
                layout
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: p.connected ? 1 : 0.5 }}
                exit={{ scale: 0.4, opacity: 0 }}
                className={`player-tile ${p.id === meId ? 'is-me' : ''}`}
              >
                <div className="player-portrait">
                  <Avatar id={p.avatarId} size={80} />
                  {onKick && (
                    <button type="button" onClick={() => onKick(p)} className="player-kick" aria-label={`${th.admin.kick} ${p.nickname}`} title={th.admin.kick}>
                      ✕
                    </button>
                  )}
                </div>
                <div className="player-plate" title={p.connected ? p.nickname : `${p.nickname} · ${th.admin.offline}`}>
                  {p.nickname}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
          {more > 0 && <li className="player-more">+{more}</li>}
        </ul>
      )}
    </>
  );
  if (variant === 'dragon') return <DragonFrame title={title}>{list}</DragonFrame>;
  return (
    <div className={`players-frame ${fit ? 'is-fit' : ''}`} style={fit && size ? ({ '--tile': `${size}px` } as React.CSSProperties) : undefined}>
      <img src={playersTabUrl} alt="" aria-hidden className="players-tab" draggable={false} />
      <h2 className="players-title">{title}</h2>
      {list}
    </div>
  );
}
