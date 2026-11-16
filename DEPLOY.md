# Deploy เกมขึ้น Render + ใส่โดเมนจาก Cloudflare

เกมนี้ deploy เป็น **Web Service ตัวเดียว** บน Render: หน้าเว็บ, API และ Socket.io (WebSocket) ออกจาก server ตัวเดียวกัน
ไม่ต้องแยก frontend/backend และ **ไม่ต้องสร้าง Static Site**

---

## ส่วนที่ 1: ขึ้นเกมบน Render

### 1. สร้าง Web Service

1. เข้า <https://dashboard.render.com> → **New +** → **Web Service**
2. เลือก **Git Provider → GitHub** → เลือก repo `jakkapan1789/it-party-game`
   (ถ้าไม่เห็น repo ให้กด *Configure GitHub* แล้วอนุญาตให้ Render เข้าถึง repo นี้)
3. กรอกค่าตามนี้

| ช่อง | ค่า |
|---|---|
| Name | `it-party-game` (จะได้ URL `https://it-party-game.onrender.com`) |
| Language / Runtime | **Node** |
| Branch | `main` |
| Region | **Singapore** (ใกล้ไทยที่สุด) |
| Root Directory | (เว้นว่าง) |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Instance Type | **Free** (ทดลอง) |

### 2. ตั้ง Environment Variables

| Key | Value | หมายเหตุ |
|---|---|---|
| `ADMIN_PIN` | PIN ของคุณ | **ห้ามใช้ 1234** (ค่าตัวอย่างใน repo) |
| `NODE_VERSION` | `22` | ให้ตรงกับเครื่องที่ทดสอบ |
| `PUBLIC_URL` | URL ของเกม | ใส่หลัง deploy ครั้งแรก (ดูข้อ 4) ใช้ทำ QR |
| `QUESTION_INTRO_MS` | `3000` | ไม่ใส่ก็ได้ (ค่าเริ่มต้น 3000; 0 = ปิดนับถอยหลัง 3-2-1) |

`PORT` ไม่ต้องใส่ Render ตั้งให้เอง

### 3. Deploy

กด **Deploy Web Service** แล้วดู log จนขึ้นว่า server เริ่มทำงาน (ครั้งแรกใช้เวลาหลายนาที)

### 4. ตั้ง PUBLIC_URL แล้วทดสอบ

1. copy URL ที่ได้ เช่น `https://it-party-game.onrender.com`
2. ไปที่ **Environment** → เพิ่ม `PUBLIC_URL` = URL นั้น → Save (Render จะ deploy ใหม่ให้)
3. เปิด `https://it-party-game.onrender.com/admin` → ใส่ PIN → สร้างห้อง
4. เอามือถือสแกน QR บนจอ ลองเข้าห้องและเล่นหนึ่งรอบ

### ข้อจำกัดของแพ็กฟรี

- **หลับเมื่อไม่มีคนใช้ ~15 นาที** ครั้งแรกหลังหลับจะเปิดช้าราว 1 นาที → ก่อนเริ่มงานให้เปิดหน้า `/admin` ปลุกไว้ก่อน
- **ข้อมูลไม่ถาวร**: คำถาม, ชุดเกม, รูปที่อัปโหลด และรายงานที่แก้ผ่านหน้าเว็บ **หายเมื่อ redeploy/restart**
  - วิธีง่าย: แก้ไฟล์ใน repo (`server/data/*.json`, รูปใน `server/uploads/`) แล้ว push → Render deploy ใหม่เอง
  - วิธีถาวร: อัปเป็นแพ็กเสียเงิน แล้วเพิ่ม **Disk** เช่น mount ที่ `/var/data` และตั้ง
    `DATA_DIR=/var/data/data`, `UPLOADS_DIR=/var/data/uploads`
    (ครั้งแรก copy `game1-questions.json`, `game2-questions.json`, `packages.json` และรูปใน `server/uploads/` ไปไว้ที่นั่น)
- 750 ชั่วโมงฟรีต่อเดือน (พอเปิดได้ทั้งเดือนสำหรับ 1 service)
- **ห้าม scale หลาย instance**: สถานะห้องอยู่ในหน่วยความจำของเครื่องเดียว
- วันงานจริงที่คนเล่นพร้อมกันเยอะ แนะนำอัปเป็นแพ็กเสียเงินชั่วคราว (ไม่หลับ, เสถียรกว่า)

### อัปเดตเกม

push ขึ้น branch `main` → Render build และ deploy ใหม่อัตโนมัติ (ดูได้ที่แท็บ **Events / Logs**)

---

## ส่วนที่ 2: ใส่โดเมนจาก Cloudflare

ตัวอย่างใช้ `party.example.com` (subdomain) — แนะนำแบบนี้ เพราะไม่ไปยุ่งกับเว็บหลักของโดเมน
ถ้าจะใช้โดเมนหลักเลย (`example.com`) ดูหัวข้อท้ายส่วนนี้

