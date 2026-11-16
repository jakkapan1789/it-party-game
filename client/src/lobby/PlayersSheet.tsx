import { useRef, type CSSProperties } from 'react';
import type { PlayerPublic } from '@ng/shared';
import { th } from '../i18n/th';
import { Avatar } from '../mascot/Avatar';
import { playersSheetUrl } from './assets';
import { sfx } from '../lib/sfx';

/**
 * Player info (host): the chibi-girl frame, sized to fit the screen with a margin around it. It scales uniformly
 * and only stretches vertically in the plain middle (the knots and tassels are inside the top slice); the height follows the
 * list (with a minimum, and a cap so the frame never touches the screen edges). The close button sits on the bottom medallion.
 * Used in the waiting room (names) and during the game (names + scores). Kick button on every card.
 */
export function PlayersSheet({ players, onKick, onClose }: { players: PlayerPublic[]; onKick: (id: string) => void; onClose: () => void }) {
  // in a running game the best score comes first; before anyone has points, the order of arrival
  const played = players.some((p) => p.score > 0);
  const list = played ? [...players].sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname)) : players;
  // once only: a double tap (or tap + backdrop) must not play the sound twice while the sheet is closing
  const closed = useRef(false);
  const close = () => {
    if (closed.current) return;
    closed.current = true;
    sfx.click();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/75" onClick={close} role="dialog" aria-modal="true" aria-label={th.admin.players(players.length)}>
      <div className="sheet-frame" style={{ '--sheet-art': `url(${playersSheetUrl})` } as CSSProperties} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-body">
        <div className="sheet-head">
          <h2 className="sheet-title">{th.admin.players(players.length)}</h2>
        </div>
        {list.length === 0 ? (
          <p className="py-10 text-center text-xl font-semibold opacity-70">{th.admin.noPlayers}</p>
        ) : (
          <ul className="sheet-list">
            {list.map((p) => (
              <li key={p.id} className={`sheet-card ${p.connected ? '' : 'is-offline'}`}>
                <Avatar id={p.avatarId} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="sheet-name">{p.nickname}</span>
                  <span className="sheet-sub">{p.connected ? (played ? `${p.score.toLocaleString()} ${th.game.score}` : th.admin.online) : th.admin.offline}</span>
                </span>
                <button onClick={() => { sfx.click(); onKick(p.id); }} className="sheet-kick">{th.admin.kick}</button>
              </li>
            ))}
          </ul>
        )}
        </div>
        {/* sits on the frame's bottom medallion (where the flower was) */}
        <button type="button" className="sheet-close" aria-label={th.admin.close} onClick={close}>
          <svg viewBox="0 0 26 26" stroke="#FFF4DC" strokeWidth="5.5" strokeLinecap="round"><path d="M5 5 L21 21 M21 5 L5 21" /></svg>
        </button>
      </div>
    </div>
  );
}
