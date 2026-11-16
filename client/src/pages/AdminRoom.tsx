import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ROOM_CODE_LENGTH, type RoomState } from '@ng/shared';
import { socket } from '../lib/socket';
import { adminPin, adminRoom } from '../lib/session';
import { th } from '../i18n/th';
import { usePhaseMusic } from '../lib/sfx';
import { BannerButton, BlossomPanel, Button3D, PageBanner, ScreenSwap, screenKey } from '../design';
import { useGameFeed } from '../core/useGameFeed';
import { HostControls, HostEnded, HostLeaderboard } from '../core/HostScreens';
import { PlayersSheet } from '../lobby/PlayersSheet';
import { useNavigate } from 'react-router-dom';
import { getGameModule } from '../games';
import { RoundIntro } from '../core/QuestionIntro';
import { GameHeader } from '../lobby/GameHeader';
import { HostShell } from '../lobby/HostShell';
import { roomCodePanelUrl } from '../lobby/assets';
import { Avatar } from '../mascot/Avatar';
import { loadSelection, resolveSelection, startOnReturn, useCatalog } from '../lib/packages';
import { IN_GAME_ART, warmImages } from '../lib/preload';
import { SLOT_H, SLOT_W, SLOT_X, SLOT_Y } from '../lobby/RoomCodeInput';

type Stage = 'login' | 'menu' | 'room';

/** Base URL phones should open. On localhost we swap in the machine's LAN IP. */
function useJoinBase() {
  const [base, setBase] = useState(location.origin);
  useEffect(() => {
    fetch('/api/lan')
      .then((r) => r.json())
      .then((d: { ips: string[]; publicUrl: string | null }) => {
        if (d.publicUrl) return setBase(d.publicUrl.replace(/\/$/, ''));
        const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
        if (isLocal && d.ips[0]) setBase(`${location.protocol}//${d.ips[0]}${location.port ? `:${location.port}` : ''}`);
      })
      .catch(() => {});
  }, []);
  return base;
}

