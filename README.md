# anime / calendar

เว็บตารางฉายอนิเมะแบบเบา ๆ สำหรับดูตั้งแต่วันนี้ไปอีก 6 วัน และอนิเมะที่จะเริ่มฉายในซีซั่นถัดไป แสดงเวลาไทย (`Asia/Bangkok`) ไม่มีหน้าดูย้อนหลัง

ใช้ **Bun 1.4.4+, HTML/CSS/JavaScript และ SQLite** ไม่มี runtime dependencies ไม่มี frontend framework ไม่มี build step และไม่ต้องใช้ API key

## เริ่มใช้งาน

```sh
bun run start
```

เปิด http://127.0.0.1:3000

ไม่ต้องรัน `bun install` เพราะไม่มี dependencies ภายนอก ใช้ `bun:sqlite` ที่มากับ Bun และเปิดฐานข้อมูลเดิมได้ทันที โค้ดยังรันด้วย Node.js 24+ ผ่าน `node src/server.js` ได้ โดยเลือกใช้ `node:sqlite` อัตโนมัติ

- `/` หรือ `/calendar` — ตารางฉายเรียงวัน เริ่มจากวันนี้ กดวันเพื่อเลื่อนไปยังวันนั้น
- `/upcoming` — รายชื่ออนิเมะญี่ปุ่นซีซั่นถัดไปที่ยังไม่เริ่มฉาย
- ค้นหาชื่อโรมาจิ อังกฤษ ญี่ปุ่น หรือชื่ออื่น ๆ ที่ AniList มีให้ได้ทันที
- กรองประเภท TV, TV SHORT, MOVIE, ONA, OVA, SPECIAL และเฉพาะตอนที่ยังไม่ฉาย
- สถานะกำลังฉายสีเขียว, ฉายแล้วสีส้ม, กำลังจะฉายสีเทา พร้อม glow สำหรับรายการกำลังฉายและเรื่องถัดไป
- กำลังฉายประเมินจากเวลาเริ่มและความยาวตอน ถ้าไม่มีความยาวจะแสดง “เริ่มฉายแล้ว”
- ธีมซากุระ/ท้องฟ้า/ต้นไม้/ลำธาร พร้อมพื้นหลังที่สร้างด้วย Codex CLI และบีบอัดเป็น WebP ประมาณ 58 KB
- แสดงไอคอนสีของแพลตฟอร์มรับชมแบบไม่มีกรอบ กดเพื่อเปิดลิงก์ในแท็บใหม่
- กดปกหรือชื่อเพื่อดูเรื่องย่อ สตูดิโอ ช่องทางรับชม และหมายเหตุ SUB/DUB เฉพาะที่ต้นทางระบุ; ปิดด้วย Escape หรือปุ่มปิด
- ปุ่ม `/` บนคีย์บอร์ดเพื่อเข้า search
- รองรับมือถือ และยังอ่านตาราง/ค้นหาผ่านฟอร์มได้แม้ปิด JavaScript

สำหรับพัฒนาแบบ reload server เมื่อแก้ไฟล์:

```sh
bun run dev
```

รีเฟรชข้อมูลด้วยตนเอง:

```sh
bun run sync
```

ตรวจสอบ:

```sh
bun run check
bun test
```

## แหล่งข้อมูลและการแคช

