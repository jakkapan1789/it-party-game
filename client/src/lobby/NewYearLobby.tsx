import type { FormEvent } from 'react';
import { ALERTS_ENABLED, AlertToast, type AlertMessage } from './AlertToast';
import { JoinButton } from './JoinButton';
import { LobbyScene } from './LobbyScene';
import { NicknameInput } from './NicknameInput';
import { PanelItem, RegistrationPanel } from './RegistrationPanel';
import { RoomCodeInput } from './RoomCodeInput';

interface Props {
  code: string;
  onCode: (v: string) => void;
  nickname: string;
  onNickname: (v: string) => void;
  busy: boolean;
  /** Floating alert (server errors, being kicked…); null = none. */
  alert: AlertMessage | null;
  onAlertDone: () => void;
  /** Which field the server error is about, to outline it in red. */
  errorField?: 'code' | 'nickname';
  /** Bumps on every refusal so the flagged field shakes again. */
  errorTick?: number;
  onSubmit: (e: FormEvent) => void;
}

/** Presentational join screen; Join owns the state and the socket logic. */
export function NewYearLobby({ code, onCode, nickname, onNickname, busy, alert, onAlertDone, errorField, errorTick, onSubmit }: Props) {
  return (
    <LobbyScene overlay={ALERTS_ENABLED && <AlertToast alert={alert} onDone={onAlertDone} />}>
      {(delay) => (
        <RegistrationPanel onSubmit={onSubmit} delay={delay} footer={<JoinButton form="join-form" loading={busy} />}>
          <PanelItem>
            <RoomCodeInput value={code} onChange={onCode} invalid={errorField === 'code'} shakeKey={errorTick} />
          </PanelItem>
          <PanelItem>
            <NicknameInput value={nickname} onChange={onNickname} invalid={errorField === 'nickname'} shakeKey={errorTick} />
          </PanelItem>
        </RegistrationPanel>
      )}
    </LobbyScene>
  );
}