### 1. เพิ่มโดเมนใน Render

1. Render → service `it-party-game` → **Settings** → **Custom Domains** → **Add Custom Domain**
2. ใส่ `party.example.com` → Save
3. Render จะบอกให้สร้าง **CNAME** ชี้ไปที่ `it-party-game.onrender.com` (เปิดหน้านี้ค้างไว้)

### 2. เพิ่ม DNS record ใน Cloudflare

1. Cloudflare Dashboard → เลือกโดเมน → **DNS** → **Records** → **Add record**
2. กรอก

| ช่อง | ค่า |
|---|---|
| Type | **CNAME** |
| Name | `party` |
| Target | `it-party-game.onrender.com` |
| Proxy status | **DNS only** (เมฆสีเทา) ← สำคัญ |
| TTL | Auto |

3. Save
4. ถ้ามี record เดิมชื่อ `party` อยู่แล้ว (A / AAAA / CNAME) ให้ลบทิ้งก่อน
   โดยเฉพาะ **AAAA** (Render ยังไม่รองรับ IPv6)

> ต้องเป็น **DNS only** ก่อน เพื่อให้ Render ตรวจโดเมนและออกใบรับรอง HTTPS ได้
> ถ้าเปิดเมฆส้ม (Proxied) ตั้งแต่แรก การตรวจจะไม่ผ่าน

### 3. ยืนยันใน Render

1. กลับไปหน้า Custom Domains → กด **Verify**
2. รอจนสถานะเป็น **Verified** และใบรับรองเป็น **Certificate Issued** (ปกติไม่กี่นาที อาจนานถึงชั่วโมงถ้า DNS ยังไม่กระจาย)
3. เปิด `https://party.example.com/admin` ทดสอบ

### 4. เปลี่ยน PUBLIC_URL

Render → **Environment** → แก้ `PUBLIC_URL` = `https://party.example.com` → Save
(ไม่งั้น QR บนหน้า Host จะยังชี้ไปที่ `onrender.com`)

### 5. (ไม่บังคับ) เปิด Cloudflare Proxy

ใช้ **DNS only** ต่อไปได้เลย ทำงานได้ครบ ถ้าอยากให้ผ่าน Cloudflare (เมฆส้ม):

1. รอให้ Render ขึ้น Certificate Issued ก่อน
2. Cloudflare → **SSL/TLS** → **Overview** → ตั้งโหมดเป็น **Full** (หรือ Full (strict))
   ห้ามเป็น *Flexible* (จะวนลูป redirect)
3. Cloudflare → **Network** → เปิด **WebSockets** (ปกติเปิดอยู่แล้ว) — เกมต้องใช้
4. เปลี่ยน record `party` เป็น **Proxied**

ถ้าเปิดแล้วเกมเชื่อมต่อไม่ได้/หลุดบ่อย ให้กลับไปเป็น DNS only

### ใช้โดเมนหลัก (example.com) แทน subdomain

- Render: เพิ่ม `example.com` (Render จะเพิ่ม `www.example.com` ให้ด้วย)
- Cloudflare: เพิ่ม CNAME 2 ตัว (Cloudflare ใช้ CNAME ที่ root ได้ด้วย CNAME flattening)
  - Name `@` → Target `it-party-game.onrender.com` → DNS only
  - Name `www` → Target `it-party-game.onrender.com` → DNS only
- ลบ A / AAAA เดิมของ `@` และ `www` ก่อน (ถ้ามีเว็บอื่นใช้อยู่ เว็บนั้นจะหาย — ใช้ subdomain ปลอดภัยกว่า)
- แพ็กฟรีใส่โดเมนได้ 2 โดเมน เกินคิดเพิ่มโดเมนละ $0.25/เดือน (ตรวจราคาล่าสุดในหน้า Render อีกที)

### แก้ปัญหา

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| Render verify ไม่ผ่าน | record ยังเป็นเมฆส้ม → เปลี่ยนเป็น DNS only / ชื่อ record ผิด / DNS ยังไม่กระจาย รอสักพักแล้ว Verify ใหม่ |
| เข้าเว็บแล้ว Too many redirects | Cloudflare SSL/TLS เป็น Flexible → เปลี่ยนเป็น Full |
| เว็บขึ้นแต่เล่นเกมไม่ได้ / เชื่อมต่อไม่ได้ | WebSockets ใน Cloudflare ปิดอยู่ หรือลองกลับเป็น DNS only |
| QR ยังพาไป onrender.com | ยังไม่ได้เปลี่ยน `PUBLIC_URL` |
| เปิดครั้งแรกช้ามาก | แพ็กฟรีหลับอยู่ รอ ~1 นาที |

อ้างอิง: [Render — Configuring Cloudflare DNS](https://render.com/docs/configure-cloudflare-dns) ·
[Render — Custom Domains](https://render.com/docs/custom-domains) · [Render — Deploy for Free](https://render.com/docs/free)