export default function AdminRoom() {
  const nav = useNavigate();
  const [stage, setStage] = useState<Stage>('login');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const feed = useGameFeed();
  const catalog = useCatalog(stage === 'room');
  const resolved = useMemo(
    () => (catalog.games && catalog.packages ? resolveSelection(loadSelection(), catalog.games, catalog.packages) : null),
    [catalog.games, catalog.packages],
  );
  const startPayload = resolved ? (resolved.pkg ? { packageId: resolved.pkg.id } : { moduleId: resolved.game.id }) : undefined;
  // "เริ่มเกม" pressed on the games page: start as soon as the lobby is back and knows what to play
  useEffect(() => {
    if (stage === 'room' && feed.phase === 'LOBBY' && resolved && startOnReturn.take()) socket.emit('admin:start', startPayload);
  }, [stage, feed.phase, resolved, startPayload]);
  usePhaseMusic(feed.phase);
  const players = feed.players;
  const [showPlayers, setShowPlayers] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const joinBase = useJoinBase();
  useEffect(() => {
    if (stage === 'room') warmImages(IN_GAME_ART);
  }, [stage]);

  useEffect(() => {
    const auth = () => {
      const saved = adminPin.get();
      if (saved) socket.emit('admin:auth', { pin: saved });
    };
    const onAuthed = () => {
      setError('');
      const code = adminRoom.get();
      if (code) socket.emit('admin:reconnect', { roomCode: code });
      else setStage('menu');
    };
    const onState = (s: RoomState) => {
      if (s.you) return; // player snapshot, not ours
      adminRoom.set(s.roomCode);
      setStage('room');
    };
    const onError = (e: { code: string }) => {
      if (e.code === 'ROOM_NOT_FOUND') {
        adminRoom.clear();
        setStage('menu');
        return;
      }
      if (e.code === 'UNAUTHORIZED') {
        adminPin.clear();
        setStage('login');
      }
      setError(th.errors[e.code] ?? th.errors.BAD_REQUEST);
    };

    socket.on('connect', auth);
    socket.on('admin:authed', onAuthed);
    socket.on('room:state', onState);
    socket.on('error', onError);
    if (socket.connected) auth();
    else socket.connect();
    return () => {
      socket.off('connect', auth);
      socket.off('admin:authed', onAuthed);
      socket.off('room:state', onState);
      socket.off('error', onError);
    };
  }, []);

  const login = (e: FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setError('');
    adminPin.set(pin);
    socket.emit('admin:auth', { pin });
  };
  const create = () => socket.emit('admin:createRoom');
  const newRoom = () => {
    adminRoom.clear();
    create();
  };

  if (stage !== 'room' || !feed.roomCode) {
    return (
      <HostShell>
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-3">
        <div className="[&_.title-banner]:!w-[270px]"><GameHeader /></div>
        <PageBanner>{th.admin.title}</PageBanner>
        {stage === 'login' ? (
          <form onSubmit={login} className="space-y-4">
            <BlossomPanel title={th.admin.pin} className="space-y-2">
              <label className="sr-only" htmlFor="pin">{th.admin.pin}</label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="h-14 w-full rounded-xl border-[3px] border-ink bg-white px-3 text-center font-display text-3xl outline-none focus:ring-4 focus:ring-[#FFE600]"
              />
              {error && <p role="alert" className="font-semibold text-stop-dark">{error}</p>}
            </BlossomPanel>
            <Button3D type="submit" block disabled={!pin}>{th.admin.login}</Button3D>
          </form>
        ) : (
          <BlossomPanel title={th.admin.menu} className="space-y-3">
            <Button3D block variant="orange" onClick={create}>{th.admin.createRoom}</Button3D>
            <Button3D block variant="alt" onClick={() => nav('/admin/games')}>{th.games.change}</Button3D>
            <Button3D block variant="alt" onClick={() => nav('/admin/report')}>{th.admin.reports}</Button3D>
          </BlossomPanel>
        )}
      </main>
      </HostShell>
    );
  }

  const roomCode = feed.roomCode;
  const joinUrl = `${joinBase}/?code=${roomCode}`;
  const phase = feed.phase;
  const game = getGameModule(feed.question?.moduleId ?? feed.reveal?.moduleId);
  const progress = feed.reveal ?? feed.question ?? feed.leaderboard; // the board carries index/total too (after a reload)
  const send = {
    pause: () => socket.emit('admin:pause'),
    resume: () => socket.emit('admin:resume'),
    reveal: () => socket.emit('admin:reveal'),
    showLeaderboard: () => socket.emit('admin:showLeaderboard'),
    next: () => socket.emit('admin:next'),
    end: () => socket.emit('admin:end'),
    restart: () => socket.emit('admin:restart'),
    newRoom,
    report: () => nav(`/admin/report?room=${roomCode}`),
  };
  const controls = (
    <HostControls
      phase={phase}
      index={progress?.index ?? 0}
      total={progress?.total ?? 0}
      isLast={!!progress && progress.index + 1 >= progress.total}
      playerCount={players.length}
      paused={!!feed.question?.paused}
      onShowPlayers={() => setShowPlayers(true)}
      on={send}
    />
  );

  if (phase !== 'LOBBY') {
    return (
      <HostShell calm>
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center gap-3 px-6 pt-4">
          <span className="gold-pill text-lg">{th.admin.roomCode} <span className="font-display text-2xl tracking-[0.12em]">{roomCode}</span></span>
        </header>
        <main className="flex flex-1 flex-col pt-4">
          <ScreenSwap id={screenKey(phase, (feed.reveal ?? feed.question)?.questionId)} className="flex flex-1 flex-col">
            {(phase === 'QUESTION' || phase === 'REVEAL') && game && <game.HostView feed={feed} />}
            {phase === 'LEADERBOARD' && feed.leaderboard && <HostLeaderboard board={feed.leaderboard} />}
            {phase === 'ENDED' && feed.ended && <HostEnded ended={feed.ended} />}
          </ScreenSwap>
          <RoundIntro feed={feed} big />
          {error && <p role="alert" className="px-6 pt-3 font-semibold text-white">{error}</p>}
        </main>
        {controls}
        {showPlayers && (
          <PlayersSheet players={players} onKick={(id) => socket.emit('admin:kick', { playerId: id })} onClose={() => setShowPlayers(false)} />
        )}
      </div>
      </HostShell>
    );
  }

  return (
    <HostShell>
    <div className="flex h-dvh flex-col">
    <main className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
      {/* banner, room code and QR scale with the screen height, so the whole waiting room fits on 720p */}
      <div className="[&_.title-banner]:!w-[min(440px,36vh)]"><GameHeader banner="lobby" /></div>

      {/* the room code, big: the player's code panel scaled up, digits drawn into its six boxes */}
      <div
        className="code-panel is-static host-code w-full max-w-[min(880px,76vh)]"
        style={{ backgroundImage: `url(${roomCodePanelUrl})` }}
        role="img"
        aria-label={`${th.admin.roomCode} ${roomCode}`}
      >
        {Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => (
          <span key={i} className="code-slot is-filled" style={{ left: `${SLOT_X[i]}%`, top: `${SLOT_Y}%`, width: `${SLOT_W}%`, height: `${SLOT_H}%` }}>
            <span className="code-digit">{roomCode[i]}</span>
          </span>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-6 lg:grid-cols-[auto_1fr]">
      <section className="flex flex-col items-center gap-4 self-start">
        <BlossomPanel title={th.admin.scanToJoin} size="sm" className="flex flex-col items-center gap-2">
          <QRCodeSVG value={joinUrl} size={280} marginSize={2} level="M" style={{ width: 'min(280px, 25vh)', height: 'auto' }} />
          <p className="max-w-[280px] break-all text-center text-sm opacity-70">{joinUrl}</p>
        </BlossomPanel>
      </section>

      <section className="flex min-h-0 flex-col gap-4">
        <BlossomPanel title={th.admin.players(players.length)} size="sm" className="flex shrink-0 flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            {players.length === 0 ? (
              <p className="text-sm opacity-70">{th.admin.noPlayers}</p>
            ) : (
              <div className="mt-1 flex -space-x-2" aria-hidden>
                {players.slice(0, 6).map((p) => <Avatar key={p.id} id={p.avatarId} size={34} />)}
                {players.length > 6 && <span className="grid size-[34px] place-items-center rounded-full border-2 border-ink bg-cream text-xs font-bold">+{players.length - 6}</span>}
              </div>
            )}
          </div>
          <Button3D variant="alt" className="!min-h-11 !px-4 !text-base" onClick={() => setShowRoster(true)}>{th.admin.viewPlayers}</Button3D>
        </BlossomPanel>

        <div className="-mt-2 pb-6"><BannerButton onClick={() => nav('/admin/games')}>{th.games.pickToPlay}</BannerButton></div>
        {error && <p role="alert" className="font-semibold text-white">{error}</p>}
      </section>
      </div>
    </main>
    {showRoster && <PlayersSheet players={players} onKick={(id) => socket.emit('admin:kick', { playerId: id })} onClose={() => setShowRoster(false)} />}
    </div>
    </HostShell>
  );
}
