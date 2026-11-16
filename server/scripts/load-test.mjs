// Load test: N simulated phones play a full game against a running server.
// Usage: node scripts/load-test.mjs [players=100]      env: URL=http://localhost:3000 ADMIN_PIN=1234
// Reports join time, per-event fan-out latency (server clock vs. local; valid on the same machine
// or LAN with synced clocks), answer ack latency and error counts. Exit code 1 if anything is lost.
import { io } from 'socket.io-client';

const N = Number(process.argv[2] ?? 100);
const url = process.env.URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
const PIN = process.env.ADMIN_PIN ?? '1234';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mk = () => io(url, { transports: ['websocket'], reconnection: false });
const once = (s, ev, ms = 10000) =>
  new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`timeout waiting for ${ev}`)), ms);
    s.once(ev, (v) => (clearTimeout(t), res(v)));
  });
const pct = (a, p) => (a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN);
const stat = (name, a) =>
  console.log(`  ${name.padEnd(22)} n=${String(a.length).padEnd(5)} p50=${pct(a, 0.5)}ms  p95=${pct(a, 0.95)}ms  max=${Math.max(...a)}ms`);

const questionLatency = [];
const ackLatency = [];
const errors = {};
let reveals = 0;
let ackMissing = 0;

const admin = mk();
await once(admin, 'connect');
admin.emit('admin:auth', { pin: PIN });
await once(admin, 'admin:authed');
admin.emit('admin:createRoom');
const { roomCode } = await once(admin, 'room:state');
console.log(`room ${roomCode}, joining ${N} players to ${url}`);

// ---- join (in batches of 25 to mimic a crowd scanning the QR, not one giant spike) ----
const tJoin = Date.now();
const players = [];
for (let i = 0; i < N; i += 25) {
  await Promise.all(
    Array.from({ length: Math.min(25, N - i) }, async (_, k) => {
      const s = mk();
      await once(s, 'connect');
      s.emit('player:join', { roomCode, nickname: `bot${i + k}`, avatarId: (i + k) % 8 });
      const st = await once(s, 'room:state');
      const p = { s, id: st.you.id, answering: null };
      s.on('error', (e) => (errors[e.code] = (errors[e.code] ?? 0) + 1));
      s.on('game:question', (q) => {
        questionLatency.push(Math.max(0, Date.now() - q.serverNow));
        // think for 0.3s .. 80% of the time limit, ~10% never answer
        if (Math.random() < 0.1) return;
        const intro = Math.max(0, (q.startsAt ?? q.serverNow) - q.serverNow);
        const wait = intro + 300 + Math.random() * (q.limitMs * 0.8 - 300);
        const imageId = q.view.images[Math.floor(Math.random() * q.view.images.length)].id;
        setTimeout(() => {
          p.sentAt = Date.now();
          p.pendingAck = true;
          s.emit('player:answer', { questionId: q.questionId, imageId });
        }, wait);
      });
      s.on('player:answerAck', () => {
        p.pendingAck = false;
        ackLatency.push(Date.now() - p.sentAt);
      });
      s.on('game:reveal', () => {
        reveals++;
        if (p.pendingAck) ackMissing++;
      });
      players.push(p);
    }),
  );
}
console.log(`joined ${players.length}/${N} in ${Date.now() - tJoin}ms`);

// ---- play the whole game, admin driving every phase ----
let nQuestions = 0;
admin.on('error', (e) => (errors['admin:' + e.code] = (errors['admin:' + e.code] ?? 0) + 1));
const ended = new Promise((res) => admin.once('game:ended', res));
admin.on('game:question', () => nQuestions++);
admin.on('game:reveal', async () => {
  await sleep(500);
  admin.emit('admin:showLeaderboard');
});
admin.on('game:leaderboard', async () => {
  await sleep(500);
  admin.emit('admin:next');
});
const t0 = Date.now();
admin.emit('admin:start');
await Promise.race([ended, sleep(10 * 60_000).then(() => { throw new Error('game did not finish in 10 min'); })]);
await sleep(500);

console.log(`\ngame finished: ${nQuestions} questions in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
stat('question fan-out', questionLatency);
stat('answer ack', ackLatency);
const expectedReveals = nQuestions * players.length;
console.log(`  reveals received       ${reveals}/${expectedReveals}`);
console.log(`  answers w/o ack        ${ackMissing}`);
console.log(`  errors                 ${JSON.stringify(errors)}`);

const bad = reveals !== expectedReveals || ackMissing > 0 || players.length !== N;
console.log(bad ? '\nFAIL' : '\nPASS');
players.forEach((p) => p.s.disconnect());
admin.disconnect();
process.exit(bad ? 1 : 0);
