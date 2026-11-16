// End-to-end check of the game loop against a running server.
// Usage: PORT=3000 ADMIN_PIN=1234 node scripts/smoke-game.mjs   (takes ~15s: one question times out on purpose)
import { io } from 'socket.io-client';

const url = `http://localhost:${process.env.PORT ?? 3000}`;
const PIN = process.env.ADMIN_PIN ?? '1234';
const mk = () => io(url, { transports: ['websocket'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const once = (s, ev, ms = 4000) =>
  new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`timeout waiting for ${ev}`)), ms);
    s.once(ev, (v) => (clearTimeout(t), res(v)));
  });
/** Wait out the question intro (startsAt is server clock; serverNow ≈ when we received it). */
const untilStart = (q) => sleep(Math.max(0, q.startsAt - q.serverNow) + 30);
let fails = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
  if (!ok) fails++;
};

// The test must not depend on which questions are saved: read the answer key from the API.
const key = await (await fetch(`${url}/api/admin/questions`, { headers: { 'x-admin-pin': PIN } })).json();
const right = (qid) => key.find((q) => q.id === qid).correctImageId;
const wrong = (qid) => key.find((q) => q.id === qid).images.find((i) => i.id !== right(qid)).id;

const admin = mk();
await once(admin, 'connect');
admin.emit('admin:auth', { pin: PIN });
await once(admin, 'admin:authed');
admin.emit('admin:createRoom');
const { roomCode } = await once(admin, 'room:state');

const join = async (nickname, avatarId) => {
  const s = mk();
  await once(s, 'connect');
  s.emit('player:join', { roomCode, nickname, avatarId });
  const st = await once(s, 'room:state');
  return { s, id: st.you.id };
};
const A = await join('เอ', 0);
const B = await join('บี', 1);
const C = await join('ซี', 2);

admin.emit('admin:reveal');
check('reveal in LOBBY rejected', (await once(admin, 'error')).code === 'WRONG_PHASE');

// ---- Q1: A fast & right, B right later, C wrong ----
const qs = [A, B, C].map((p) => once(p.s, 'game:question'));
const hostQ = once(admin, 'game:question');
admin.emit('admin:start');
const [qa, qb, qc] = await Promise.all(qs);
const qh = await hostQ;
check('question has no correct answer leaked', !JSON.stringify([qa, qb, qh]).includes('correctImageId'));
check('endsAt/serverNow present', qa.endsAt > qa.serverNow && qa.limitMs === 10000);
check('host and player see same images (as a set)', qa.view.images.map((i) => i.id).sort().join() === qh.view.images.map((i) => i.id).sort().join());
const orders = new Set();
for (let i = 0; i < 1; i++) orders.add(qa.view.images.map((x) => x.id).join());
console.log('      A order:', qa.view.images.map((i) => i.id).join(','), ' B order:', qb.view.images.map((i) => i.id).join(','), ' C order:', qc.view.images.map((i) => i.id).join(','));

const introMs = qa.startsAt - qa.serverNow;
check('startsAt present, endsAt = startsAt + limit', introMs >= 0 && qa.endsAt - qa.startsAt === qa.limitMs, `intro=${introMs}ms`);
if (introMs > 500) {
  A.s.emit('player:answer', { questionId: qa.questionId, imageId: right(qa.questionId) });
  check('answer during intro rejected', (await once(A.s, 'error')).code === 'WRONG_PHASE');
}
await untilStart(qa);

const revs = [A, B, C].map((p) => once(p.s, 'game:reveal'));
A.s.emit('player:answer', { questionId: qa.questionId, imageId: right(qa.questionId) });
const ack = await once(A.s, 'player:answerAck');
check('answer acked & locked', ack.answer === right(qa.questionId));
A.s.emit('player:answer', { questionId: qa.questionId, imageId: wrong(qa.questionId) });
check('second answer rejected (first wins)', (await once(A.s, 'error')).code === 'ALREADY_ANSWERED');
C.s.emit('player:answer', { questionId: qa.questionId, imageId: 'zzz' });
check('bogus image id rejected', (await once(C.s, 'error')).code === 'BAD_ANSWER');
await sleep(1200);
B.s.emit('player:answer', { questionId: qa.questionId, imageId: right(qa.questionId) });
C.s.emit('player:answer', { questionId: qa.questionId, imageId: wrong(qa.questionId) });
const [ra, rb, rc] = await Promise.all(revs); // auto-reveal when everyone answered
check('auto-reveal once all answered', true);
check('A correct, fast bonus', ra.yourResult.correct && ra.yourResult.points > rb.yourResult.points && ra.yourResult.points >= 500 && ra.yourResult.points <= 1000, `A=${ra.yourResult.points} B=${rb.yourResult.points}`);
check('C wrong = 0', !rc.yourResult.correct && rc.yourResult.points === 0);
check('distribution right:2 wrong:1', ra.view.distribution[right(qa.questionId)] === 2 && ra.view.distribution[wrong(qa.questionId)] === 1);
check('A ranked first', ra.yourResult.rank === 1);

