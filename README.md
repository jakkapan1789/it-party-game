# New Year Game 🎆

เกมปาร์ตี้ปีใหม่แบบ multiplayer บนมือถือ รองรับผู้เล่น 50–200 คนพร้อมกัน
**ผู้เล่น** สแกน QR เข้าห้องด้วยมือถือ · **Host** ควบคุมเกมจากโปรเจกเตอร์/แท็บเล็ต

มี 2 เกม: **เกมเลือกภาพ** (โจทย์ + ภาพ 2 ภาพ) และ **เกมตอบคำถาม** (ตัวเลือก A–D)
แต่ละเกมสร้าง **ชุดเกม** (เลือกข้อ/สุ่มลำดับ) ไว้เล่นได้หลายชุด · เพิ่มมินิเกมใหม่ได้ผ่าน interface `GameModule` (ดูด้านล่าง)

## โครงสร้าง

```
shared/   types, zod schemas, socket event types (ใช้ร่วม server+client)
server/   Express + Socket.io + TypeScript (กฎเกมทั้งหมดอยู่ที่นี่)
client/   React + Vite + Tailwind + Framer Motion (UI ภาษาไทยอยู่ที่ client/src/i18n/th.ts)
```

## รันบนเครื่อง (dev)

```bash
npm install
cp .env.example .env     # แก้ ADMIN_PIN ก่อนใช้งานจริง
npm run dev              # server :3000, client :5173 (Vite proxy ไป server)
```

- Host: เปิด `http://localhost:5173/admin` → ใส่ PIN → สร้างห้อง → **เลือกเล่นเกม** → เลือกชุดเกม → เริ่มเกม
- ผู้เล่น: สแกน QR บนหน้า Host หรือเปิด `/` แล้วใส่รหัสห้อง
- หน้าแอดมินอื่นๆ: `/admin/games` (เลือกเกม / จัดการชุดเกม), `/admin/questions` (คลังคำถามเกมเลือกภาพ + อัปโหลดรูป),
  `/admin/quiz-questions` (คลังคำถามเกมตอบคำถาม), `/admin/report` (รายงานผลเกม)

### เล่นผ่าน WiFi วงเดียวกัน (LAN)

1. มือถือกับคอมต้องอยู่ WiFi เดียวกัน (ปิด "AP/Client isolation" ที่ router ถ้ามี)
2. `npm run build && npm start` แล้วเปิด Host ที่ `http://<IP-เครื่อง>:3000/admin`
   (หน้า Host ดึง IP ใน LAN มาทำ QR ให้เอง; ถ้า IP ผิดให้ตั้ง `PUBLIC_URL=http://192.168.x.x:3000` ใน `.env`)
3. ถ้า firewall ของเครื่อง host ถามเรื่อง port 3000 ให้อนุญาต

## Production (พอร์ตเดียว)

```bash
npm run build   # build client แล้ว bundle server
npm start       # Express เสิร์ฟทั้ง API, socket และหน้าเว็บที่ :PORT
```

| ตัวแปร | ความหมาย |
|---|---|
| `ADMIN_PIN` | PIN เข้าหน้า Host (**ต้องเปลี่ยน**) |
| `PORT` | พอร์ต (default 3000; platform ส่วนใหญ่ตั้งให้เอง) |
| `PUBLIC_URL` | URL สาธารณะสำหรับสร้าง QR เช่น `https://party.example.com` |
| `DATA_DIR` / `UPLOADS_DIR` | โฟลเดอร์เก็บข้อมูล (คลังคำถาม, ชุดเกม, รายงาน) / รูปที่อัปโหลด (ชี้ไป volume ถาวรได้) |

ไฟล์ข้อมูลใน `DATA_DIR`: `game1-questions.json` (เกมเลือกภาพ), `game2-questions.json` (เกมตอบคำถาม),
`packages.json` (ชุดเกม) และโฟลเดอร์ `reports/` (รายงานผลเกม สร้างเอง)

### Deploy บน Render (แนะนำ: Web Service เดียว)

หน้าเว็บ, API และ Socket.io ออกจาก server ตัวเดียวพอร์ตเดียว จึง **ไม่ต้องแยก** frontend/backend
(Vercel ใช้กับเกมนี้ไม่ได้ เพราะไม่รองรับ WebSocket server ที่ต้องเปิดค้าง; ถ้าจะวางหน้าเว็บบน Vercel ต้องแก้โค้ดให้ต่อ socket/API ข้ามโดเมนก่อน)

