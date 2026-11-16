import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AVATAR_COUNT } from '@ng/shared';
import { Button3D } from '../design';
import { Avatar } from '../mascot/Avatar';
import { th } from '../i18n/th';
import { NicknameInput } from './NicknameInput';
import { DragonFrame } from './DragonFrame';

export type SaveResult = { ok: true } | { ok: false; code: string };

interface Props {
  open: boolean;
  nickname: string;
  avatarId: number;
  /** Resolves when the server answered. The dialog closes itself on ok and flags the name on NAME_TAKEN. */
  onSave: (nickname: string, avatarId: number) => Promise<SaveResult>;
  onClose: () => void;
}

/**
 * "Set your name and pick your avatar" sheet, on the same gold cherry-blossom frame as the players list.
 * Closes only through its own buttons (save / cancel): tapping outside or pressing Esc does nothing.
 */
export function ProfileDialog({ open, nickname, avatarId, onSave, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && <Sheet key="profile" nickname={nickname} avatarId={avatarId} onSave={onSave} onClose={onClose} />}
    </AnimatePresence>
  );
}

function Sheet({ nickname: initialName, avatarId: initialAvatar, onSave, onClose }: Omit<Props, 'open'>) {
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(((initialAvatar % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT);
  const [saving, setSaving] = useState(false);
  const [bad, setBad] = useState(false); // red glow on the name field: empty, or already taken in this room

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) return setBad(true);
    setSaving(true);
    const res = await onSave(trimmed, avatar);
    setSaving(false);
    if (res.ok) return onClose();
    setBad(true);
  };

  return (
    <motion.div
      className="profile-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.form
        className="profile-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={th.lobby.profileTitle}
        onSubmit={submit}
        noValidate
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      >
        <DragonFrame title={th.lobby.profileTitle}>

        <div className="avatar-picker" role="radiogroup" aria-label={th.lobby.pickAvatar}>
          {Array.from({ length: AVATAR_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={avatar === i}
              aria-label={`${th.lobby.pickAvatar} ${i + 1}`}
              className={`avatar-pick ${avatar === i ? 'is-picked' : ''}`}
              onClick={() => setAvatar(i)}
            >
              <Avatar id={i} size={84} />
              <span aria-hidden className="pick-check">✓</span>
            </button>
          ))}
        </div>

        <NicknameInput
          value={name}
          onChange={(v) => {
            setName(v);
            setBad(false);
          }}
          invalid={bad}
        />

        <div className="profile-actions">
          <Button3D type="submit" variant="go" disabled={saving} className="!min-h-11 !px-6 !text-lg">
            {saving ? th.lobby.saving : th.lobby.save}
          </Button3D>
          <Button3D type="button" variant="alt" disabled={saving} className="!min-h-11 !px-6 !text-lg" onClick={onClose}>
            {th.lobby.cancel}
          </Button3D>
        </div>
        </DragonFrame>
      </motion.form>
    </motion.div>
  );
}
