# คู่มือการเชื่อมต่อระบบโพสผ่าน Make.com (Chronicle AI Integration Guide)

คู่มือนี้จะช่วยคุณเชื่อมต่อระบบดึงข่าวและจัดร่างข่าวสารจาก Chronicle AI ส่งต่อไปยังเพจ Facebook, Instagram, Twitter หรือกลุ่ม LINE/Discord ของคุณโดยอัตโนมัติผ่าน Make.com ฟรี

---

## 🛠️ ขั้นตอนที่ 1: สร้าง Webhook บน Make.com

1. ไปที่เว็บไซต์ **[Make.com](https://www.make.com/)** และสมัครสมาชิกฟรี (Free Plan)
2. คลิกปุ่ม **"Create a new scenario"** ที่มุมขวาบน
3. คลิกปุ่ม **"+"** สีม่วงตรงกลางจอ ค้นหาคำว่า **"Webhooks"** 
4. เลือกโมเดลย่อยเป็น **"Custom Webhook"**
5. คลิกปุ่ม **"Add"** เพื่อสร้าง Webhook ตัวใหม่:
   * ตั้งชื่อตามสะดวก เช่น `Chronicle AI News Webhook`
   * คลิก **Save**
6. Make.com จะสร้างลิงก์ URL ขึ้นมา (เช่น `https://hook.us1.make.com/xxxxxxxxx`) ให้กดปุ่ม **"Copy address to clipboard"**

*สำคัญ: ปล่อยหน้าจอนั้นของ Make.com ไว้ก่อน (ระบบจะขึ้นสถานะ "Waiting for data" เพื่อรอข้อความทดสอบจากเว็บ)*

---

## ⚙️ ขั้นตอนที่ 2: นำ Webhook มาใส่ใน Chronicle AI

1. เปิดแอปพลิเคชัน Chronicle AI เข้าไปที่เมนู **"ตั้งค่าระบบ (Settings)"**
2. ไปที่แท็บ **"เชื่อมต่อโซเชียล" (Socials Connection)**
3. เลื่อนลงมาที่หัวข้อ **"Make.com Webhook"**
4. คลิกสลับปุ่มทางขวาให้เป็น **"เปิดใช้งานอยู่"**
5. วางลิงก์ Webhook URL ที่ก๊อปปี้มาลงในช่องข้อความ
6. กดปุ่ม **"บันทึกการตั้งค่า" (Save)** ด้านล่าง

---

## 🧪 ขั้นตอนที่ 3: ส่งข้อมูลทดสอบ (Trigger Test Payload)

1. เข้าไปยังเมนู **"ห้องร่างบทความ (Drafts)"** บน Chronicle AI
2. เลือกบทร่างข่าวที่คุณต้องการทดสอบสัก 1 ข่าว
3. ติ๊กเครื่องหมายถูกหน้ากล่อง **"Make.com Webhook"** ด้านล่างพรีวิว
4. กดปุ่ม **"โพสเนื้อหาลงช่องทางโซเชียลมีเดีย" (Publish)** 
5. ระบบจะส่งข้อมูลรายละเอียดข่าวสาร (รวมถึงลิงก์รูปภาพประกอบที่เขียนพาดหัวข่าวเสร็จแล้ว) ไปที่ Make.com
6. หน้าจอ Make.com จะเปลี่ยนสถานะจาก "Waiting for data" เป็น **"Successfully determined"** (แปลว่าเชื่อมต่อกันสำเร็จแล้ว!)

---

## 📣 ขั้นตอนที่ 4: เชื่อมต่อไปยังช่องทางปลายทาง (Facebook / LINE / Discord)

ในหน้า Scenario ของ Make.com คุณสามารถลากเส้นเชื่อมต่อจากโมเดล Webhooks ไปยังช่องทางต่างๆ ที่คุณต้องการได้ทันที:

### 1. โพสลง Facebook Page
* กดต่อพ่วงโมเดลเพิ่ม (Add another module) ค้นหา **"Facebook Pages"** -> เลือก **"Create a Page Post (with photo)"**
* เชื่อมโยงบัญชี Facebook ของคุณ และเลือกเพจที่ต้องการโพส
* ในช่อง **Photo**: ติ๊กเลือกดึงค่า `draft` -> `imageUrl` จาก Webhook (รูปนี้จะมีข้อความพาดหัวเรียบร้อยแล้ว)
* ในช่อง **Message**: เลือกใส่ `draft` -> `title` และ `draft` -> `content`

### 2. ส่งเข้ากลุ่ม LINE (LINE Notify)
* กดต่อพ่วงโมเดลเพิ่ม ค้นหา **"LINE"** -> เลือก **"Send a Notification"**
* เชื่อมต่อบัญชีกลุ่ม LINE ของคุณ
* ในช่อง **Message**: ใส่หัวข้อข่าวและเนื้อหาข่าว
* ในช่อง **Image File**: เลือกดึงลิงก์จาก `draft` -> `imageUrl`

### 3. ส่งเข้า Discord / Telegram
* ค้นหา **"Discord"** -> เลือก **"Send a Message (with attachment)"** หรือ **"Telegram"** -> **"Send a Photo"** แล้วแมปฟิลด์เหมือนขั้นตอนด้านบน

---

## ⚠️ ข้อควรจำสำหรับโหมดใช้งานจริง (Production Deploy)
เพื่อความเสถียรในการทำงานบน Vercel:
* ในหน้า **ตั้งค่า (Settings)** แท็บ **โหมดการทำงาน (System)**: ให้มั่นใจว่าได้เลือก **"โหมดใช้งานจริง (Production API Mode)"**
* หรือใน Vercel Dashboard -> Environment Variables ให้ตั้งค่า `APP_MODE` เป็น `production` เพื่อเปิดระบบเรียกใช้งาน API ส่งโพสตัวจริงไปยัง Webhook แทนโหมดจำลองจำกัดสิทธิ์
