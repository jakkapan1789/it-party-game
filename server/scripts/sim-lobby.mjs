// Lobby simulator: N fake phones join a room one after another and stay in the waiting room,
// so you can watch the lobby on the host screen and on a real phone.
//
// Usage:
//   npm run sim -w server -- [players=30] [options]
//
//   --room 123456   join a room you created on /admin (default: create a new room, which needs ADMIN_PIN)
//   --delay 400     ms between joins (default 400; 0 = all at once)
//   --churn         keep things moving: bots rename / switch avatar, drop offline and come back
//   --start         press "start game" on the host when everyone is in (new rooms only)
//
// env: URL=http://localhost:3000  PORT=3000  ADMIN_PIN=1234
// Ctrl+C disconnects everybody. Joined players show up on the host screen like real ones.
import { io } from 'socket.io-client';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : dflt;
};
const N = Number(args.find((a) => /^\d+$/.test(a)) ?? 30);
const DELAY = Number(opt('delay', 400));
const url = process.env.URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
const PIN = process.env.ADMIN_PIN ?? '1234';
const AVATARS = 6; // keep in sync with AVATAR_COUNT in shared/src/types.ts

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const mk = () => io(url, { transports: ['websocket'], reconnection: false });
const once = (s, ev, ms = 8000) =>
  new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`timeout waiting for ${ev}`)), ms);
    s.once(ev, (v) => (clearTimeout(t), res(v)));
  });

const NAMES = [
  'มะลิ', 'ต้นกล้า', 'น้องบัว', 'ฟ้าใส', 'ดาวเหนือ', 'ลมหนาว', 'แพรวา', 'ภูผา', 'ใบเตย', 'น้ำใส', 'ข้าวหอม', 'พลอย',
  'Golf', 'May', 'Meow', 'Ben', 'Luna', 'Panda', 'Mint', 'Fern', 'Tom', 'Nana', 'Pop', 'Bank', 'Ice', 'Joy', 'Kai', 'Zen',
  'พี่โอ๊ค', 'น้องเมย์', 'ครูเจน', 'ลุงตู่', 'ป้าแมว', 'เจ้านาย', 'หมีขาว', 'เสือน้อย', 'กุ้งเผา', 'ปลาทอง', 'ดอกไม้', 'ชาเขียว',
];
const used = new Set();
const uniqueName = (i) => {
  let n = NAMES[i % NAMES.length];
  if (i >= NAMES.length || used.has(n)) n = `${n}${i + 1}`.slice(0, 16);
  used.add(n);
  return n;
};

// ---- the room ----
let roomCode = opt('room', '');
let admin;
if (!roomCode) {
  admin = mk();
  await once(admin, 'connect');
  admin.emit('admin:auth', { pin: PIN });
  try {
    await once(admin, 'admin:authed', 4000);
  } catch {
    console.error(`Could not log in as host (ADMIN_PIN=${PIN}). Set ADMIN_PIN, or pass --room <code> to join a room made on /admin.`);
    process.exit(1);
  }
  admin.emit('admin:createRoom');
  ({ roomCode } = await once(admin, 'room:state'));
}
console.log(`\nRoom ${roomCode}   (${N} players, one every ${DELAY} ms${flag('churn') ? ', churn on' : ''})`);
const web = url.replace(':3000', ':5173');
console.log(`  player screen : ${web}/?code=${roomCode}`);
console.log(
  args.includes('--room')
    ? `  host screen   : ${web}/admin   (the room you created there)\n`
    : `  host screen   : this room was made by the script, so /admin won't show it.\n                  To watch it on the host: create a room on ${web}/admin, then run\n                  npm run sim -w server -- ${N} --room <that code>\n`,
);

// ---- the players ----
const bots = [];
const addBot = async (i) => {
  const s = mk();
  await once(s, 'connect');
  const nickname = uniqueName(i);
  const avatarId = Math.floor(Math.random() * AVATARS);
  s.emit('player:join', { roomCode, nickname, avatarId });
  const state = await Promise.race([once(s, 'room:state'), once(s, 'error').then((e) => Promise.reject(new Error(e.code)))]);
  const bot = { s, id: state.you.id, nickname, avatarId, online: true };
  bots.push(bot);
  console.log(`+ ${String(bots.length).padStart(3)}/${N}  ${nickname.padEnd(14)} avatar ${avatarId + 1}`);
  return bot;
};

const joinAll = async () => {
  for (let i = 0; i < N; i++) {
    try {
      await addBot(i);
    } catch (e) {
      console.log(`! join ${i + 1} failed: ${e.message}`);
    }
    if (DELAY) await sleep(DELAY);
  }
};

const update = (bot, nickname, avatarId) =>
  new Promise((res) => bot.s.emit('player:update', { nickname, avatarId }, res));

const churn = async () => {
  for (;;) {
    await sleep(1200 + Math.random() * 1800);
    const bot = pick(bots);
    if (!bot) continue;
    const roll = Math.random();
    if (roll < 0.5 && bot.online) {
      const avatarId = Math.floor(Math.random() * AVATARS);
      const nickname = Math.random() < 0.4 ? `${pick(NAMES)}${Math.floor(Math.random() * 90 + 10)}`.slice(0, 16) : bot.nickname;
      const res = await update(bot, nickname, avatarId);
      if (res.ok) {
        console.log(`~ ${bot.nickname} → ${nickname} (avatar ${avatarId + 1})`);
        Object.assign(bot, { nickname, avatarId });
      }
    } else if (bot.online) {
      bot.online = false;
      bot.s.disconnect();
      console.log(`- ${bot.nickname} went offline`);
      setTimeout(async () => {
        const s = mk();
        await once(s, 'connect').catch(() => {});
        s.emit('player:join', { roomCode, nickname: bot.nickname, avatarId: bot.avatarId, playerId: bot.id });
        await once(s, 'room:state').catch(() => {});
        bot.s = s;
        bot.online = true;
        console.log(`+ ${bot.nickname} is back`);
      }, 2500 + Math.random() * 2500);
    }
  }
};

await joinAll();
console.log(`\nAll ${bots.length} players are in room ${roomCode}. Ctrl+C to disconnect them.`);
if (flag('start') && admin) {
  await sleep(1500);
  admin.emit('admin:start');
  console.log('Started the game from the host.');
}
if (flag('churn')) void churn();

const bye = () => {
  bots.forEach((b) => b.s.disconnect());
  admin?.disconnect();
  process.exit(0);
};
process.on('SIGINT', bye);
process.on('SIGTERM', bye);
await new Promise(() => {}); // stay connected
