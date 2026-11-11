-- Align products.gender with the shared Gender enum (MALE / FEMALE).
-- The column previously used a ProductGender enum that still had UNSISEX.

-- 1. Allow NULL so legacy unisex products don't get a wrong gender
ALTER TABLE "products" ALTER COLUMN "gender" DROP DEFAULT;
ALTER TABLE "products" ALTER COLUMN "gender" DROP NOT NULL;

-- 2. Null out legacy unisex products (they show under "ทั้งหมด" until edited)
UPDATE "products" SET "gender" = NULL WHERE "gender" = 'UNISEX';

-- 3. Switch the column to the shared Gender type
ALTER TABLE "products" ALTER COLUMN "gender" TYPE "Gender" USING ("gender"::text::"Gender");

-- 4. Keep the ProductGender type (still used by size_chart_templates
--    and brand_size_charts, which are not managed by Prisma).

-- 5. Index for storefront gender filtering
CREATE INDEX "products_gender_idx" ON "products"("gender");
