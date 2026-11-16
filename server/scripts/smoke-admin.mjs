// Checks the admin REST API (auth, upload, question editing). Restores the question file afterwards.
// Usage: PORT=3000 ADMIN_PIN=1234 node scripts/smoke-admin.mjs
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = `http://localhost:${process.env.PORT ?? 3000}`;
const PIN = process.env.ADMIN_PIN ?? '1234';
const uploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');
const H = { 'x-admin-pin': PIN };
let fails = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
  if (!ok) fails++;
};
const put = (body) =>
  fetch(`${base}/api/admin/questions`, { method: 'PUT', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const upload = (bytes, type, name = 'x.png') => {
  const fd = new FormData();
  fd.append('image', new Blob([bytes], { type }), name);
  return fetch(`${base}/api/admin/upload`, { method: 'POST', headers: H, body: fd });
};

check('no PIN → 401', (await fetch(`${base}/api/admin/questions`)).status === 401);
check('wrong PIN → 401', (await fetch(`${base}/api/admin/questions`, { headers: { 'x-admin-pin': 'nope' } })).status === 401);

const original = await (await fetch(`${base}/api/admin/questions`, { headers: H })).json();
check('GET questions', Array.isArray(original) && original.length > 0, `${original.length} questions`);

const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
const unauth = await fetch(`${base}/api/admin/upload`, { method: 'POST', body: new FormData() });
check('upload without PIN → 401', unauth.status === 401);
check('non-image rejected (415)', (await upload(new TextEncoder().encode('<script>1</script>'), 'text/html', 'a.html')).status === 415);
check('svg rejected (415)', (await upload(new TextEncoder().encode('<svg/>'), 'image/svg+xml', 'a.svg')).status === 415);
const big = await upload(new Uint8Array(15 * 1024 * 1024 + 10), 'image/png');
check('oversize rejected (413)', big.status === 413);
check('bytes that are not an image rejected (415)', (await upload(new Uint8Array(1000), 'image/png', 'fake.png')).status === 415);

const ok = await upload(png, 'image/png', '../../evil name.png');
const { src } = await ok.json();
check('png accepted, re-encoded to webp under a random name', ok.status === 200 && /^\/uploads\/[0-9a-f]{18}\.webp$/.test(src), src);
const served = await fetch(`${base}${src}`);
check('uploaded image is served with nosniff', served.status === 200 && served.headers.get('x-content-type-options') === 'nosniff');

const q = (id, extra = {}) => ({ id, prompt: 'ทดสอบ', images: [{ id: 'a', src }, { id: 'b', src }], correctImageId: 'a', timeLimitSec: 7, ...extra });
check('duplicate ids rejected', (await put([q('x'), q('x')])).status === 400);
check('unknown correctImageId rejected', (await put([q('x', { correctImageId: 'zzz' })])).status === 400);
check('external image url rejected', (await put([q('x', { images: [{ id: 'a', src: 'https://evil.example/a.png' }, { id: 'b', src }] })])).status === 400);
check('empty list rejected', (await put([])).status === 400);
check('3 images rejected', (await put([q('x', { images: [{ id: 'a', src }, { id: 'b', src }, { id: 'c', src }] })])).status === 400);

const saved = await put([q('t1'), q('t2', { timeLimitSec: undefined })]);
check('valid save', saved.status === 200);
const back = await (await fetch(`${base}/api/admin/questions`, { headers: H })).json();
check('saved set reads back (default time applied)', back.length === 2 && back[1].timeLimitSec === 10 && back[0].timeLimitSec === 7);

// restore
check('restore original', (await put(original)).status === 200);
await unlink(path.join(uploadsDir, path.basename(src))).catch(() => {});
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
