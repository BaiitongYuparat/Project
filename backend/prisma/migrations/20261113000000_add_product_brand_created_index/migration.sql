-- แทนที่ index (brand_id) เดิมด้วย composite (brand_id, created_at)
-- เพื่อให้ list สินค้าของร้าน (filter brand_id + sort created_at desc) ใช้ index เดียวจบ
-- (composite scan ด้วย prefix brand_id ได้ จึงครอบคลุมการใช้งานเดิมทั้งหมด)

-- DropIndex
DROP INDEX "products_brand_id_idx";

-- CreateIndex
CREATE INDEX "products_brand_id_created_at_idx" ON "products"("brand_id", "created_at");