// late joiner waits
const D = await join('ดี', 3);
// (state emitted before we could read waiting; re-join to check snapshot)
D.s.emit('player:join', { roomCode, nickname: 'ดี', avatarId: 3, playerId: D.id });
const dState = await once(D.s, 'room:state');
check('mid-game joiner is waiting', dState.waiting === true);

// ---- leaderboard ----
const lbA = once(A.s, 'game:leaderboard');
admin.emit('admin:showLeaderboard');
const lb = await lbA;
check('leaderboard has you + top', lb.you.rank === 1 && lb.top[0].nickname === 'เอ');

// ---- Q2: A answers right (streak 2), nobody else answers → timeout path ----
const q2A = once(A.s, 'game:question');
const q2D = once(D.s, 'game:question');
admin.emit('admin:next');
const [q2, q2d] = await Promise.all([q2A, q2D]);
check('waiting joiner included in next question', !!q2d.questionId);
const correct2 = right(q2.questionId);
await untilStart(q2);
A.s.emit('player:answer', { questionId: q2.questionId, imageId: correct2 });
await once(A.s, 'player:answerAck');
const t0 = Date.now();
// pause: clock freezes, answers rejected, resume restores the remaining time
await sleep(1500);
const pausedEv = once(A.s, 'game:pause');
admin.emit('admin:pause');
const pe = await pausedEv;
check('pause broadcast with remaining time', pe.paused && pe.remainingMs > 7000 && pe.remainingMs < 9000, `${pe.remainingMs}ms left`);
B.s.emit('player:answer', { questionId: q2.questionId, imageId: correct2 });
check('answer while paused rejected', (await once(B.s, 'error')).code === 'PAUSED');
admin.emit('admin:pause');
check('double pause rejected', (await once(admin, 'error')).code === 'WRONG_PHASE');
await sleep(2000);
const resumedEv = once(A.s, 'game:pause');
admin.emit('admin:resume');
const re = await resumedEv;
check('resume sets a later deadline', !re.paused && re.endsAt > Date.now() + 6000, `${re.endsAt - Date.now()}ms ahead`);
const r2 = await once(A.s, 'game:reveal', 15000);
const dt = Date.now() - t0;
check('reveal fires at deadline + grace + paused time (~12.3s)', dt > 11800 && dt < 13200, `${dt}ms`);
check('streak bonus applied on 2nd correct', r2.yourResult.streak === 2 && r2.yourResult.points >= 600, `pts=${r2.yourResult.points}`);

// late answer after reveal
B.s.emit('player:answer', { questionId: q2.questionId, imageId: correct2 });
check('answer after reveal rejected', ['WRONG_PHASE', 'TOO_LATE'].includes((await once(B.s, 'error')).code));

// ---- reconnect mid-REVEAL gets the reveal replayed ----
const A2 = mk();
await once(A2, 'connect');
const replay = once(A2, 'game:reveal');
A2.emit('player:join', { roomCode, nickname: 'เอ', avatarId: 0, playerId: A.id });
const rp = await replay;
check('rejoin during REVEAL replays reveal', rp.questionId === q2.questionId && rp.yourResult.answered);

// ---- end ----
const ended = once(A2, 'game:ended');
admin.emit('admin:end');
const e = await ended;
check('game:ended has top + you', e.top.length >= 3 && e.you.rank === 1);
admin.emit('admin:next');
check('next after ENDED rejected', (await once(admin, 'error')).code === 'WRONG_PHASE');

// ---- report ----
const api = (path, pin = PIN) => fetch(`${url}${path}`, { headers: { 'x-admin-pin': pin } });
check('report needs PIN', (await api(`/api/admin/report/live/${roomCode}`, 'wrong')).status === 401);
const rres = await api(`/api/admin/report/live/${roomCode}`);
const rep = await rres.json();
check('live report ok', rres.status === 200 && rep.roomCode === roomCode && rep.questions.length === 2, `questions=${rep.questions?.length}`);
check('report question label + counts', rep.questions[0].label && rep.questions[0].eligible >= 3 && rep.questions[0].answered <= rep.questions[0].eligible);
const repA = rep.players.find((p) => p.nickname === 'เอ');
check('report player A ranked 1st with 2 correct, best streak 2', repA?.rank === 1 && repA.correct === 2 && repA.bestStreak === 2, JSON.stringify(repA));
check('report scores match game:ended', e.top[0].score === rep.players[0].score);
await sleep(300); // saved asynchronously on end
const list = await (await api('/api/admin/reports')).json();
check('report saved and listed', list.some((x) => x.id === rep.id && x.roomCode === roomCode));
check('saved report loads', (await (await api(`/api/admin/reports/${rep.id}`)).json()).roomCode === roomCode);
check('traversal id rejected', (await api('/api/admin/reports/..%2F..%2F.env')).status === 404);
check('unknown room 404', (await api('/api/admin/report/live/000000')).status === 404);

[admin, A.s, A2, B.s, C.s, D.s].forEach((s) => s.disconnect());
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
