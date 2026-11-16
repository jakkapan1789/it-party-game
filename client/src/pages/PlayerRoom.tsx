import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlayerAnswerPayload, RoomState } from '@ng/shared';
import { socket } from '../lib/socket';
import { clearPlayerSession, loadPlayerSession, savePlayerSession } from '../lib/session';
import { th } from '../i18n/th';
import { usePhaseMusic } from '../lib/sfx';
import { AppShell, BottomAction, ExitButton, ScreenSwap, SlideBanner, StatBar, screenKey } from '../design';
import { useGameFeed } from '../core/useGameFeed';
import { EndedScreen, LeaderboardScreen, WaitingScreen } from '../core/PlayerScreens';
import { WaitingRoom } from '../lobby/WaitingRoom';
import { GameBackdrop } from '../lobby/GameBackdrop';
import { getGameModule } from '../games';
import { RoundIntro } from '../core/QuestionIntro';

export default function PlayerRoom() {
  const nav = useNavigate();
  const feed = useGameFeed();
  usePhaseMusic(feed.phase);
  const [online, setOnline] = useState(socket.connected);

  useEffect(() => {
    if (!loadPlayerSession()) {
      nav('/', { replace: true });
      return;
    }

    // Runs on first load AND after every network drop: same call = join or rejoin.
    const join = () => {
      const s = loadPlayerSession();
      if (!s) return;
      socket.emit('player:join', { roomCode: s.roomCode, nickname: s.nickname, avatarId: s.avatarId, playerId: s.playerId });
    };
    const onConnect = () => {
      setOnline(true);
      join();
    };
    const onDisconnect = () => setOnline(false);
    const onState = (s: RoomState) => {
      const cur = loadPlayerSession();
      if (s.you && cur) savePlayerSession({ ...cur, playerId: s.you.id, nickname: s.you.nickname, avatarId: s.you.avatarId });
    };
    const onError = (e: { code: string }) => {
      // Answer-level errors (late/duplicate) are not fatal; the UI is already locked.
      if (['ALREADY_ANSWERED', 'TOO_LATE', 'WRONG_PHASE', 'NOT_ELIGIBLE', 'BAD_ANSWER', 'PAUSED'].includes(e.code)) return;
      // Room gone / full / name conflict after a server restart: start over.
      clearPlayerSession();
      nav('/', { replace: true });
    };
    const onKicked = () => {
      clearPlayerSession();
      nav('/?kicked=1', { replace: true });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:state', onState);
    socket.on('error', onError);
    socket.on('player:kicked', onKicked);
    if (socket.connected) join();
    else socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:state', onState);
      socket.off('error', onError);
      socket.off('player:kicked', onKicked);
    };
  }, [nav]);

  const leave = () => {
    clearPlayerSession();
    // Tell the server we're gone for good (frees the nickname), then disconnect. Don't hang if it's unreachable.
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      socket.disconnect();
      nav('/', { replace: true });
    };
    if (socket.connected) socket.emit('player:leave', finish);
    window.setTimeout(finish, socket.connected ? 800 : 0);
  };
  const submitAnswer = (p: PlayerAnswerPayload) => socket.emit('player:answer', p);
  const updateProfile = (nickname: string, avatarId: number) =>
    new Promise<{ ok: true } | { ok: false; code: string }>((resolve) => {
      socket.timeout(5000).emit('player:update', { nickname, avatarId }, (err, res) => resolve(err ? { ok: false, code: 'TIMEOUT' } : res));
    });

  const game = getGameModule(feed.question?.moduleId ?? feed.reveal?.moduleId);
  const inRound = feed.phase === 'QUESTION' || feed.phase === 'REVEAL';
  const progress = feed.reveal ?? feed.question;

  let body;
  if (feed.waiting) body = <WaitingScreen onLeave={leave} />;
  else if (inRound && game) body = <game.PlayerView feed={feed} submitAnswer={submitAnswer} />;
  else if (feed.phase === 'LEADERBOARD' && feed.leaderboard) body = <LeaderboardScreen board={feed.leaderboard} myId={feed.you?.id} myPrevRank={feed.me.prevRank} />;
  else if (feed.phase === 'ENDED' && feed.ended) body = <EndedScreen ended={feed.ended} myId={feed.you?.id} />;
  else body = null;

  // first snapshot not here yet (e.g. right after a refresh): just the painted scene, so the old purple scene never shows
  if (!feed.roomCode) return <GameBackdrop calm dim="none" />;

  // Waiting for the host: the join screen's fantasy scene, not the in-game shell.
  if (feed.phase === 'LOBBY') {
    return (
      <WaitingRoom
        roomCode={feed.roomCode}
        nickname={feed.you?.nickname ?? ''}
        avatarId={feed.you?.avatarId ?? 0}
        meId={feed.you?.id}
        count={feed.count}
        players={feed.players}
        online={online}
        onLeave={leave}
        onUpdateProfile={updateProfile}
      />
    );
  }

  const header = (
    <StatBar
      className=""
      score={feed.me.score}
      delayMs={feed.phase === 'REVEAL' ? 900 : 0}
      index={progress ? progress.index + 1 : undefined}
      total={progress?.total}
    />
  );

  return (
    <AppShell header={header}>
      <SlideBanner show={!online}>{th.lobby.reconnecting}</SlideBanner>
      {!feed.waiting && <RoundIntro feed={feed} />}
      <ScreenSwap id={screenKey(feed.phase, progress?.questionId, feed.waiting)}>{body}</ScreenSwap>
      {feed.phase === 'ENDED' && (
        <BottomAction>
          <ExitButton onClick={leave} />
        </BottomAction>
      )}
    </AppShell>
  );
}
