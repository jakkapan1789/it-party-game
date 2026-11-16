// Quick end-to-end check of room/lobby rules against a running server.
// Usage: PORT=3000 ADMIN_PIN=1234 node scripts/smoke-lobby.mjs
import { io } from 'socket.io-client';

const url = `http://localhost:${process.env.PORT ?? 3000}`;
const PIN = process.env.ADMIN_PIN ?? '1234';
const mk = () => io(url, { transports: ['websocket'] });
const once = (s, ev, ms = 2000) =>
  new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`timeout waiting for ${ev}`)), ms);
    s.once(ev, (v) => (clearTimeout(t), res(v)));
  });
let fails = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
  if (!ok) fails++;
};

const admin = mk();
await once(admin, 'connect');

admin.emit('admin:createRoom');
check('createRoom without auth is rejected', (await once(admin, 'error')).code === 'UNAUTHORIZED');
admin.emit('admin:auth', { pin: 'wrong' });
check('wrong PIN rejected', (await once(admin, 'error')).code === 'UNAUTHORIZED');
admin.emit('admin:auth', { pin: PIN });
await once(admin, 'admin:authed');
admin.emit('admin:createRoom');
const { roomCode } = await once(admin, 'room:state');
check('room code is 6 digits', /^\d{6}$/.test(roomCode), roomCode);

const a = mk();
await once(a, 'connect');
a.emit('player:join', { roomCode, nickname: '  สมชาย ', avatarId: 2 });
const sa = await once(a, 'room:state');
check('player joins, nickname trimmed', sa.you?.nickname === 'สมชาย');

const b = mk();
await once(b, 'connect');
b.emit('player:join', { roomCode, nickname: 'สมชาย', avatarId: 1 });
check('duplicate name rejected', (await once(b, 'error')).code === 'NAME_TAKEN');
b.emit('player:join', { roomCode, nickname: 'x'.repeat(17), avatarId: 1 });
check('17-char name rejected', (await once(b, 'error')).code === 'BAD_REQUEST');
b.emit('player:join', { roomCode: '000000', nickname: 'ok', avatarId: 1 });
check('unknown room rejected', (await once(b, 'error')).code === 'ROOM_NOT_FOUND');
b.emit('player:join', { roomCode, nickname: 'สมหญิง', avatarId: 1 });
const sb = await once(b, 'room:state');

await new Promise((r) => setTimeout(r, 400));
// listen for both before asking: the server sends them back to back, a late listener can miss the second
const listP = once(admin, 'room:players');
admin.emit('admin:reconnect', { roomCode });
const list = await listP;
check('admin sees 2 players', list.count === 2 && list.players.length === 2);

// disconnect + rejoin with same playerId keeps identity
a.disconnect();
await new Promise((r) => setTimeout(r, 400));
const a2 = mk();
await once(a2, 'connect');
a2.emit('player:join', { roomCode, nickname: 'สมชาย', avatarId: 2, playerId: sa.you.id });
const sa2 = await once(a2, 'room:state');
check('rejoin keeps playerId', sa2.you.id === sa.you.id && sa2.playerCount === 2);

// non-admin cannot kick
b.emit('admin:kick', { playerId: sa.you.id });
check('player cannot kick', (await once(b, 'error')).code === 'UNAUTHORIZED');

// admin kicks b
admin.emit('admin:kick', { playerId: sb.you.id });
await once(b, 'player:kicked');
check('kicked player notified', true);
await new Promise((r) => setTimeout(r, 400));
b.emit('player:join', { roomCode, nickname: 'สมหญิง', avatarId: 1, playerId: sb.you.id });
const sb2 = await once(b, 'room:state');
check('kicked id is not honored (new identity)', sb2.you.id !== sb.you.id);

// ---- change name / avatar in the lobby (ack-based: errors must not use the global `error` event) ----
const upd = (sock, payload) => new Promise((res) => sock.emit('player:update', payload, res));
let errorEvents = 0;
a2.on('error', () => errorEvents++);
const stateAfter = once(a2, 'room:state');
check('rename + avatar change ok', (await upd(a2, { nickname: '  ใหม่ ', avatarId: 5 })).ok === true);
const su = await stateAfter;
check('player gets a fresh room:state with the new profile', su.you.nickname === 'ใหม่' && su.you.avatarId === 5);
await new Promise((r) => setTimeout(r, 400));
// listen for both before asking: the server sends them back to back, a late listener can miss the second
const list2P = once(admin, 'room:players');
admin.emit('admin:reconnect', { roomCode });
const list2 = await list2P;
check('host list shows the new name/avatar', list2.players.some((p) => p.nickname === 'ใหม่' && p.avatarId === 5));
check('keeping your own name is fine', (await upd(a2, { nickname: 'ใหม่', avatarId: 4 })).ok === true);
check('name taken by another player is refused (case-insensitive)', (await upd(a2, { nickname: 'สมหญิง', avatarId: 4 })).code === 'NAME_TAKEN');
check('avatar id out of range refused', (await upd(a2, { nickname: 'ใหม่', avatarId: 6 })).code === 'BAD_REQUEST');
check('17-char name refused', (await upd(a2, { nickname: 'x'.repeat(17), avatarId: 1 })).code === 'BAD_REQUEST');
check('refusals did not use the global error event (would drop the player)', errorEvents === 0);

// ---- leave for good frees the nickname; a plain disconnect keeps it reserved ----
const c = mk();
await once(c, 'connect');
c.emit('player:join', { roomCode, nickname: 'ออกแล้ว', avatarId: 1 });
await once(c, 'room:state');
c.disconnect();
await new Promise((r) => setTimeout(r, 300));
const c2 = mk();
await once(c2, 'connect');
c2.emit('player:join', { roomCode, nickname: 'ออกแล้ว', avatarId: 1 });
check('after a plain disconnect the name stays reserved (offline player can come back)', (await once(c2, 'error')).code === 'NAME_TAKEN');
c2.disconnect();
const d = mk();
await once(d, 'connect');
d.emit('player:join', { roomCode, nickname: 'ลาก่อน', avatarId: 2 });
await once(d, 'room:state');
await new Promise((res) => d.emit('player:leave', res));
check('player:leave is acknowledged', true);
d.disconnect();
await new Promise((r) => setTimeout(r, 300));
const d2 = mk();
await once(d2, 'connect');
d2.emit('player:join', { roomCode, nickname: 'ลาก่อน', avatarId: 3 });
const sd2 = await Promise.race([once(d2, 'room:state'), once(d2, 'error')]);
check('after leaving, the same name can join again', sd2.you?.nickname === 'ลาก่อน', JSON.stringify(sd2.code ?? ''));
await new Promise((r) => setTimeout(r, 400));
// listen for both before asking: the server sends them back to back, a late listener can miss the second
const list3P = once(admin, 'room:players');
admin.emit('admin:reconnect', { roomCode });
const list3 = await list3P;
check('the left player is gone from the host list (only the new one is there)', list3.players.filter((p) => p.nickname === 'ลาก่อน').length === 1);
d2.disconnect();

[admin, a2, b].forEach((s) => s.disconnect());
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
