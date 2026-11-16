import type { ZodType } from 'zod';
import {
  adminAuthSchema,
  adminKickSchema,
  adminReconnectSchema,
  adminStartSchema,
  gameSettingsSchema,
  playerAnswerSchema,
  playerJoinSchema,
  playerUpdateSchema,
  type ClientToServerEvents,
  type ErrorCode,
  type ServerToClientEvents,
} from '@ng/shared';
import { pinMatches } from '../auth';
import { loadPackages } from '../packages';
import { RoomManager, toPublic } from '../core/RoomManager';
import type { GameController } from '../core/GameController';
import type { IO, Sock } from '../core/socketTypes';
import type { Room } from '../core/types';

const MAX_PIN_ATTEMPTS = 5;
const BROADCAST_DEBOUNCE_MS = 150;
/** While waiting, players see only the latest joiners (the full roster of up to 200 would bloat every join broadcast). */
const LOBBY_ROSTER_MAX = 24;

const adminsRoom = (code: string) => `admins:${code}`;
const playersRoom = (code: string) => `players:${code}`;

const lobbyRoster = (room: Room) =>
  room.phase === 'LOBBY' ? [...room.players.values()].slice(-LOBBY_ROSTER_MAX).map(toPublic) : [];

export function registerHandlers(io: IO, rooms: RoomManager, game: GameController) {
  // Coalesce bursts of joins/leaves into one broadcast per room.
  const pending = new Map<string, NodeJS.Timeout>();
  const broadcastPlayers = (room: Room) => {
    if (pending.has(room.code)) return;
    pending.set(
      room.code,
      setTimeout(() => {
        pending.delete(room.code);
        const players = [...room.players.values()].map(toPublic);
        io.to(adminsRoom(room.code)).emit('room:players', { count: players.length, players });
        io.to(playersRoom(room.code)).emit('room:players', { count: players.length, players: lobbyRoster(room) });
      }, BROADCAST_DEBOUNCE_MS),
    );
  };

  const fail = (s: Sock, code: ErrorCode, message: string) => s.emit('error', { code, message });

  /** Validate an untrusted payload; emits BAD_REQUEST and returns undefined on failure. */
  const parse = <T>(s: Sock, schema: ZodType<T>, data: unknown): T | undefined => {
    const r = schema.safeParse(data);
    if (!r.success) {
      fail(s, 'BAD_REQUEST', 'Invalid payload');
      return undefined;
    }
    return r.data;
  };

  const requireAdmin = (s: Sock): boolean => {
    if (s.data.isAdmin) return true;
    fail(s, 'UNAUTHORIZED', 'Admin only');
    return false;
  };

  const attachAdmin = (s: Sock, room: Room) => {
    s.join(adminsRoom(room.code));
    s.data.roomCode = room.code;
    s.emit('room:state', rooms.state(room));
    game.replay(room, 'host', s.id);
    s.emit('room:players', { count: room.players.size, players: [...room.players.values()].map(toPublic) });
  };

  io.on('connection', (socket: Sock) => {
    socket.emit('hello', { message: 'เชื่อมต่อ server สำเร็จ', serverNow: Date.now() });
    socket.on('ping', (t, ack) => typeof ack === 'function' && ack({ serverNow: Date.now(), clientSentAt: t }));

    // ---------- player ----------
    socket.on('player:join', (raw) => {
      const p = parse(socket, playerJoinSchema, raw);
      if (!p) return;
      const res = rooms.join(p, socket.id);
      if (!res.ok) return fail(socket, res.code, `Join failed: ${res.code}`);

      // Moving between rooms (or re-joining): leave any previous player room.
      if (socket.data.roomCode && socket.data.roomCode !== res.room.code) {
        socket.leave(playersRoom(socket.data.roomCode));
      }
      socket.data.roomCode = res.room.code;
      socket.data.playerId = res.player.id;
      socket.join(playersRoom(res.room.code));
      socket.emit('room:state', rooms.state(res.room, res.player, game.isWaiting(res.room, res.player.id)));
      game.replay(res.room, res.player.id, socket.id);
      socket.emit('room:players', { count: res.room.players.size, players: lobbyRoster(res.room) });
      broadcastPlayers(res.room);
      game.onRosterChange(res.room);
    });

    socket.on('player:update', (raw, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const p = playerUpdateSchema.safeParse(raw);
      if (!p.success) return reply({ ok: false, code: 'BAD_REQUEST' });
      const { roomCode, playerId } = socket.data;
      const room = roomCode ? rooms.getRoom(roomCode) : undefined;
      if (!room || !playerId) return reply({ ok: false, code: 'ROOM_NOT_FOUND' });
      if (room.phase !== 'LOBBY') return reply({ ok: false, code: 'WRONG_PHASE' }); // names/avatars are fixed once the game starts
      const res = rooms.updateProfile(room, playerId, p.data);
      if (!res.ok) return reply({ ok: false, code: res.code });
      socket.emit('room:state', rooms.state(room, res.player, false)); // refreshes `you` on the client
      broadcastPlayers(room);
      reply({ ok: true });
    });

    socket.on('player:answer', (raw) => {
      const p = parse(socket, playerAnswerSchema, raw);
      const { roomCode, playerId } = socket.data;
      const room = roomCode ? rooms.getRoom(roomCode) : undefined;
      if (!p || !room || !playerId || !room.players.has(playerId)) return;
      const res = game.submitAnswer(room, playerId, p);
      if ('error' in res) return fail(socket, res.error, `Answer rejected: ${res.error}`);
      socket.emit('player:answerAck', { questionId: p.questionId, answer: res.answer });
    });

    // ---------- admin ----------
    socket.on('admin:auth', (raw) => {
      const p = parse(socket, adminAuthSchema, raw);
      if (!p) return;
      if ((socket.data.adminAttempts ?? 0) >= MAX_PIN_ATTEMPTS) {
        fail(socket, 'TOO_MANY_ATTEMPTS', 'Too many attempts');
        return void socket.disconnect(true);
      }
      if (!pinMatches(p.pin)) {
        socket.data.adminAttempts = (socket.data.adminAttempts ?? 0) + 1;
        return fail(socket, 'UNAUTHORIZED', 'Wrong PIN');
      }
      socket.data.isAdmin = true;
      socket.emit('admin:authed');
    });

    socket.on('admin:createRoom', () => {
      if (!requireAdmin(socket)) return;
      attachAdmin(socket, rooms.createRoom());
    });

    socket.on('admin:reconnect', (raw) => {
      if (!requireAdmin(socket)) return;
      const p = parse(socket, adminReconnectSchema, raw);
      if (!p) return;
      const room = rooms.getRoom(p.roomCode);
      if (!room) return fail(socket, 'ROOM_NOT_FOUND', 'Room not found');
      attachAdmin(socket, room);
    });

    socket.on('player:leave', (ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const { roomCode, playerId } = socket.data;
      if (roomCode && playerId) {
        const res = rooms.kick(roomCode, playerId);
        if (res) {
          game.removePlayer(res.room, playerId);
          broadcastPlayers(res.room);
        }
        socket.leave(playersRoom(roomCode));
      }
      socket.data.roomCode = undefined;
      socket.data.playerId = undefined; // so the disconnect that follows doesn't touch the room again
      reply();
    });

    socket.on('admin:kick', (raw) => {
      if (!requireAdmin(socket)) return;
      const p = parse(socket, adminKickSchema, raw);
      if (!p || !socket.data.roomCode) return;
      const res = rooms.kick(socket.data.roomCode, p.playerId);
      if (!res) return;
      game.removePlayer(res.room, p.playerId);
      if (res.player.socketId) {
        const target = io.sockets.sockets.get(res.player.socketId);
        target?.emit('player:kicked');
        target?.leave(playersRoom(res.room.code));
        if (target) target.data.playerId = undefined;
      }
      broadcastPlayers(res.room);
    });

    // game flow: admin presses, controller enforces the phase machine
    const adminRoomOf = (): Room | undefined => {
      if (!requireAdmin(socket)) return undefined;
      const room = socket.data.roomCode ? rooms.getRoom(socket.data.roomCode) : undefined;
      if (!room) fail(socket, 'ROOM_NOT_FOUND', 'No active room');
      return room;
    };
    const flow = (name: 'next' | 'reveal' | 'showLeaderboard' | 'end' | 'pause' | 'resume' | 'restart') =>
      socket.on(`admin:${name}` as 'admin:start', () => {
        const room = adminRoomOf();
        if (!room) return;
        const err = game[name](room);
        if (err) fail(socket, err, `${name} failed: ${err}`);
        else if (name === 'restart') broadcastPlayers(room); // lobby roster for the fresh waiting room
      });
    socket.on('admin:start', (raw) => {
      const room = adminRoomOf();
      if (!room) return;
      const p = adminStartSchema.safeParse(raw);
      if (!p.success) return void fail(socket, 'BAD_REQUEST', 'Invalid start payload');
      let sel: { moduleId: string; questionIds?: string[]; shuffle?: boolean } | undefined;
      if (p.data?.packageId) {
        const pkg = loadPackages().find((x) => x.id === p.data!.packageId);
        if (!pkg) return void fail(socket, 'BAD_REQUEST', 'Unknown package');
        sel = { moduleId: pkg.moduleId, questionIds: pkg.questionIds, shuffle: pkg.shuffle };
      } else if (p.data?.moduleId) sel = { moduleId: p.data.moduleId };
      const err = game.start(room, sel);
      if (err) fail(socket, err, `start failed: ${err}`);
    });
    (['next', 'reveal', 'showLeaderboard', 'end', 'pause', 'resume', 'restart'] as const).forEach(flow);

    socket.on('admin:settings', (raw) => {
      const room = adminRoomOf();
      const p = room && parse(socket, gameSettingsSchema, raw);
      if (room && p) game.setSettings(room, p);
    });

    // ---------- lifecycle ----------
    socket.on('disconnect', () => {
      const { roomCode, playerId } = socket.data;
      if (!roomCode || !playerId) return;
      const room = rooms.disconnect(roomCode, playerId, socket.id);
      if (room) {
        broadcastPlayers(room);
        game.onRosterChange(room);
      }
    });
  });
}
