# BaiHom Bakery — เวอร์ชันข้อมูลถาวร

เวอร์ชันนี้เปลี่ยนจากการเก็บออเดอร์ใน `orders.json` เป็น **PostgreSQL** เพื่อให้ข้อมูลออเดอร์ไม่หายเมื่อเซิร์ฟเวอร์ restart/deploy และเพิ่ม PWA สำหรับเปิดบนมือถือเหมือนแอป

## ต้องตั้งค่า
- `DATABASE_URL` = URL ของ PostgreSQL ที่สร้างจากผู้ให้บริการฐานข้อมูล
- `ADMIN_PASSWORD` = รหัสผ่านแอดมินที่ตั้งเอง
- `NODE_ENV=production`

## Deploy แบบง่าย
1. สร้าง Git repository จากโฟลเดอร์นี้
2. สร้าง Web Service บน Render/Railway/Fly.io หรือเซิร์ฟเวอร์ Node.js ที่รองรับ PostgreSQL
3. ตั้ง Build Command: `npm install`
4. ตั้ง Start Command: `npm start`
5. เพิ่ม Environment Variables ตามด้านบน
6. Deploy แล้วเปิด URL บนมือถือ
7. เปิด `/admin` สำหรับแอดมิน

## แจ้งเตือน
- ขณะหน้าแอดมินเปิดอยู่: แจ้งเตือน Real-time ผ่าน Socket.IO
- ถ้าต้องการแจ้งเตือนแม้ปิดเว็บ/ล็อกหน้าจอ: ต้องเพิ่ม Web Push/FCM และตั้งค่า VAPID หรือ Firebase ต่อใน production

## ความปลอดภัย
ก่อนเปิดให้ลูกค้าจริง ควรเปลี่ยน `ADMIN_PASSWORD` เป็นรหัสที่คาดเดายาก, เปิด HTTPS, และเพิ่มระบบชำระเงิน/ยืนยันคำสั่งซื้อหากต้องการรับเงินจริง
