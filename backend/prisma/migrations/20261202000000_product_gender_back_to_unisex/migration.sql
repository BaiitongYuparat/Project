-- สินค้ากลับมาใช้ enum ProductGender (UNISEX / MALE / FEMALE) ตามโค้ด product
-- (migration 20261201000000 เคยเปลี่ยนคอลัมน์ products.gender ไปใช้ enum Gender ของ user)
-- รองรับทั้งกรณีที่คอลัมน์ยังเป็น Gender หรือเป็น ProductGender อยู่แล้ว

DO $$
DECLARE
  col_type text;
BEGIN
  SELECT udt_name INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'gender';

  IF col_type = 'gender' THEN
    ALTER TABLE "products" ALTER COLUMN "gender" DROP DEFAULT;
    ALTER TABLE "products" ALTER COLUMN "gender" TYPE "ProductGender" USING (
      CASE WHEN "gender"::text = 'UNISEX' THEN 'UNISEX'
           ELSE COALESCE("gender"::text, 'UNISEX') END
    )::"ProductGender";
  END IF;
END $$;

-- สินค้าเก่าที่ไม่ระบุเพศ → UNISEX (ค่า default ของสินค้า)
UPDATE "products" SET "gender" = 'UNISEX' WHERE "gender" IS NULL;

ALTER TABLE "products" ALTER COLUMN "gender" SET DEFAULT 'UNISEX';
ALTER TABLE "products" ALTER COLUMN "gender" SET NOT NULL;
