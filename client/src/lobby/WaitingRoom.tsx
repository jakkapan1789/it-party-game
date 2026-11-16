import { useState } from 'react';
import { motion } from 'framer-motion';
import { ROOM_CODE_LENGTH } from '@ng/shared';
import type { PlayerPublic } from '@ng/shared';
import { Button3D, SlideBanner } from '../design';
import { th } from '../i18n/th';
import { GameHeader } from './GameHeader';
import { LobbyScene } from './LobbyScene';
import { PlayersFrame } from './PlayersFrame';
import { ProfileDialog, type SaveResult } from './ProfileDialog';
import { RegistrationPanel } from './RegistrationPanel';
import { SLOT_H, SLOT_W, SLOT_X, SLOT_Y } from './RoomCodeInput';
import { roomCodePanelUrl } from './assets';

interface Props {
  roomCode: string;
  nickname: string;
  avatarId: number;
  /** This player's id, to highlight their own tile. */
  meId?: string;
  /** Players in the room right now. */
  count: number;
  /** The latest joiners the server sent (not necessarily everyone). */
  players: PlayerPublic[];
  /** Socket connected; false shows the reconnecting strip. */
  online: boolean;
  onLeave: () => void;
  /** Send the new name/avatar to the server. */
  onUpdateProfile: (nickname: string, avatarId: number) => Promise<SaveResult>;
}

/**
 * Waiting room: the join screen's scene with the form turned into read-only displays. The room code
 * sits right under the banner at the top (smaller than on the join screen), the players frame fills the
 * middle, and "waiting for the host" with the leave button are at the bottom.
 */
export function WaitingRoom({ roomCode, nickname, avatarId, meId, count, players, online, onLeave, onUpdateProfile }: Props) {
  const [editing, setEditing] = useState(false);
  // you always see yourself, first, even when you're not among the latest joiners the server sent
  const tiles = !meId || players.some((p) => p.id === meId) ? players : [{ id: meId, nickname, avatarId, score: 0, connected: true }, ...players];
  return (
    <LobbyScene
      header={<GameHeader banner="lobby" />}
      heroes={false}
      lockScroll
      stage={(delay) => (
        <motion.div
          className="stage-frame"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <PlayersFrame variant="dragon" players={tiles} total={count} title={th.admin.players(count)} meId={meId} emptyText={th.admin.noPlayers} />
        </motion.div>
      )}
      top={(delay) => (
        <motion.div
          className="wait-top"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="code-panel is-static" style={{ backgroundImage: `url(${roomCodePanelUrl})` }} role="img" aria-label={`${th.lobby.roomCode} ${roomCode}`}>
            {Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => (
              <span key={i} className="code-slot is-filled" style={{ left: `${SLOT_X[i]}%`, top: `${SLOT_Y}%`, width: `${SLOT_W}%`, height: `${SLOT_H}%` }}>
                <span className="code-digit">{roomCode[i]}</span>
              </span>
            ))}
          </div>
        </motion.div>
      )}
      overlay={
        <>
          <div className="wait-offline">
            <SlideBanner show={!online}>{th.lobby.reconnecting}</SlideBanner>
          </div>
          <ProfileDialog open={editing} nickname={nickname} avatarId={avatarId} onSave={onUpdateProfile} onClose={() => setEditing(false)} />
        </>
      }
    >
      {(delay) => (
        <RegistrationPanel
          delay={delay}
          footer={
            <div className="wait-footer">
              <p className="wait-text">{th.lobby.waiting}</p>
              <div className="wait-actions">
                <Button3D variant="orange" className="!min-h-10 !px-5 !text-base" onClick={() => setEditing(true)}>
                  {th.lobby.editProfile}
                </Button3D>
                <Button3D variant="alt" className="!min-h-10 !px-5 !text-base" onClick={onLeave}>
                  {th.lobby.leave}
                </Button3D>
              </div>
            </div>
          }
        >
          {null}
        </RegistrationPanel>
      )}
    </LobbyScene>
  );
}
