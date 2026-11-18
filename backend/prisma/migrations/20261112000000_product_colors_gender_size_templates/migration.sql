-- Product Management v2:
-- 1) Product เพิ่ม gender / fabric / seasons / occasions
-- 2) ProductColor (1 product หลายสี) + ProductImage.color_id (nullable — รูปเดิม = ไม่ระบุสี)
-- 3) SizeChartTemplate + SizeChartTemplateRow (ตารางไซส์ standard ของแพลตฟอร์ม)
-- 4) ProductOption (ฤดู/โอกาส — super admin แก้ค่าได้, ยังไม่มีหน้า UI)

BEGIN;

-- 1. enums
CREATE TYPE "ProductGender" AS ENUM ('UNISEX', 'MALE', 'FEMALE');
CREATE TYPE "ProductOptionType" AS ENUM ('SEASON', 'OCCASION');

-- 2. product columns
ALTER TABLE "products"
  ADD COLUMN "gender" "ProductGender" NOT NULL DEFAULT 'UNISEX',
  ADD COLUMN "fabric" TEXT,
  ADD COLUMN "seasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "occasions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 3. product_colors
CREATE TABLE "product_colors" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_colors_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_colors_product_id_idx" ON "product_colors"("product_id");

ALTER TABLE "product_colors" ADD CONSTRAINT "product_colors_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON UPDATE CASCADE ON DELETE CASCADE;

-- 4. product_images: เชื่อมกับสี (null = รูปเดิมก่อนมีระบบสี)
ALTER TABLE "product_images" ADD COLUMN "color_id" TEXT;

CREATE INDEX "product_images_color_id_idx" ON "product_images"("color_id");

ALTER TABLE "product_images" ADD CONSTRAINT "product_images_color_id_fkey"
    FOREIGN KEY ("color_id") REFERENCES "product_colors"("id") ON UPDATE CASCADE ON DELETE CASCADE;

-- 5. ตารางไซส์ standard
CREATE TABLE "size_chart_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "ProductGender" NOT NULL DEFAULT 'UNISEX',
    "category" TEXT,

    CONSTRAINT "size_chart_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "size_chart_templates_gender_category_idx" ON "size_chart_templates"("gender", "category");

CREATE TABLE "size_chart_template_rows" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "chest" DECIMAL(5,2),
    "waist" DECIMAL(5,2),
    "hips" DECIMAL(5,2),
    "length" DECIMAL(5,2),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "size_chart_template_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "size_chart_template_rows_template_id_size_key" ON "size_chart_template_rows"("template_id", "size");
CREATE INDEX "size_chart_template_rows_template_id_sort_order_idx" ON "size_chart_template_rows"("template_id", "sort_order");

ALTER TABLE "size_chart_template_rows" ADD CONSTRAINT "size_chart_template_rows_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "size_chart_templates"("id") ON UPDATE CASCADE ON DELETE CASCADE;

-- 6. ชุดตัวเลือกฤดู/โอกาส
CREATE TABLE "product_options" (
    "id" TEXT NOT NULL,
    "type" "ProductOptionType" NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_options_type_label_key" ON "product_options"("type", "label");

COMMIT;
