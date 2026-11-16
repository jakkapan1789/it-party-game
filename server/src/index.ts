import os from 'node:os';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@ng/shared';
import { RoomManager } from './core/RoomManager';
import { MemoryRoomStore } from './store/RoomStore';
import { registerHandlers } from './handlers';
import { GameController } from './core/GameController';
import { gameModules, DEFAULT_GAME_ID } from './games';
import type { SocketData } from './core/socketTypes';
import { adminApi } from './http/adminApi';
import { CLIENT_DIST, ROOT, UPLOADS_DIR } from './paths';
import path from 'node:path';

// npm workspaces run scripts with cwd=server/, so point dotenv at the repo root explicitly.
dotenv.config({ path: path.join(ROOT, '.env') });

const PORT = Number(process.env.PORT ?? 3000);

if (!process.env.ADMIN_PIN) console.warn('⚠️  ADMIN_PIN is not set — admin login is disabled');

const lanIps = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((i): i is os.NetworkInterfaceInfo => !!i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);

const app = express();
const rooms = new RoomManager(new MemoryRoomStore());
app.use(cors());
// gzip JS/CSS/JSON (WebP is already compressed and gets skipped). Socket.io sits on the http
// server, not this app, so it is unaffected.
app.use(compression());
app.get('/api/health', (_req, res) => res.json({ ok: true, serverNow: Date.now() }));
// Lets the admin page build a QR URL that phones on the LAN can actually reach.
app.get('/api/lan', (_req, res) => res.json({ ips: lanIps(), publicUrl: process.env.PUBLIC_URL ?? null }));
app.use(adminApi((code) => rooms.getRoom(code)));
// Uploaded files get random never-reused names (see adminApi), so they can be cached forever.
const UPLOAD_NAME = /[\\/][0-9a-f]{18}\.\w+$/;
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    setHeaders: (res, file) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (UPLOAD_NAME.test(file)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }),
);

// Production: serve the built React app from the same port.
// Vite puts a content hash in every file under /assets, so those can be cached for a year;
// index.html (and the SPA fallback) must always be revalidated so a deploy shows up at once.
if (existsSync(CLIENT_DIST)) {
  app.use(
    express.static(CLIENT_DIST, {
      index: false,
      setHeaders: (res, file) => {
        const hashed = file.startsWith(path.join(CLIENT_DIST, 'assets') + path.sep);
        res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    }),
  );
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, { cors: { origin: true } });
const introMs = Math.max(0, Number(process.env.QUESTION_INTRO_MS ?? 3000) || 0);
registerHandlers(io, rooms, new GameController(io, gameModules, DEFAULT_GAME_ID, introMs));

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
