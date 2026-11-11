-- เพิ่มคอลัมน์สำหรับเก็บเวลาที่ตรวจคุณภาพรูปล่าสุด (ใช้ทำ cooldown ของ recheck)
ALTER TABLE "product_images"
  ADD COLUMN "last_checked_at" TIMESTAMP(6);
