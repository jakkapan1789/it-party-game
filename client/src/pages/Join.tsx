import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AVATAR_COUNT, NICKNAME_MAX, ROOM_CODE_LENGTH } from '@ng/shared';
import { socket } from '../lib/socket';
import { loadPlayerSession, savePlayerSession } from '../lib/session';
import { th } from '../i18n/th';
import type { AlertMessage } from '../lobby/AlertToast';
import { NewYearLobby } from '../lobby/NewYearLobby';

const FIELD_OF_ERROR: Record<string, 'code' | 'nickname'> = {
  ROOM_NOT_FOUND: 'code',
  ROOM_FULL: 'code',
  NAME_TAKEN: 'nickname',
};

export default function Join() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState((params.get('code') ?? '').replace(/\D/g, '').slice(0, ROOM_CODE_LENGTH));
  const [nickname, setNickname] = useState('');
  // No picker on this screen any more: each player still gets a random avatar for the room.
  const [avatarId] = useState(() => Math.floor(Math.random() * AVATAR_COUNT));
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<AlertMessage | null>(params.get('kicked') ? { id: 1, text: th.join.kicked } : null);
  const closeAlert = useCallback(() => setAlert(null), []);
  const [errorField, setErrorField] = useState<'code' | 'nickname'>();
  const [errorTick, setErrorTick] = useState(0); // bumps on every refusal → the red field shakes again

  // Already in a room on this device → go straight back (reconnect).
  useEffect(() => {
    if (loadPlayerSession()) nav('/play', { replace: true });
  }, [nav]);

  useEffect(() => {
    socket.connect();
    const onState = (s: { roomCode: string; you?: { id: string; nickname: string; avatarId: number } }) => {
      if (!s.you) return;
      savePlayerSession({ playerId: s.you.id, roomCode: s.roomCode, nickname: s.you.nickname, avatarId: s.you.avatarId });
      nav('/play', { replace: true });
    };
    const onError = (e: { code: string }) => {
      setBusy(false);
      setAlert({ id: Date.now(), text: th.errors[e.code] ?? th.errors.BAD_REQUEST });
      setErrorField(FIELD_OF_ERROR[e.code]);
      setErrorTick((n) => n + 1);
    };
    socket.on('room:state', onState);
    socket.on('error', onError);
    return () => {
      socket.off('room:state', onState);
      socket.off('error', onError);
    };
  }, [nav]);

  const valid = code.length === ROOM_CODE_LENGTH && nickname.trim().length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!valid) {
      // The button is always enabled: point at the first incomplete field instead (red glow, no message).
      setAlert(null);
      setErrorField(code.length === ROOM_CODE_LENGTH ? 'nickname' : 'code');
      setErrorTick((n) => n + 1);
      return;
    }
    setAlert(null);
    setErrorField(undefined);
    setBusy(true);
    socket.emit('player:join', { roomCode: code, nickname: nickname.trim(), avatarId });
  };

  // Editing a field clears the server error that pointed at it.
  const clearError = () => {
    setAlert(null);
    setErrorField(undefined);
  };
  const editCode = (v: string) => {
    setCode(v);
    if (errorField === 'code') clearError();
  };
  const editNickname = (v: string) => {
    setNickname(v.slice(0, NICKNAME_MAX));
    if (errorField === 'nickname') clearError();
  };

  return (
    <NewYearLobby
      code={code}
      onCode={editCode}
      nickname={nickname}
      onNickname={editNickname}
      busy={busy}
      alert={alert}
      onAlertDone={closeAlert}
      errorField={errorField}
      errorTick={errorTick}
      onSubmit={submit}
    />
  );
}
