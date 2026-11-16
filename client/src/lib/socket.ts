import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@ng/shared';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({ autoConnect: false });
