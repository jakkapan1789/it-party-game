import { randomBytes, randomInt } from 'node:crypto';
import type { PlayerJoinPayload, PlayerPublic, PlayerUpdatePayload, RoomState, ErrorCode } from '@ng/shared';
import { ROOM_CODE_LENGTH } from '@ng/shared';
import type { RoomStore } from '../store/RoomStore';
import type { Player, Room } from './types';

export const MAX_PLAYERS = 300;

export type JoinResult = { ok: true; room: Room; player: Player } | { ok: false; code: ErrorCode };

const normName = (s: string) => s.normalize('NFC').trim().toLocaleLowerCase();

export const toPublic = (p: Player): PlayerPublic => ({
  id: p.id,
  nickname: p.nickname,
  avatarId: p.avatarId,
  score: p.score,
  connected: p.connected,
});

export class RoomManager {
  constructor(private store: RoomStore) {}

  createRoom(): Room {
    let code: string;
    do {
      code = String(randomInt(0, 10 ** ROOM_CODE_LENGTH)).padStart(ROOM_CODE_LENGTH, '0');
    } while (this.store.has(code));
    const room: Room = {
      code,
      phase: 'LOBBY',
      players: new Map(),
      createdAt: Date.now(),
      settings: { autoRevealWhenAllAnswered: true },
    };
    this.store.set(room);
    return room;
  }

  getRoom(code: string) {
    return this.store.get(code);
  }

  /** Join as a new player, or rejoin when `playerId` matches an existing one. */
  join(p: PlayerJoinPayload, socketId: string): JoinResult {
    const room = this.store.get(p.roomCode);
    if (!room) return { ok: false, code: 'ROOM_NOT_FOUND' };

    const existing = p.playerId ? room.players.get(p.playerId) : undefined;
    if (existing) {
      existing.socketId = socketId;
      existing.connected = true;
      return { ok: true, room, player: existing };
    }

    if (room.players.size >= MAX_PLAYERS) return { ok: false, code: 'ROOM_FULL' };
    const wanted = normName(p.nickname);
    for (const other of room.players.values()) {
      if (normName(other.nickname) === wanted) return { ok: false, code: 'NAME_TAKEN' };
    }

    const player: Player = {
      id: randomBytes(12).toString('base64url'),
      nickname: p.nickname.normalize('NFC'),
      avatarId: p.avatarId,
      score: 0,
      streak: 0,
      socketId,
      connected: true,
    };
    room.players.set(player.id, player);
    return { ok: true, room, player };
  }

  /** Change a player's nickname/avatar. The name must stay unique among the other players. */
  updateProfile(room: Room, playerId: string, p: PlayerUpdatePayload): { ok: true; player: Player } | { ok: false; code: ErrorCode } {
    const player = room.players.get(playerId);
    if (!player) return { ok: false, code: 'ROOM_NOT_FOUND' };
    const wanted = normName(p.nickname);
    for (const other of room.players.values()) {
      if (other.id !== playerId && normName(other.nickname) === wanted) return { ok: false, code: 'NAME_TAKEN' };
    }
    player.nickname = p.nickname.normalize('NFC');
    player.avatarId = p.avatarId;
    return { ok: true, player };
  }

  /** Mark offline only if this socket is still the player's current one. */
  disconnect(code: string, playerId: string, socketId: string): Room | undefined {
    const room = this.store.get(code);
    const player = room?.players.get(playerId);
    if (!room || !player || player.socketId !== socketId) return undefined;
    player.connected = false;
    player.socketId = null;
    return room;
  }

  kick(code: string, playerId: string): { room: Room; player: Player } | undefined {
    const room = this.store.get(code);
    const player = room?.players.get(playerId);
    if (!room || !player) return undefined;
    room.players.delete(playerId);
    return { room, player };
  }

  state(room: Room, you?: Player, waiting = false): RoomState {
    return {
      roomCode: room.code,
      phase: room.phase,
      playerCount: room.players.size,
      you: you ? toPublic(you) : undefined,
      waiting: waiting || undefined,
      settings: room.settings,
    };
  }
}
