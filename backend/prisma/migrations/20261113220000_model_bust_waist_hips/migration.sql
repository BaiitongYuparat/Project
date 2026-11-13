-- try_on_models: เปลี่ยนจาก body_type (ข้อความ) เป็นซัดส่วน bust / waist / hips (หน่วย ซม.)
-- ตารางนี้ยังไม่มีข้อมูลจริง (ฟีเจอร์ Model Management ยัง list-only) จึงลบ column เดิมได้ปลอดภัย

-- DropIndex
DROP INDEX IF EXISTS "try_on_models_body_type_idx";

-- AlterTable
ALTER TABLE "try_on_models" DROP COLUMN IF EXISTS "body_type";

ALTER TABLE "try_on_models"
  ADD COLUMN "bust" DECIMAL(5, 2),
  ADD COLUMN "waist" DECIMAL(5, 2),
  ADD COLUMN "hips" DECIMAL(5, 2);
