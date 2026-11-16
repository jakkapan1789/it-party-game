import type { Room } from '../core/types';

/**
 * Persistence boundary for rooms. Kept synchronous because live rooms also hold
 * timers/sockets in-process; a Redis version would need to be async + rehydrate.
 */
export interface RoomStore {
  get(code: string): Room | undefined;
  set(room: Room): void;
  delete(code: string): void;
  has(code: string): boolean;
}

export class MemoryRoomStore implements RoomStore {
  private rooms = new Map<string, Room>();
  get = (code: string) => this.rooms.get(code);
  set = (room: Room) => void this.rooms.set(room.code, room);
  delete = (code: string) => void this.rooms.delete(code);
  has = (code: string) => this.rooms.has(code);
}
