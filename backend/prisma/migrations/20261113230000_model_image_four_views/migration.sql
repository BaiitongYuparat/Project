-- try_on_models: รองรับรูปโมเดล 4 มุม (หน้า / หลัง / ซ้าย / ขวา)
-- image_url เดิม = รูปด้านหน้า → rename เป็น image_front แล้วเพิ่มอีก 3 มุม (แต่ละมุมไม่บังคับ)
-- ตารางนี้ยังไม่มีข้อมูลจริงจึงเปลี่ยนแปลงได้ปลอดภัย

-- AlterTable
ALTER TABLE "try_on_models" RENAME COLUMN "image_url" TO "image_front";

ALTER TABLE "try_on_models"
  ADD COLUMN "image_back" TEXT,
  ADD COLUMN "image_left" TEXT,
  ADD COLUMN "image_right" TEXT;