ใช้ [AniList GraphQL API](https://docs.anilist.co/guide/graphql/):

- ตารางใช้ `Page.airingSchedules` โดยจำกัดช่วงตั้งแต่เที่ยงคืนวันนี้ในไทยถึงก่อนเที่ยงคืนวันที่ 8 ดึงครบทุกหน้าและเรียงตามเวลาฉาย
- Upcoming ใช้ `season`, `seasonYear` และ `status: NOT_YET_RELEASED`; Q4 จะเปลี่ยนไป WINTER ของปีถัดไปอัตโนมัติ
- แสดงเฉพาะ anime ประเทศญี่ปุ่น และกรอง `isAdult` ออก
- เวลาเป็น **เวลาฉายต้นฉบับที่แปลงเป็นเวลาไทย** ไม่ใช่เวลาลงซับไทย/พากย์ไทยของแต่ละแพลตฟอร์ม
- ชื่อ เรื่องย่อ และช่องทางรับชมมาจาก AniList โดยตรง ยังไม่มีฐานชื่อไทยหรือข้อมูลยืนยันสิทธิ์สตรีมมิงไทย
- ช่องทางรับชมใช้เฉพาะ `externalLinks.type = STREAMING` ที่ไม่ถูกปิดใช้งาน; ไม่แสดงโซเชียลหรือเว็บข้อมูลเป็นช่องรับชม
- รายละเอียดเก็บหมายเหตุของต้นทางครบ รวมถึง SUB/DUB หากมี ไม่อนุมานซับหรือพากย์จากฟิลด์ภาษา
- ใช้รูปทรงไอคอนและสีแบรนด์ตาม AniList โดยเก็บไอคอนที่รองรับไว้ใน `public/platform-icons/` เพื่อโหลดจากเซิร์ฟเวอร์เดียวกัน ไม่มีกรอบหรือพื้นหลังรอบโลโก้ แหล่งที่มาบันทึกใน `public/platform-icons/SOURCES.md`
- ถ้าระบุเพียงเดือนจะแสดงเดือนพร้อม “รอยืนยันวัน”; ไม่สร้างวันฉายขึ้นเอง

SQLite อยู่ที่ `data/anime.sqlite` เปิดโหมด WAL ตาราง `snapshots` เก็บเพียงแคชล่าสุดของ `calendar` และ `upcoming` อย่างละหนึ่งแถว ไม่สะสมประวัติ

หน้าเว็บและ `/api/*` อ่าน **SQLite ของเราเท่านั้น** ไม่สั่ง sync และไม่เรียก AniList ตามจำนวนผู้เข้าชม เบราว์เซอร์ตรวจข้อมูลใหม่จาก API ของเราเองทุกนาที

Scheduler ในโปรเซสเว็บ ตรวจทุกนาที และดึงทั้งตารางกับ upcoming **วันละหนึ่งรอบ ตามวันไทย (`Asia/Bangkok`)** รอบวันใหม่เริ่มภายในประมาณหนึ่งนาทีหลัง 00:00 น. แต่ละรอบอาจมีหลายคำขอเพราะต้องดึงข้อมูลให้ครบทุกหน้า ใช้วันที่ใน `updated_at` ของ SQLite ตรวจว่าดึงวันนี้สำเร็จหรือยัง จึงไม่ดึงซ้ำเมื่อ restart ในวันเดียวกัน ไม่ต้องติดตั้ง cron library หรือรัน container สำหรับ scheduler เพิ่ม

เมื่อเปิดเซิร์ฟเวอร์จะ sync ทันทีเฉพาะข้อมูลที่ยังไม่มีหรือยังไม่ได้อัปเดตวันนี้ ถ้าเซิร์ฟเวอร์ปิดตอนเที่ยงคืนจะตามเก็บเมื่อเริ่มทำงานอีกครั้ง หาก sync ล้มเหลวจะเก็บข้อมูลเดิมและลองใหม่ตาม backoff/`Retry-After` จนสำเร็จ (กรณีนี้อาจพยายามมากกว่าหนึ่งรอบต่อวัน) ส่วน `bun run sync` เป็นคำสั่งบังคับดึงใหม่ได้ทุกเมื่อ

เมื่อเพิ่งรันครั้งแรกและยังไม่มีแคช หน้าเว็บจะแสดงสถานะกำลังดึงข้อมูลและรีเฟรชเอง เมื่อ API ล่มจะใช้ข้อมูลที่แคชไว้ พร้อมแจ้งว่าอาจไม่ล่าสุด ข้อมูลวันเก่าและ upcoming ซีซั่นเก่าจะไม่แสดง ดึงทุกหน้าสำเร็จก่อนแทนที่แคช จึงไม่ทับข้อมูลเดิมด้วยข้อมูลที่ได้มาไม่ครบ

เว้นคำขอ API อย่างน้อย 2.2 วินาที รวมงาน sync ที่ซ้อนกันไว้เป็นงานเดียว และทำตาม `Retry-After` เมื่อถูกจำกัดคำขอ ภาพปกโหลดตรงจาก AniList CDN พร้อม lazy loading ส่วน UI แสดงจาก HTML ฝั่งเซิร์ฟเวอร์และส่ง gzip ได้

API อาจเปลี่ยนกำหนดการได้ ดู [AiringSchedule](https://docs.anilist.co/reference/object/airingschedule), [rate limits](https://docs.anilist.co/guide/rate-limiting) และ [เงื่อนไขการใช้งาน](https://docs.anilist.co/guide/terms-of-use) ก่อนนำไปเปิดบริการเชิงพาณิชย์

## ตั้งค่า

ใช้ environment variables โดยไม่ต้องมี `.env`:

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
| --- | --- | --- |
| `PORT` | `3000` | พอร์ตเว็บ |
| `HOST` | `127.0.0.1` | ที่อยู่สำหรับรับการเชื่อมต่อ |
| `DATABASE_PATH` | `data/anime.sqlite` | ไฟล์ SQLite |

ตัวอย่าง:

```sh
PORT=4000 DATABASE_PATH=/path/to/anime.sqlite bun run start
```

ใช้งานจริงบนเซิร์ฟเวอร์ Bun ที่มีพื้นที่เก็บข้อมูลถาวรได้ โดย mount โฟลเดอร์ SQLite และใช้ process manager ที่มีอยู่ให้โปรเซสทำงานต่อเนื่อง โปรเจกต์นี้ยังไม่ได้ deploy ไป hosting

## Docker

```sh
docker compose up -d --build
```

เปิด http://localhost:3000 หรือเปลี่ยนพอร์ตด้วย `PORT=4000 docker compose up -d --build`

Image ใช้ `oven/bun:1.4.4-alpine` คัดลอกเฉพาะ `src/`, `public/` และ `package.json` ไม่มี `bun install`, `npm install`, `node_modules` หรือ build step เพราะใช้ API ที่มีใน runtime ทั้ง HTTP, fetch และ SQLite ขนาดแอปส่วน `src/` กับ `public/` รวมราว 230 KB ณ ตอนเขียนเอกสาร พื้นที่หลักของ image จึงเป็น Bun runtime และระบบฐาน ไม่รวมไฟล์ออกแบบ ทดสอบ หรือฐานข้อมูลจากเครื่องพัฒนา พื้นที่ Docker บน host ยังรวม image เก่าและ build cache ได้

SQLite เก็บใน named volume `anime-data` ที่ mount `/app/data` ทั้งโฟลเดอร์เพื่อรองรับไฟล์ WAL/SHM ข้อมูลอยู่ต่อเมื่อสร้าง container ใหม่หรือใช้ `docker compose down` แต่ `docker compose down -v` จะลบ volume และข้อมูลด้วย ใช้เว็บหนึ่ง instance กับฐานข้อมูลนี้เพื่อให้มี scheduler ตัวเดียว

สั่ง sync เองและดู log:

```sh
docker compose exec anime-calendar bun src/sync.js
docker compose logs -f anime-calendar
```

## HTTP endpoints

- `GET /api/calendar` — ตารางวันนี้ถึงอีก 6 วัน พร้อม `updatedAt`, `stale`, `syncing`, `timezone`
- `GET /api/upcoming` — ซีซั่นถัดไป พร้อม metadata เช่นเดียวกัน
- `GET /health` — process health (ไม่ได้ยืนยันว่า upstream พร้อมใช้งาน)

ถ้ายังไม่มีแคช API คืน `503` พร้อม `Retry-After` และข้อมูลสถานะ ไม่ใช้ข้อมูลจำลอง ไม่มี endpoint สั่ง sync จากภายนอก

## โครงสร้าง

```text
src/
  server.js   HTTP routes, compression, security headers, scheduler
  anilist.js  GraphQL, pagination, rate limiting, refresh coordination
  cache.js    SQLite snapshot storage
  freshness.js Daily refresh policy shared by scheduler and API status
  time.js     Bangkok day boundaries and season calculation
  render.js   Server-rendered HTML and safe text/URL handling
  sync.js     Manual refresh command
public/
  app.js      Instant search, filters, native detail dialog, update checks
  airing.js   Shared episode states and next-airing selection
  sakura-background.webp  Lightweight generated landscape
  style.css   Responsive dark interface
  favicon.svg
 test/core.test.js  Date boundaries, caching, pagination, escaping, no history
 design/           Visual concept, tokens, and comparison notes
```
