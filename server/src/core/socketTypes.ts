import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@ng/shared';

export interface SocketData {
  isAdmin?: boolean;
  adminAttempts?: number;
  roomCode?: string;
  playerId?: string;
}

export type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type Sock = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