- New → **Web Service** → เชื่อม repo นี้ · Runtime: Node
- Build command: `npm install && npm run build` · Start command: `npm start`
- Environment: `ADMIN_PIN` (**เปลี่ยนจาก 1234**), `PUBLIC_URL` = URL ของ service เช่น `https://it-party-game.onrender.com` (ใช้ทำ QR)
- **ดิสก์ชั่วคราว**: คลังคำถาม, ชุดเกม, รายงาน และรูปที่อัปโหลดจะ **หายทุกครั้งที่ redeploy/restart**
  ถ้าต้องเก็บไว้ ให้เพิ่ม Render Disk (แพ็กเสียเงิน) เช่น mount ที่ `/var/data` แล้วตั้ง
  `DATA_DIR=/var/data/data` และ `UPLOADS_DIR=/var/data/uploads`
  ครั้งแรกให้ copy ไฟล์ทั้งหมดใน `server/data/` (`game1-questions.json`, `game2-questions.json`, `packages.json`)
  ไปไว้ใน `DATA_DIR` และรูปใน `server/uploads/` ไปไว้ใน `UPLOADS_DIR`
  (ถ้าไม่ใช้ Disk ก็เล่นได้ แต่ให้แก้คำถาม/ชุดเกมใน repo แล้ว deploy ใหม่แทน)
- **รัน instance เดียวเท่านั้น**: สถานะห้องอยู่ในหน่วยความจำ ถ้า scale หลาย instance ผู้เล่นจะกระจายไปคนละห้อง
- **แพ็กฟรีจะหลับ** เมื่อไม่มีคนใช้ ~15 นาที และใช้เวลาปลุกราว 1 นาที ให้เปิดหน้าเว็บปลุกไว้ก่อนเริ่มงาน
- WebSocket (WSS) ใช้ได้ปกติบน Render · Socket.io ใช้โดเมนและ path เดียวกับหน้าเว็บ

Railway / Fly.io ใช้ได้เหมือนกัน (รองรับ WebSocket + มี volume) ด้วย build/start command เดียวกัน

## ทดสอบ

```bash
npm run typecheck
npm run smoke -w server        # lobby + เกมเต็มรอบ + admin API (ต้องรัน server อยู่; ~30 วินาที)
npm run load -w server -- 100  # จำลองผู้เล่น 100 คนเล่นจนจบเกม (ใส่เลขอื่นได้)
```

`smoke-admin` เขียนทับชุดคำถามชั่วคราวแล้วคืนค่าเดิมให้เอง

Load test ใช้ `URL=https://...` ชี้ไปเซิร์ฟเวอร์ที่ deploy ได้ (ค่า latency จะรวมเครือข่ายจริง)
ผลบนเครื่องเดียวกัน: 200 คน × 5 ข้อ — ทุก event ถึงครบ, fan-out p95 ≈ 3 ms

## กติกาสำคัญของเกม

- Server ตัดสินทุกอย่าง (เวลา, ตรวจคำตอบ, คะแนน) · ไม่ส่งเฉลยก่อน reveal
- ส่งเวลาหมดเป็น `endsAt` + `serverNow` ให้ client ชดเชยนาฬิกา · ผู้เล่นตอบได้ครั้งเดียวต่อข้อ (ช้าได้ไม่เกิน 300 ms)
- คะแนน: ถูก 500 + โบนัสความเร็วสูงสุด 500 (ลดเชิงเส้น) + สตรีค +100 ต่อข้อติดกัน (สูงสุด +500)
- ผู้เล่นหลุดแล้วกลับมา (refresh/สัญญาณหาย) จะเข้าห้องเดิมต่อโดยอัตโนมัติ

## เพิ่มมินิเกมใหม่

1. Server: สร้าง `server/src/games/<ชื่อ>/index.ts` ที่ implement `GameModule`
   (`onStart`, `onQuestion`, `viewFor`, `onAnswer`, `scoreAnswer`, `onReveal`) แล้วลงทะเบียนใน `server/src/games/index.ts`
2. Client: สร้าง `client/src/games/<ชื่อ>/` ที่ export `{ PlayerView, HostView }` แล้วลงทะเบียนใน `client/src/games/index.ts`
3. ระบบ phase, timer, ตารางคะแนน, pause, reconnect ใช้ร่วมกันผ่าน `GameController` — โมดูลใหม่ไม่ต้องเขียนซ้ำ

## เสียงและการสั่น

เสียงทั้งหมดสังเคราะห์ด้วย Web Audio (ไม่มีไฟล์เสียง) ไม่มีปุ่มปิดเสียง (ปรับเสียงที่เครื่องแทน)
มือถือจะเริ่มเล่นเสียงได้หลังผู้เล่นแตะหน้าจอครั้งแรก · iPhone (iOS 16.4+) เล่นเสียงได้แม้เปิดโหมดเงียบ
การสั่น (`navigator.vibrate`) ใช้ได้บน Android; iOS Safari ไม่รองรับ
