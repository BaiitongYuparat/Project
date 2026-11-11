-- Size chart กลางของร้าน (Option C):
-- 1) BrandSizeChart (collection) + Entry ต่อ category + Row ต่อ entry
-- 2) Product.size_chart_id อ้างอิงตารางกลาง (null = ใช้ ProductSizeChart เฉพาะตัว)

BEGIN;

-- 1. ตารางไซส์กลางของร้าน
CREATE TABLE "brand_size_charts" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "ProductGender" NOT NULL DEFAULT 'UNISEX',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "brand_size_charts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brand_size_charts_brand_id_name_key" ON "brand_size_charts"("brand_id", "name");
CREATE INDEX "brand_size_charts_brand_id_idx" ON "brand_size_charts"("brand_id");

ALTER TABLE "brand_size_charts" ADD CONSTRAINT "brand_size_charts_brand_id_fkey"
    FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE "brand_size_chart_entries" (
    "id" TEXT NOT NULL,
    "chart_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "brand_size_chart_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brand_size_chart_entries_chart_id_category_key" ON "brand_size_chart_entries"("chart_id", "category");

ALTER TABLE "brand_size_chart_entries" ADD CONSTRAINT "brand_size_chart_entries_chart_id_fkey"
    FOREIGN KEY ("chart_id") REFERENCES "brand_size_charts"("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE "brand_size_chart_entry_rows" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "chest" DECIMAL(5,2),
    "waist" DECIMAL(5,2),
    "hips" DECIMAL(5,2),
    "length" DECIMAL(5,2),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "brand_size_chart_entry_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brand_size_chart_entry_rows_entry_id_size_key" ON "brand_size_chart_entry_rows"("entry_id", "size");
CREATE INDEX "brand_size_chart_entry_rows_entry_id_sort_order_idx" ON "brand_size_chart_entry_rows"("entry_id", "sort_order");

ALTER TABLE "brand_size_chart_entry_rows" ADD CONSTRAINT "brand_size_chart_entry_rows_entry_id_fkey"
    FOREIGN KEY ("entry_id") REFERENCES "brand_size_chart_entries"("id") ON UPDATE CASCADE ON DELETE CASCADE;

-- 2. Product อ้างอิงตารางกลาง (SetNull เมื่อลบตาราง — สินค้าเปลี่ยนเป็นตารางเฉพาะตัวที่มีอยู่)
ALTER TABLE "products" ADD COLUMN "size_chart_id" TEXT;

CREATE INDEX "products_size_chart_id_idx" ON "products"("size_chart_id");

ALTER TABLE "products" ADD CONSTRAINT "products_size_chart_id_fkey"
    FOREIGN KEY ("size_chart_id") REFERENCES "brand_size_charts"("id") ON UPDATE CASCADE ON DELETE SET NULL;

COMMIT;
